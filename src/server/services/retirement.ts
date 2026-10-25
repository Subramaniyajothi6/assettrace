import "server-only";
import { prisma } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition } from "../lifecycle";
import { createNotification, userIdOfEmployee } from "../notify";
import { assertCan, requireUser } from "../permissions";
import { DISPOSAL_LABELS } from "@/lib/labels";
import { lostSchema, retireSchema } from "@/lib/validation/returns";
import { lockAsset } from "./assignments";

async function managedAsset(assetId: string, action: "asset:retire" | "asset:markLost") {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") throw new ForbiddenError();
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError("Asset not found.");
  assertCan(user, action, { departmentId: asset.departmentId });
  return { user, asset };
}

/** Retire (ARCHITECTURE.md §4 rule 4): never while assigned; returned assets must be inspected first. Read-only afterwards. */
export async function retireAsset(assetId: string, input: unknown) {
  const { user } = await managedAsset(assetId, "asset:retire");
  const data = retireSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, assetId);
    if (asset.status === "RETIRED") throw new AppError("This asset is already retired.");
    if (asset.currentHolderId || asset.status === "ASSIGNED") throw new AppError("This asset is assigned. Request and receive the return first, then retire it.");
    if (asset.status === "RETURNED") {
      const last = await tx.assetReturn.findFirst({ where: { assetId, status: { in: ["RECEIVED", "INSPECTED"] } }, orderBy: { receivedAt: "desc" } });
      if (!last || last.status !== "INSPECTED") throw new AppError("Inspect the returned asset before retiring it.");
    }
    assertTransition(asset.status, "RETIRED");

    // Anything still open on the asset ends here.
    const open = await tx.maintenanceRecord.findMany({ where: { assetId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, select: { id: true, maintenanceNo: true } });
    if (open.length) await tx.maintenanceRecord.updateMany({ where: { id: { in: open.map((m) => m.id) } }, data: { status: "CANCELLED" } });

    const retirement = await tx.assetRetirement.create({ data: { ...data, assetId, authorizedById: user.id } });
    await tx.asset.update({ where: { id: assetId }, data: { status: "RETIRED", condition: data.finalCondition } });
    await recordHistory(tx, {
      assetId,
      actorId: user.id,
      event: "RETIRED",
      fromStatus: asset.status,
      toStatus: "RETIRED",
      description: `Retired · ${DISPOSAL_LABELS[data.disposalMethod].toLowerCase()} · ${data.reason}${open.length ? ` · cancelled ${open.map((m) => m.maintenanceNo).join(", ")}` : ""}`,
      metadata: { retirementId: retirement.id },
    });
    return { tag: asset.assetTag };
  });
}

/** Mark lost: closes the assignment and any open return/transfer for the asset. */
export async function markLost(assetId: string, input: unknown) {
  const { user } = await managedAsset(assetId, "asset:markLost");
  const { note } = lostSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, assetId);
    assertTransition(asset.status, "LOST");
    const g = await tx.assignment.findFirst({ where: { assetId, isActive: true }, include: { employee: { select: { name: true } } } });
    if (g) await tx.assignment.update({ where: { id: g.id }, data: { isActive: false, endedAt: new Date(), endReason: "LOST" } });
    await tx.assetReturn.updateMany({ where: { assetId, status: "REQUESTED" }, data: { status: "CANCELLED", remarks: "Asset marked lost" } });
    await tx.assetTransfer.updateMany({ where: { assetId, status: "REQUESTED" }, data: { status: "CANCELLED", reviewRemarks: "Asset marked lost" } });
    await tx.asset.update({ where: { id: assetId }, data: { status: "LOST", currentHolderId: null } });
    await recordHistory(tx, {
      assetId,
      actorId: user.id,
      event: "MARKED_LOST",
      fromStatus: asset.status,
      toStatus: "LOST",
      description: `Marked lost${g ? ` · was with ${g.employee.name}` : ""}${note ? ` · ${note}` : ""}`,
    });
    if (g) {
      await createNotification(tx, {
        userIds: [await userIdOfEmployee(tx, g.employeeId)],
        type: "GENERAL",
        title: `${asset.name} marked lost`,
        message: "It has been removed from your assets",
        link: "/my-assets",
      });
    }
    return { tag: asset.assetTag };
  });
}

/** A lost asset turned up: back to Available. */
export async function markFound(assetId: string) {
  const { user } = await managedAsset(assetId, "asset:markLost");
  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, assetId);
    if (asset.status !== "LOST") throw new AppError("Only lost assets can be marked found.");
    assertTransition("LOST", "AVAILABLE");
    await tx.asset.update({ where: { id: assetId }, data: { status: "AVAILABLE" } });
    await recordHistory(tx, { assetId, actorId: user.id, event: "STATUS_CHANGED", fromStatus: "LOST", toStatus: "AVAILABLE", description: "Found · back to Available" });
    return { tag: asset.assetTag };
  });
}
