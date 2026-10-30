import "server-only";
import type { AssetStatus, Role } from "@prisma/client";
import { prisma } from "../db";
import { ForbiddenError } from "../errors";
import type { CurrentUser } from "../permissions";
import { lastMonths, monthKey } from "./dashboard";

const DAY = 864e5;
const YEAR = 365.25 * DAY;
/** Age bands for "Asset age by department", in years since purchase. Last band = no purchase date. */
export const AGE_BANDS = ["Under 1 yr", "1–2 yrs", "2–3 yrs", "3+ yrs", "Unknown"] as const;
/** A user who hasn't signed in for this long is shown as stale on the admin dashboard. */
export const STALE_SIGN_IN_DAYS = 3;

export type AdminDepartment = {
  id: string;
  name: string;
  code: string;
  managers: string[];
  people: number;
  /** Active (non-retired) assets by status. */
  statuses: { status: AssetStatus; count: number }[];
  total: number;
  inUse: number;
  value: number;
};

/**
 * Organisation-wide numbers for the admin-only section of the Dashboard: departments side by side,
 * departments without a manager, user accounts and recent sign-ins. Admins only.
 */
export async function getAdminOverview(user: CurrentUser) {
  if (user.role !== "ADMIN") throw new ForbiddenError();
  const now = Date.now();
  const [departments, assetRows, roleRows, inactiveUsers, tempPasswords, recentSignIns, employees, employeesWithoutLogin, assets, repairs, assignments] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, managers: { where: { isActive: true }, select: { name: true } }, _count: { select: { employees: { where: { isActive: true } } } } },
    }),
    prisma.asset.groupBy({ by: ["departmentId", "status"], where: { status: { not: "RETIRED" } }, _count: { _all: true }, _sum: { purchaseCost: true } }),
    prisma.user.groupBy({ by: ["role"], where: { isActive: true }, _count: { _all: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { isActive: true, mustChangePassword: true } }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
      take: 5,
      select: { id: true, name: true, role: true, lastLoginAt: true },
    }),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { isActive: true, userId: null } }),
    // Chart inputs. Small tables for one organisation, so they're read once and bucketed here.
    prisma.asset.findMany({
      select: { id: true, assetTag: true, name: true, status: true, departmentId: true, purchaseDate: true, purchaseCost: true, warrantyEnd: true, createdAt: true, retirement: { select: { retirementDate: true } } },
    }),
    prisma.maintenanceRecord.findMany({ where: { status: { not: "CANCELLED" } }, select: { serviceDate: true, actualCompletion: true, cost: true } }),
    prisma.assignment.findMany({ select: { assignedAt: true, endedAt: true } }),
  ]);
  const charts = adminCharts(assets, repairs, assignments, new Date(now));

  const depts: AdminDepartment[] = departments.map((d) => {
    const rows = assetRows.filter((r) => r.departmentId === d.id);
    const total = rows.reduce((n, r) => n + r._count._all, 0);
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      managers: d.managers.map((m) => m.name),
      people: d._count.employees,
      statuses: rows.map((r) => ({ status: r.status, count: r._count._all })),
      total,
      inUse: rows.find((r) => r.status === "ASSIGNED")?._count._all ?? 0,
      value: rows.reduce((n, r) => n + Number(r._sum.purchaseCost ?? 0), 0),
    };
  });
  const unmanaged = depts.filter((d) => !d.managers.length);
  const roles = Object.fromEntries(roleRows.map((r) => [r.role, r._count._all])) as Partial<Record<Role, number>>;

  return {
    departments: depts,
    unmanaged,
    totals: {
      people: depts.reduce((n, d) => n + d.people, 0),
      assets: depts.reduce((n, d) => n + d.total, 0),
      inUse: depts.reduce((n, d) => n + d.inUse, 0),
      value: depts.reduce((n, d) => n + d.value, 0),
    },
    users: {
      admins: roles.ADMIN ?? 0,
      managers: roles.MANAGER ?? 0,
      employees: roles.EMPLOYEE ?? 0,
      active: (roles.ADMIN ?? 0) + (roles.MANAGER ?? 0) + (roles.EMPLOYEE ?? 0),
      inactive: inactiveUsers,
      tempPasswords,
    },
    employees,
    employeesWithoutLogin,
    recentSignIns: recentSignIns.map((u) => ({
      ...u,
      stale: !u.lastLoginAt || now - u.lastLoginAt.getTime() > STALE_SIGN_IN_DAYS * DAY,
    })),
    charts,
  };
}

