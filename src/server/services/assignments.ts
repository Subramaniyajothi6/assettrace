import "server-only";
import { prisma, type Tx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { assertAssignable, assertTransition } from "../lifecycle";
import { createNotification, managersOf, userIdOfEmployee } from "../notify";
import { assertCan, requireUser } from "../permissions";
import { uploadPngDataUrl } from "../storage";
import { assignSchema, confirmHandoverSchema, disputeSchema } from "@/lib/validation/assignments";
import { STATUS_LABELS } from "@/lib/labels";

/** Lock the asset row for the rest of the transaction (serialises concurrent assigns). */
export async function lockAsset(tx: Tx, assetId: string) {
  await tx.$queryRaw`SELECT id FROM "Asset" WHERE id = ${assetId} FOR UPDATE`;
  const asset = await tx.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new NotFoundError("Asset");
  return asset;
}

/** Manager assigns an Available/Reserved asset to an employee (ARCHITECTURE.md §5). */
export async function assignAsset(input: unknown) {
  const user = await requireUser();
  assertCan(user, "asset:assign");
  const data = assignSchema.parse(input);

  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId }, include: { user: { select: { id: true } } } });
  if (!employee || !employee.isActive) throw new AppError("Choose an active employee.", { employeeId: "Choose an active employee" });
  if (user.role === "MANAGER" && !user.managedDepartmentIds.includes(employee.departmentId)) {
    throw new ForbiddenError("You can only assign to employees in your departments.");
  }

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, data.assetId);
    assertCan(user, "asset:assign", { departmentId: asset.departmentId });
    assertAssignable(asset.status);
    const active = await tx.assignment.findFirst({ where: { assetId: asset.id, isActive: true }, select: { id: true } });
    if (active) throw new AppError("This asset already has an active assignment.");
    assertTransition(asset.status, "ASSIGNED");

    const assignment = await tx.assignment.create({
      data: {
        assetId: asset.id,
        employeeId: employee.id,
        departmentId: employee.departmentId,
        locationId: data.locationId,
        assignedById: user.id,
        assignedAt: data.assignedAt,
        expectedReturnDate: data.expectedReturnDate,
        conditionAtAssignment: data.condition,
        accessories: data.accessories,
        remarks: data.remarks,
        handoverStatus: "PENDING",
        handoverDate: data.assignedAt,
      },
    });
    await tx.asset.update({
      where: { id: asset.id },
      data: {
        status: "ASSIGNED",
        currentHolderId: employee.id,
        locationId: data.locationId,
        departmentId: employee.departmentId,
        condition: data.condition,
      },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "ASSIGNED",
      fromStatus: asset.status,
      toStatus: "ASSIGNED",
      description: `${STATUS_LABELS[asset.status]} → Assigned · ${employee.name}`,
      metadata: { assignmentId: assignment.id, employeeId: employee.id, accessories: data.accessories },
    });
    await createNotification(tx, {
      userIds: [employee.user?.id],
      type: "ASSET_ASSIGNED",
      title: `${asset.name} assigned to you`,
      message: "Please confirm and sign the handover",
      link: `/my-assets/handover/${assignment.id}`,
    });
    // An open "new asset" request from this employee is now fulfilled.
    const open = await tx.employeeRequest.findMany({
      where: { employeeId: employee.id, type: "NEW_ASSET", status: { in: ["PENDING", "IN_PROGRESS", "APPROVED"] } },
      select: { id: true },
    });
    for (const r of open) {
      await tx.employeeRequest.update({
        where: { id: r.id },
        data: {
          status: "COMPLETED",
          assetId: asset.id,
          handledById: user.id,
          resolvedAt: new Date(),
          managerRemarks: `Assigned ${asset.name} (${asset.assetTag}). Please sign the handover.`,
        },
      });
    }
    return { assignment, asset, employee };
  });
}

/** Nudge an employee who hasn't signed yet. */
export async function remindHandover(assignmentId: string) {
  const user = await requireUser();
  const g = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { asset: true, employee: { select: { name: true, userId: true } } } });
  if (!g) throw new NotFoundError("Assignment");
  assertCan(user, "asset:assign", { departmentId: g.asset.departmentId });
  if (!g.isActive || g.handoverStatus !== "PENDING") throw new AppError("This handover isn't waiting for a signature.");
  if (!g.employee.userId) throw new AppError(`${g.employee.name} has no login to notify.`);
  await prisma.notification.create({
    data: {
      userId: g.employee.userId,
      type: "ASSET_ASSIGNED",
      title: `Reminder: sign for ${g.asset.name}`,
      message: "Please confirm the handover",
      link: `/my-assets/handover/${g.id}`,
    },
  });
  return { name: g.employee.name };
}

