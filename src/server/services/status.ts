import "server-only";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition } from "../lifecycle";
import { assertCan, requireUser } from "../permissions";
import { optText } from "@/lib/validation/common";
import { lockAsset } from "./assignments";

const reserveSchema = z.object({ note: optText(300) });

/**
 * Hold an available asset for someone (e.g. a new joiner) or release it.
 * AVAILABLE ⇄ RESERVED (ARCHITECTURE.md §4); a reserved asset can still be assigned.
 */
export async function setReserved(assetId: string, reserve: boolean, input: unknown = {}) {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") throw new ForbiddenError();
  const { note } = reserveSchema.parse(input);
  const current = await prisma.asset.findUnique({ where: { id: assetId }, select: { departmentId: true } });
  if (!current) throw new AppError("Asset not found.");
  assertCan(user, "asset:edit", { departmentId: current.departmentId });
  const to = reserve ? "RESERVED" : "AVAILABLE";

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, assetId);
    if (reserve && asset.status !== "AVAILABLE") throw new AppError("Only available assets can be reserved.");
    if (!reserve && asset.status !== "RESERVED") throw new AppError("This asset isn't reserved.");
    assertTransition(asset.status, to);
    await tx.asset.update({ where: { id: assetId }, data: { status: to } });
    await recordHistory(tx, {
      assetId,
      actorId: user.id,
      event: "STATUS_CHANGED",
      fromStatus: asset.status,
      toStatus: to,
      description: reserve ? `Reserved${note ? ` · ${note}` : ""}` : "Reservation released · back to Available",
    });
    return { tag: asset.assetTag };
  });
}