type ChartAsset = {
  id: string;
  assetTag: string;
  name: string;
  status: AssetStatus;
  departmentId: string | null;
  purchaseDate: Date | null;
  purchaseCost: unknown;
  warrantyEnd: Date | null;
  createdAt: Date;
  retirement: { retirementDate: Date } | null;
};

/** The four admin charts: spend, value going out of warranty, asset age by department, share in use. */
function adminCharts(assets: ChartAsset[], repairs: { serviceDate: Date; actualCompletion: Date | null; cost: unknown }[], assignments: { assignedAt: Date; endedAt: Date | null }[], now: Date) {
  const cost = (v: unknown) => Number(v ?? 0);
  const active = assets.filter((a) => a.status !== "RETIRED");

  // 1. Purchases (by purchase date) vs repairs (by completion, else service date), last 12 months.
  const spend = lastMonths(12).map((m) => ({
    label: m.label,
    full: m.full,
    purchases: assets.filter((a) => a.purchaseDate && monthKey(a.purchaseDate) === m.key).reduce((n, a) => n + cost(a.purchaseCost), 0),
    repairs: repairs.filter((r) => monthKey(r.actualCompletion ?? r.serviceDate) === m.key).reduce((n, r) => n + cost(r.cost), 0),
  }));

  // 2. Purchase value of active assets whose warranty ends in each of the next 6 months, plus the biggest ones.
  const ending = active.filter((a) => a.warrantyEnd && a.warrantyEnd >= now);
  const warranty = lastMonths(6, true).map((m) => {
    const list = ending.filter((a) => monthKey(a.warrantyEnd!) === m.key);
    return { label: m.label, full: `${m.full} · ${list.length} asset${list.length === 1 ? "" : "s"}`, value: list.reduce((n, a) => n + cost(a.purchaseCost), 0) };
  });
  const horizon = lastMonths(6, true).map((m) => m.key);
  const warrantyTop = ending
    .filter((a) => horizon.includes(monthKey(a.warrantyEnd!)))
    .sort((a, b) => cost(b.purchaseCost) - cost(a.purchaseCost))
    .slice(0, 4)
    .map((a) => ({ id: a.id, tag: a.assetTag, name: a.name, warrantyEnd: a.warrantyEnd!, value: cost(a.purchaseCost) }));

  // 3. Active assets per department by years since purchase.
  const band = (a: ChartAsset) => {
    if (!a.purchaseDate) return 4;
    const y = (now.getTime() - a.purchaseDate.getTime()) / YEAR;
    return y < 1 ? 0 : y < 2 ? 1 : y < 3 ? 2 : 3;
  };
  const ageByDept = new Map<string, number[]>();
  for (const a of active) {
    if (!a.departmentId) continue;
    const b = ageByDept.get(a.departmentId) ?? [0, 0, 0, 0, 0];
    b[band(a)]++;
    ageByDept.set(a.departmentId, b);
  }

  // 4. Share of assets held by someone at the end of each month (today for the current month).
  const inUse = lastMonths(12).map((m) => {
    const [y, mo] = m.key.split("-").map(Number);
    const end = new Date(Math.min(Date.UTC(y, mo, 1) - 1, now.getTime()));
    const owned = assets.filter((a) => (a.purchaseDate ?? a.createdAt) <= end && !(a.retirement && a.retirement.retirementDate <= end)).length;
    const held = assignments.filter((g) => g.assignedAt <= end && (!g.endedAt || g.endedAt > end)).length;
    const pct = owned ? Math.round((Math.min(held, owned) / owned) * 100) : 0;
    return { label: m.label, full: `${m.full} · ${held} of ${owned} assets`, value: pct };
  });

  return { spend, warranty, warrantyTop, ageByDept: Object.fromEntries(ageByDept), inUse, idleNow: active.length - active.filter((a) => a.status === "ASSIGNED").length };
}

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
