import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../db";
import { AppError, ForbiddenError, NotFoundError, zodFieldErrors } from "../errors";
import { recordHistory } from "../history";
import { assertEditable } from "../lifecycle";
import { assertCan, requireUser, type CurrentUser } from "../permissions";
import { nextNumber } from "../sequence";
import { getSettings } from "../settings";
import { uploadImage } from "../storage";
import { assetCreateSchema, assetUpdateSchema } from "@/lib/validation/assets";

/** Managers can only place assets in departments they manage. */
function assertDept(user: CurrentUser, departmentId: string) {
  if (user.role === "MANAGER" && !user.managedDepartmentIds.includes(departmentId)) {
    throw new ForbiddenError("You can only register assets for your departments.");
  }
}

/** Validate the form and check the serial is free, reporting all field errors at once (P2002 is the backstop). */
async function parseAsset<S extends typeof assetCreateSchema | typeof assetUpdateSchema>(schema: S, input: unknown, exceptId?: string): Promise<z.infer<S>> {
  const parsed = schema.safeParse(input);
  const raw = (input as Record<string, unknown>)?.serialNumber;
  const serial = typeof raw === "string" ? raw.trim() : "";
  const dup = serial
    ? await prisma.asset.findFirst({
        where: { serialNumber: { equals: serial, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
        select: { assetTag: true },
      })
    : null;
  const errors = {
    ...(parsed.success ? {} : zodFieldErrors(parsed.error)),
    ...(dup ? { serialNumber: `This serial already belongs to ${dup.assetTag}. Check the label and try again.` } : {}),
  };
  if (!parsed.success || dup) throw new AppError(dup && parsed.success ? "Serial number already exists." : "Please fix the highlighted fields.", errors);
  return parsed.data as z.infer<S>;
}

/** Load an asset and check the user may manage it (role + manager scope). */
export async function loadManagedAsset(user: CurrentUser, assetId: string, action: Parameters<typeof assertCan>[1]) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new NotFoundError("Asset");
  // Managers manage by department only (a manager's personally held asset isn't "managed" by them).
  assertCan(user, action, { departmentId: asset.departmentId });
  return asset;
}

export async function createAsset(input: unknown, photo: File | null) {
  const user = await requireUser();
  assertCan(user, "asset:create");
  const data = await parseAsset(assetCreateSchema, input);
  assertDept(user, data.departmentId);
  const category = await prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
  if (!category || !category.isActive) throw new AppError("Choose an active category.", { categoryId: "Choose a category" });
  const { assetTagPrefix } = await getSettings();
  const photoPath = photo ? await uploadImage(photo, "assets") : null;

  return prisma.$transaction(async (tx) => {
    // Sequence key stays AST-<CODE> so the counter survives prefix changes.
    const n = await nextNumber(tx, `AST-${category.code}`);
    const assetTag = n.replace(/^AST/, assetTagPrefix);
    const asset = await tx.asset.create({
      data: {
        ...data,
        assetTag,
        assetType: category.name,
        status: "AVAILABLE",
        photoPath,
        createdById: user.id,
      },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "REGISTERED",
      toStatus: "AVAILABLE",
      description: `Registered as Available${data.purchaseCost ? ` · ₹${Math.round(data.purchaseCost).toLocaleString("en-IN")}` : ""}`,
    });
    return asset;
  });
}

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  brand: "brand",
  model: "model",
  serialNumber: "serial number",
  purchaseDate: "purchase date",
  purchaseCost: "cost",
  vendorId: "vendor",
  warrantyStart: "warranty start",
  warrantyEnd: "warranty end",
  locationId: "location",
  departmentId: "department",
  condition: "condition",
  notes: "notes",
};

function same(a: unknown, b: unknown) {
  if (a instanceof Date || b instanceof Date) return (a ? +new Date(a as Date) : null) === (b ? +new Date(b as Date) : null);
  if (a !== null && typeof a === "object") return Number(a) === Number(b); // Decimal
  return (a ?? null) === (b ?? null);
}

export async function updateAsset(id: string, input: unknown, photo: File | null) {
  const user = await requireUser();
  const current = await loadManagedAsset(user, id, "asset:edit");
  assertEditable(current.status);
  const data = await parseAsset(assetUpdateSchema, input, id);
  assertDept(user, data.departmentId);
  // A held asset's location follows its holder's assignment; still allow edits but record them.
  const changed = Object.keys(FIELD_LABELS).filter((k) => !same(current[k as keyof typeof current], data[k as keyof typeof data]));
  const photoPath = photo ? await uploadImage(photo, "assets") : undefined;
  if (photoPath) changed.push("photo");
  if (!changed.length) return current;

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.update({ where: { id }, data: { ...data, ...(photoPath ? { photoPath } : {}) } as Prisma.AssetUncheckedUpdateInput });
    await recordHistory(tx, {
      assetId: id,
      actorId: user.id,
      event: "UPDATED",
      description: `Updated ${changed.map((k) => FIELD_LABELS[k] ?? k).join(", ")}`,
      metadata: { fields: changed },
    });
    return asset;
  });
}
