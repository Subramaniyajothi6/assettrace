import "server-only";
import type { Priority } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition } from "../lifecycle";
import { createNotification, managersOf, userIdOfEmployee } from "../notify";
import { assertCan, can, requireUser, type CurrentUser } from "../permissions";
import { nextNumber } from "../sequence";
import { uploadImage } from "../storage";
import { CONDITION_LABELS, INSPECTION_RESULT_LABELS } from "@/lib/labels";
import { inspectionSchema, receiveReturnSchema } from "@/lib/validation/returns";
import { lockAsset } from "./assignments";
import { startMaintenanceTx } from "./maintenance";

/**
 * Start a return (ARCHITECTURE.md §5 "Return"): by the holder (creates a RETURN request too)
 * or by a manager in scope. The asset stays ASSIGNED until it's received.
 */
export async function requestReturnTx(
  tx: Tx,
  user: CurrentUser,
  assetId: string,
  opts: { reason?: string | null; description?: string; priority?: Priority },
) {
  const asset = await tx.asset.findUnique({ where: { id: assetId }, include: { currentHolder: true } });
  if (!asset) throw new NotFoundError("Asset");
  const isHolder = !!user.employeeId && asset.currentHolderId === user.employeeId;
  const managesIt = user.role !== "EMPLOYEE" && can(user, "asset:return", { departmentId: asset.departmentId });
  if (!isHolder && !managesIt) throw new ForbiddenError("You can only return your own assets or assets in your departments.");
  if (asset.status !== "ASSIGNED" && asset.status !== "UNDER_MAINTENANCE") throw new AppError("Only assets that are with someone can be returned.");
  const g = await tx.assignment.findFirst({ where: { assetId, isActive: true } });
  if (!g || !asset.currentHolder) throw new AppError("This asset isn't assigned to anyone.");
  const open = await tx.assetReturn.findFirst({ where: { assetId, status: { in: ["REQUESTED", "RECEIVED"] } }, select: { returnNo: true } });
  if (open) throw new AppError(`${open.returnNo} is already open for this asset.`);

  const returnNo = await nextNumber(tx, "RET");
  const reason = opts.reason ?? (isHolder ? `Requested by ${asset.currentHolder.name}` : "Requested by asset manager");
  const ret = await tx.assetReturn.create({
    data: { returnNo, assetId, assignmentId: g.id, returnedById: g.employeeId, status: "REQUESTED", reason },
  });
  if (isHolder) {
    const requestNo = await nextNumber(tx, "REQ");
    await tx.employeeRequest.create({
      data: {
        requestNo,
        type: "RETURN",
        title: `Return ${asset.name}`,
        description: opts.description ?? reason,
        priority: opts.priority ?? "MEDIUM",
        employeeId: g.employeeId,
        assetId,
        returnId: ret.id,
      },
    });
  }
  await recordHistory(tx, { assetId, actorId: user.id, event: "RETURN_REQUESTED", description: `${returnNo} · ${reason}`, metadata: { returnId: ret.id } });
  if (isHolder) {
    await createNotification(tx, {
      userIds: await managersOf(tx, asset.departmentId),
      excludeUserId: user.id,
      type: "RETURN_REQUESTED",
      title: "Return requested",
      message: `${asset.currentHolder.name} wants to return ${asset.assetTag}`,
      link: `/returns/${ret.id}/receive`,
    });
  } else {
    await createNotification(tx, {
      userIds: [await userIdOfEmployee(tx, g.employeeId)],
      type: "RETURN_REQUESTED",
      title: `Please return ${asset.name}`,
      message: "Your asset manager has requested this asset back",
      link: "/my-assets",
    });
  }
  return ret;
}

export async function requestReturn(assetId: string, reason?: string | null) {
  const user = await requireUser();
  return prisma.$transaction((tx) => requestReturnTx(tx, user, assetId, { reason }));
}

async function loadReturn(returnId: string) {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") throw new ForbiddenError();
  const r = await prisma.assetReturn.findUnique({
    where: { id: returnId },
    include: { asset: true, returnedBy: { select: { name: true } }, assignment: true },
  });
  if (!r) throw new NotFoundError("Return");
  assertCan(user, "asset:return", { departmentId: r.asset.departmentId });
  return { user, r };
}

