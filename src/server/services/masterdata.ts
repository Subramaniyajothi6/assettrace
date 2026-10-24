import "server-only";
import { prisma } from "../db";
import { AppError, NotFoundError } from "../errors";
import { assertCan, requireUser } from "../permissions";
import {
  categorySchema,
  departmentSchema,
  locationSchema,
  vendorSchema,
  type MasterKind,
} from "@/lib/validation/masterdata";

/** Departments, categories, vendors: admin. Locations: manager or admin (ARCHITECTURE.md §3). */
async function guard(kind: MasterKind) {
  const user = await requireUser();
  assertCan(user, kind === "locations" ? "location:manage" : "masterdata:manage");
  return user;
}

async function validManagerIds(ids: string[]) {
  if (!ids.length) return [];
  const found = await prisma.user.findMany({ where: { id: { in: ids }, role: "MANAGER", isActive: true }, select: { id: true } });
  if (found.length !== ids.length) throw new AppError("Only active managers can manage a department.", { managerIds: "Pick active managers" });
  return ids;
}

export async function createMaster(kind: MasterKind, input: unknown) {
  await guard(kind);
  switch (kind) {
    case "departments": {
      const d = departmentSchema.parse(input);
      const managerIds = await validManagerIds(d.managerIds);
      return prisma.department.create({ data: { name: d.name, code: d.code, managers: { connect: managerIds.map((id) => ({ id })) } } });
    }
    case "locations":
      return prisma.location.create({ data: locationSchema.parse(input) });
    case "categories":
      return prisma.assetCategory.create({ data: categorySchema.parse(input) });
    case "vendors":
      return prisma.vendor.create({ data: vendorSchema.parse(input) });
  }
}

export async function updateMaster(kind: MasterKind, id: string, input: unknown) {
  await guard(kind);
  switch (kind) {
    case "departments": {
      const d = departmentSchema.parse(input);
      const managerIds = await validManagerIds(d.managerIds);
      return prisma.department.update({ where: { id }, data: { name: d.name, code: d.code, managers: { set: managerIds.map((x) => ({ id: x })) } } });
    }
    case "locations":
      return prisma.location.update({ where: { id }, data: locationSchema.parse(input) });
    case "categories": {
      const c = categorySchema.parse(input);
      const current = await prisma.assetCategory.findUnique({ where: { id }, select: { code: true, _count: { select: { assets: true } } } });
      if (!current) throw new NotFoundError("Category");
      if (current.code !== c.code && current._count.assets > 0) {
        throw new AppError("The code builds asset IDs, so it can't change once assets use it.", { code: "Can't change: assets use this code" });
      }
      return prisma.assetCategory.update({ where: { id }, data: c });
    }
    case "vendors":
      return prisma.vendor.update({ where: { id }, data: vendorSchema.parse(input) });
  }
}

/** Deactivate/reactivate. Records are never deleted, so history keeps their names. */
export async function setMasterActive(kind: MasterKind, id: string, isActive: boolean) {
  await guard(kind);
  const data = { isActive };
  switch (kind) {
    case "departments":
      return prisma.department.update({ where: { id }, data });
    case "locations":
      return prisma.location.update({ where: { id }, data });
    case "categories":
      return prisma.assetCategory.update({ where: { id }, data });
    case "vendors":
      return prisma.vendor.update({ where: { id }, data });
  }
}
