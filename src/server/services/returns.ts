import "server-only";
import type { Priority } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { createNotification, managersOf, userIdOfEmployee } from "../notify";
import { can, requireUser, type CurrentUser } from "../permissions";
import { nextNumber } from "../sequence";

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