/** The holder's own pending handover, or an error. */
async function ownPendingAssignment(assignmentId: string) {
  const user = await requireUser();
  assertCan(user, "handover:confirm");
  const g = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { asset: true, employee: { select: { name: true } } } });
  if (!g) throw new NotFoundError("Assignment");
  if (!user.employeeId || g.employeeId !== user.employeeId) throw new ForbiddenError("Only the person receiving the asset can confirm it.");
  if (!g.isActive || g.handoverStatus !== "PENDING") throw new AppError("This handover was already completed.");
  return { user, g };
}

/** Employee signs the digital handover. Completes a pending transfer if this assignment came from one. */
export async function confirmHandover(assignmentId: string, input: unknown) {
  const { user, g } = await ownPendingAssignment(assignmentId);
  const data = confirmHandoverSchema.parse(input);
  const signaturePath = await uploadPngDataUrl(data.signature, "signatures");

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.assignment.update({
      where: { id: g.id },
      data: { handoverStatus: "CONFIRMED", handoverConfirmedAt: now, handoverSignaturePath: signaturePath },
    });
    await recordHistory(tx, {
      assetId: g.assetId,
      actorId: user.id,
      event: "HANDOVER_CONFIRMED",
      description: `Handover signed · ${g.accessories.join(", ") || "no accessories"}`,
      metadata: { assignmentId: g.id },
    });
    const managers = await managersOf(tx, g.asset.departmentId);
    await createNotification(tx, {
      userIds: managers,
      type: "HANDOVER_CONFIRMED",
      title: "Handover signed",
      message: `${g.employee.name} confirmed ${g.asset.name}`,
      link: `/assets/${g.assetId}`,
    });

    // Transfer workflow: the transfer completes when the new holder confirms.
    const transfer = await tx.assetTransfer.findUnique({ where: { newAssignmentId: g.id } });
    if (transfer && transfer.status === "APPROVED") {
      await tx.assetTransfer.update({ where: { id: transfer.id }, data: { status: "COMPLETED", completedAt: now } });
      const fromUser = await userIdOfEmployee(tx, transfer.fromEmployeeId);
      await createNotification(tx, {
        userIds: [...managers, fromUser],
        type: "TRANSFER_COMPLETED",
        title: `${transfer.transferNo} completed`,
        message: `${g.employee.name} received ${g.asset.name}`,
        link: `/transfers`,
      });
    }
    return { name: g.asset.name };
  });
}

/** Employee reports a problem at handover instead of signing. */
export async function disputeHandover(assignmentId: string, input: unknown) {
  const { user, g } = await ownPendingAssignment(assignmentId);
  const data = disputeSchema.parse(input);
  const note = [data.missing.length ? `Missing: ${data.missing.join(", ")}` : null, data.note].filter(Boolean).join(" · ") || "Employee reported a problem at handover";

  return prisma.$transaction(async (tx) => {
    await tx.assignment.update({ where: { id: g.id }, data: { handoverStatus: "DISPUTED", handoverNote: note } });
    await recordHistory(tx, { assetId: g.assetId, actorId: user.id, event: "HANDOVER_DISPUTED", description: note, metadata: { assignmentId: g.id } });
    await createNotification(tx, {
      userIds: await managersOf(tx, g.asset.departmentId),
      type: "HANDOVER_DISPUTED",
      title: "Handover disputed",
      message: `${g.employee.name}: ${note}`,
      link: `/assets/${g.assetId}`,
    });
    return { name: g.asset.name };
  });
}

/** Manager has sorted out a disputed handover: ask the employee to sign again. */
export async function reopenHandover(assignmentId: string) {
  const user = await requireUser();
  const g = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { asset: true, employee: { select: { name: true, userId: true } } } });
  if (!g) throw new NotFoundError("Assignment");
  assertCan(user, "asset:assign", { departmentId: g.asset.departmentId });
  if (!g.isActive || g.handoverStatus !== "DISPUTED") throw new AppError("Only a disputed handover can be reopened.");
  return prisma.$transaction(async (tx) => {
    await tx.assignment.update({ where: { id: g.id }, data: { handoverStatus: "PENDING" } });
    await recordHistory(tx, {
      assetId: g.assetId,
      actorId: user.id,
      event: "UPDATED",
      description: `Handover dispute resolved; ${g.employee.name} asked to sign again`,
      metadata: { assignmentId: g.id },
    });
    await createNotification(tx, {
      userIds: [g.employee.userId],
      type: "ASSET_ASSIGNED",
      title: `Please sign for ${g.asset.name}`,
      message: "Your asset manager sorted out the handover problem",
      link: `/my-assets/handover/${g.id}`,
    });
    return { name: g.employee.name };
  });
}
