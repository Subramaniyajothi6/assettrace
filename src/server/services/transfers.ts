import "server-only";
import { prisma } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition } from "../lifecycle";
import { createNotification, managersOf, userIdOfEmployee } from "../notify";
import { assertCan, can, requireUser } from "../permissions";
import { nextNumber } from "../sequence";
import { transferRequestSchema, transferReviewSchema } from "@/lib/validation/transfers";
import { lockAsset } from "./assignments";

/** Employee (own asset) or manager (in scope) asks to move an assigned asset to someone else. */
export async function requestTransfer(input: unknown) {
  const user = await requireUser();
  const data = transferRequestSchema.parse(input);
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, include: { currentHolder: true } });
  if (!asset) throw new NotFoundError("Asset");
  const isHolder = !!user.employeeId && asset.currentHolderId === user.employeeId;
  const managesIt = user.role !== "EMPLOYEE" && can(user, "asset:transfer", { departmentId: asset.departmentId });
  if (!isHolder && !managesIt) throw new ForbiddenError("You can only transfer your own assets or assets in your departments.");
  if (asset.status !== "ASSIGNED" || !asset.currentHolder) throw new AppError("Only assigned assets can be transferred.");
  if (data.toEmployeeId === asset.currentHolderId) throw new AppError("They already hold this asset.", { toEmployeeId: "Already the holder" });
  const to = await prisma.employee.findUnique({ where: { id: data.toEmployeeId } });
  if (!to || !to.isActive) throw new AppError("Choose an active employee.", { toEmployeeId: "Choose an active employee" });
  const pending = await prisma.assetTransfer.findFirst({ where: { assetId: asset.id, status: "REQUESTED" }, select: { transferNo: true } });
  if (pending) throw new AppError(`${pending.transferNo} is already waiting for review.`);

  return prisma.$transaction(async (tx) => {
    const transferNo = await nextNumber(tx, "TRF");
    const t = await tx.assetTransfer.create({
      data: {
        transferNo,
        assetId: asset.id,
        reason: data.reason,
        fromEmployeeId: asset.currentHolderId,
        fromDepartmentId: asset.departmentId,
        fromLocationId: asset.locationId,
        toEmployeeId: to.id,
        toDepartmentId: to.departmentId,
        toLocationId: data.toLocationId ?? to.locationId ?? asset.locationId,
        requestedById: user.id,
      },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "TRANSFER_REQUESTED",
      description: `${transferNo} · to ${to.name}`,
      metadata: { transferId: t.id },
    });
    await createNotification(tx, {
      userIds: await managersOf(tx, asset.departmentId),
      excludeUserId: user.id,
      type: "TRANSFER_REQUESTED",
      title: "Transfer requested",
      message: `${asset.name} from ${asset.currentHolder!.name} to ${to.name}`,
      link: `/transfers?t=${t.id}`,
    });
    return t;
  });
}