/** Check the asset in: assignment closes, asset becomes RETURNED (blocked until inspected). */
export async function receiveReturn(returnId: string, input: unknown, photos: File[]) {
  const { user, r } = await loadReturn(returnId);
  if (r.status !== "REQUESTED") throw new AppError("This return was already received.");
  const data = receiveReturnSchema.parse(input);
  if (data.receivedAt < startOfDay(r.assignment.assignedAt)) throw new AppError("The return date is before the asset was assigned.", { receivedAt: "Before the assignment date" });
  const photoPaths = await Promise.all(photos.map((p) => uploadImage(p, "returns", "photos")));

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, r.assetId);
    if (asset.status === "UNDER_MAINTENANCE") throw new AppError("It's still under maintenance. Complete the maintenance first, then receive it.");
    assertTransition(asset.status, "RETURNED");
    const g = await tx.assignment.findFirst({ where: { assetId: asset.id, isActive: true } });
    if (!g || g.id !== r.assignmentId) throw new AppError("The asset's assignment changed since this return was requested.");
    const missing = data.missingAccessories.filter((x) => g.accessories.includes(x));

    await tx.assignment.update({ where: { id: g.id }, data: { isActive: false, endedAt: data.receivedAt, endReason: "RETURNED" } });
    await tx.asset.update({ where: { id: asset.id }, data: { status: "RETURNED", currentHolderId: null, condition: data.condition } });
    const updated = await tx.assetReturn.update({
      where: { id: r.id },
      data: {
        status: "RECEIVED",
        receivedAt: data.receivedAt,
        receivedById: user.id,
        condition: data.condition,
        missingAccessories: missing,
        damage: data.damage,
        remarks: data.remarks,
        photoPaths,
      },
    });
    await tx.employeeRequest.updateMany({
      where: { returnId: r.id, status: { notIn: ["CANCELLED", "REJECTED"] } },
      data: { status: "COMPLETED", handledById: user.id, resolvedAt: new Date(), managerRemarks: `Received by ${user.name}` },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "RETURNED",
      fromStatus: asset.status,
      toStatus: "RETURNED",
      description: `${r.returnNo} · received from ${r.returnedBy.name} · ${CONDITION_LABELS[data.condition].toLowerCase()}${missing.length ? ` · missing ${missing.join(", ")}` : ""}`,
      metadata: { returnId: r.id },
    });
    await createNotification(tx, {
      userIds: [await userIdOfEmployee(tx, r.returnedById)],
      type: "GENERAL",
      title: "Return received",
      message: `${asset.name} was checked in by ${user.name}`,
      link: "/my-history",
    });
    return { ret: updated, next: data.next };
  });
}

const RESULT_TO_STATUS = {
  GOOD: "AVAILABLE",
  MINOR_REPAIR_REQUIRED: "UNDER_MAINTENANCE",
  MAJOR_REPAIR_REQUIRED: "UNDER_MAINTENANCE",
  DAMAGED: "DAMAGED",
  RETIRE: null, // the retirement form finishes it
} as const;

/** Mandatory inspection (ARCHITECTURE.md §4 rule 3): its result decides where the asset goes next. */
export async function inspectReturn(returnId: string, input: unknown) {
  const { user, r } = await loadReturn(returnId);
  if (r.status !== "RECEIVED") throw new AppError(r.status === "INSPECTED" ? "This return was already inspected." : "Receive the asset first.");
  const data = inspectionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, r.assetId);
    if (asset.status !== "RETURNED") throw new AppError("The asset isn't waiting for inspection.");
    const to = RESULT_TO_STATUS[data.result];
    const inspection = await tx.assetInspection.create({
      data: { ...data, assetId: asset.id, returnId: r.id, inspectedById: user.id },
    });
    await tx.assetReturn.update({ where: { id: r.id }, data: { status: "INSPECTED" } });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "INSPECTED",
      fromStatus: "RETURNED",
      toStatus: to ?? "RETURNED",
      description: `${r.returnNo} · result ${INSPECTION_RESULT_LABELS[data.result].split(" — ")[0]}${data.remarks ? ` · ${data.remarks}` : ""}`,
      metadata: { inspectionId: inspection.id },
    });
    await tx.asset.update({ where: { id: asset.id }, data: { condition: data.physicalCondition } });
    if (to === "UNDER_MAINTENANCE") {
      await startMaintenanceTx(tx, { ...asset, condition: data.physicalCondition }, user.id, {
        problem: `${data.result === "MAJOR_REPAIR_REQUIRED" ? "Major" : "Minor"} repair after return ${r.returnNo}`,
        type: "REPAIR",
        technicianNotes: [data.visibleDamage, data.missingComponents, data.remarks].filter(Boolean).join(" · ") || null,
        fromInspection: true,
      });
    } else if (to) {
      assertTransition("RETURNED", to);
      await tx.asset.update({ where: { id: asset.id }, data: { status: to } });
    }
    return { inspection, to, assetId: asset.id, tag: asset.assetTag };
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
