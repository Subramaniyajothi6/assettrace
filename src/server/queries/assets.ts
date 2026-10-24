import "server-only";
import type { AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { assetScope, managedAssetScope, type CurrentUser } from "../permissions";
import { ilike, paging, param, type SearchParams } from "@/lib/list";

const DAY = 864e5;

export function warrantyWhere(kind: string | undefined, days: number): Prisma.AssetWhereInput {
  const now = new Date();
  switch (kind) {
    case "active":
      return { warrantyEnd: { gte: now } };
    case "soon":
      return { warrantyEnd: { gte: now, lte: new Date(now.getTime() + days * DAY) }, status: { not: "RETIRED" } };
    case "expired":
      return { warrantyEnd: { lt: now } };
    case "none":
      return { warrantyEnd: null };
    default:
      return {};
  }
}

/** Filters from ARCHITECTURE/PLAN Phase 3, read from the URL. */
export function assetFilters(sp: SearchParams, warrantyDays: number): Prisma.AssetWhereInput {
  const q = param(sp, "q");
  const year = Number(param(sp, "year"));
  return {
    AND: [
      q
        ? {
            OR: [
              { assetTag: ilike(q) },
              { serialNumber: ilike(q) },
              { name: ilike(q) },
              { brand: ilike(q) },
              { model: ilike(q) },
              { currentHolder: { name: ilike(q) } },
            ],
          }
        : {},
      param(sp, "category") ? { categoryId: param(sp, "category") } : {},
      param(sp, "status") ? { status: param(sp, "status") as AssetStatus } : {},
      param(sp, "location") ? { locationId: param(sp, "location") } : {},
      param(sp, "department") ? { departmentId: param(sp, "department") } : {},
      param(sp, "condition") ? { condition: param(sp, "condition") as Prisma.EnumAssetConditionFilter["equals"] } : {},
      param(sp, "holder") ? { currentHolderId: param(sp, "holder") } : {},
      param(sp, "brand") ? { brand: { equals: param(sp, "brand"), mode: "insensitive" as const } } : {},
      warrantyWhere(param(sp, "warranty"), warrantyDays),
      Number.isFinite(year) && year > 1900 ? { purchaseDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } : {},
    ],
  };
}

export async function listAssets(user: CurrentUser, sp: SearchParams, warrantyDays: number) {
  const scope = managedAssetScope(user);
  const where: Prisma.AssetWhereInput = { AND: [scope, assetFilters(sp, warrantyDays)] };
  const { page, skip, take, size } = paging(sp);
  const now = new Date();
  const [rows, total, inScope, available, reserved, warrantySoon, returned] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take,
      include: {
        category: { select: { name: true, code: true } },
        location: { select: { name: true } },
        currentHolder: { select: { name: true } },
      },
    }),
    prisma.asset.count({ where }),
    prisma.asset.count({ where: scope }),
    prisma.asset.count({ where: { AND: [scope, { status: "AVAILABLE" }] } }),
    prisma.asset.count({ where: { AND: [scope, { status: "RESERVED" }] } }),
    prisma.asset.count({ where: { AND: [scope, warrantyWhere("soon", warrantyDays)] } }),
    prisma.asset.count({ where: { AND: [scope, { status: "RETURNED" }] } }),
  ]);
  return { rows, total, page, size, kpis: { inScope, available, reserved, warrantySoon, returned }, now };
}

/** Options for the asset filters and forms, limited to what the user may use. */
export async function assetFormOptions(user: CurrentUser) {
  const deptWhere = user.role === "ADMIN" ? { isActive: true } : { isActive: true, id: { in: user.managedDepartmentIds } };
  const [categories, locations, departments, vendors, brands] = await Promise.all([
    prisma.assetCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: deptWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.asset.findMany({ where: { ...managedAssetScope(user), brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
  ]);
  return { categories, locations, departments, vendors, brands: brands.map((b) => b.brand!) };
}

/** Full record for the detail page, or null when missing / out of scope. */
export async function getAssetDetail(user: CurrentUser, id: string) {
  return prisma.asset.findFirst({
    where: { AND: [{ id }, assetScope(user)] },
    include: {
      category: true,
      vendor: true,
      location: true,
      department: true,
      currentHolder: { include: { department: { select: { name: true } }, location: { select: { name: true } } } },
      retirement: { include: { authorizedBy: { select: { name: true } } } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { employee: { select: { name: true, employeeCode: true } }, assignedBy: { select: { name: true } } },
      },
      history: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      maintenance: { orderBy: { serviceDate: "desc" } },
      issues: { orderBy: { reportedAt: "desc" }, include: { reportedBy: { select: { name: true } } } },
      returns: {
        orderBy: { requestedAt: "desc" },
        include: { returnedBy: { select: { name: true } }, inspection: true },
      },
      transfers: {
        orderBy: { requestedAt: "desc" },
        include: {
          fromEmployee: { select: { name: true } },
          toEmployee: { select: { name: true } },
          requestedBy: { select: { name: true } },
        },
      },
    },
  });
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>;