/** Manager approves (moves the asset, new pending handover) or rejects a transfer. */
export async function reviewTransfer(transferId: string, input: unknown) {
  const user = await requireUser();
  assertCan(user, "asset:transfer");
  const data = transferReviewSchema.parse(input);
  const t = await prisma.assetTransfer.findUnique({
    where: { id: transferId },
    include: { toEmployee: true, fromEmployee: true, asset: { select: { departmentId: true, name: true } } },
  });
  if (!t) throw new NotFoundError("Transfer");
  if (user.role === "EMPLOYEE" || !can(user, "asset:transfer", { departmentId: t.asset.departmentId })) {
    throw new ForbiddenError("Only a manager of this asset's department can review the transfer.");
  }
  if (t.status !== "REQUESTED") throw new AppError("This transfer was already reviewed.");
  const remarks = data.remarks ?? (data.decision === "approve" ? "Approved" : "Rejected");
  const [fromUser, toUser] = await Promise.all([userIdOfEmployee(prisma, t.fromEmployeeId), userIdOfEmployee(prisma, t.toEmployeeId)]);

  if (data.decision === "reject") {
    return prisma.$transaction(async (tx) => {
      const r = await tx.assetTransfer.update({
        where: { id: t.id },
        data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(), reviewRemarks: remarks },
      });
      await recordHistory(tx, { assetId: t.assetId, actorId: user.id, event: "TRANSFER_REJECTED", description: `${t.transferNo} rejected · ${remarks}` });
      await createNotification(tx, {
        userIds: [fromUser, toUser, t.requestedById],
        excludeUserId: user.id,
        type: "GENERAL",
        title: `${t.transferNo} rejected`,
        message: `${t.asset.name}: ${remarks}`,
        link: "/my-assets",
      });
      return r;
    });
  }

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, t.assetId);
    const old = await tx.assignment.findFirst({ where: { assetId: asset.id, isActive: true } });
    if (asset.status !== "ASSIGNED" || !old || old.employeeId !== t.fromEmployeeId) {
      throw new AppError("The asset changed since this was requested (it's no longer with the original holder). Reject it and raise a new one.");
    }
    assertTransition(asset.status, "ASSIGNED");
    const now = new Date();
    await tx.assignment.update({ where: { id: old.id }, data: { isActive: false, endedAt: now, endReason: "TRANSFERRED" } });
    const g = await tx.assignment.create({
      data: {
        assetId: asset.id,
        employeeId: t.toEmployeeId,
        departmentId: t.toEmployee.departmentId,
        locationId: t.toLocationId,
        assignedById: user.id,
        assignedAt: now,
        expectedReturnDate: old.expectedReturnDate,
        conditionAtAssignment: asset.condition,
        accessories: old.accessories,
        remarks: `Transfer ${t.transferNo}`,
        handoverStatus: "PENDING",
        handoverDate: now,
      },
    });
    await tx.asset.update({
      where: { id: asset.id },
      data: { currentHolderId: t.toEmployeeId, departmentId: t.toEmployee.departmentId, locationId: t.toLocationId ?? asset.locationId },
    });
    const r = await tx.assetTransfer.update({
      where: { id: t.id },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: now, reviewRemarks: remarks, newAssignmentId: g.id },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "TRANSFERRED",
      fromStatus: "ASSIGNED",
      toStatus: "ASSIGNED",
      description: `${t.transferNo} · ${t.fromEmployee?.name ?? "Store"} → ${t.toEmployee.name}`,
      metadata: { transferId: t.id, fromAssignmentId: old.id, toAssignmentId: g.id },
    });
    await createNotification(tx, {
      userIds: [toUser],
      type: "ASSET_ASSIGNED",
      title: `${asset.name} is being transferred to you`,
      message: "Confirm and sign when you receive it",
      link: `/my-assets/handover/${g.id}`,
    });
    await createNotification(tx, {
      userIds: [fromUser, t.requestedById],
      excludeUserId: user.id,
      type: "GENERAL",
      title: `${t.transferNo} approved`,
      message: `Hand ${asset.name} over to ${t.toEmployee.name}`,
      link: "/my-assets",
    });
    return r;
  });
}

/** The requester withdraws a transfer that hasn't been reviewed yet. */
export async function cancelTransfer(transferId: string) {
  const user = await requireUser();
  const t = await prisma.assetTransfer.findUnique({ where: { id: transferId }, include: { asset: { select: { departmentId: true } } } });
  if (!t) throw new NotFoundError("Transfer");
  const managesIt = user.role !== "EMPLOYEE" && can(user, "asset:transfer", { departmentId: t.asset.departmentId });
  if (t.requestedById !== user.id && !managesIt) throw new ForbiddenError();
  if (t.status !== "REQUESTED") throw new AppError("Only a pending transfer can be cancelled.");
  return prisma.$transaction(async (tx) => {
    const r = await tx.assetTransfer.update({ where: { id: t.id }, data: { status: "CANCELLED" } });
    await recordHistory(tx, { assetId: t.assetId, actorId: user.id, event: "UPDATED", description: `${t.transferNo} cancelled` });
    return r;
  });
}
