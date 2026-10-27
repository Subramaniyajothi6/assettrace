import "server-only";
import { Prisma, type AssetStatus } from "@prisma/client";
import { prisma } from "../db";
import { managedAssetScope, requestScope, type CurrentUser } from "../permissions";
import { STATUS_LABELS } from "@/lib/labels";

const DAY = 864e5;
/** Order of segments in the location status bars (in use first, problems last). */
const STATUS_ORDER: AssetStatus[] = ["ASSIGNED", "AVAILABLE", "UNDER_MAINTENANCE", "RESERVED", "RETURNED", "DAMAGED", "LOST"];
const WEEKS = 9;
const WEEK = 7 * DAY;
const MONTHS = 12;
const TZ = "Asia/Kolkata";

const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: TZ });
const monthYearLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: TZ });
const monthKeyFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ });
const monthKey = (d: Date) => monthKeyFmt.format(d).slice(0, 7); // 2026-10

/** Last N calendar months (oldest first) as { key, label }. */
function lastMonths(n: number, forward = false) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + (forward ? i : i - (n - 1)), 15);
    return { key: monthKey(d), label: monthLabel.format(d), full: monthYearLabel.format(d) };
  });
}

/** One row of the dashboard breakdown card: a group (category, department…) split by status. */
export type BreakdownGroup = { label: string; filter: string | null; total: number; statuses: { status: AssetStatus; count: number }[] };
const BREAKDOWN_ROWS = 8;

/** Groups per-(key, status) counts into rows, largest first; the tail folds into "Other". */
function breakdown<T extends { status: AssetStatus; _count: { _all: number } }>(rows: T[], key: (r: T) => string | null, names: Map<string, string>, param: string): BreakdownGroup[] {
  const groups = new Map<string, BreakdownGroup>();
  for (const r of rows) {
    const id = key(r) ?? "";
    const g = groups.get(id) ?? { label: names.get(id) ?? "Unassigned", filter: id ? `${param}=${id}` : null, total: 0, statuses: [] };
    g.total += r._count._all;
    g.statuses.push({ status: r.status, count: r._count._all });
    groups.set(id, g);
  }
  const order = (s: BreakdownGroup["statuses"]) => s.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const sorted = [...groups.values()].sort((a, b) => b.total - a.total);
  sorted.forEach((g) => order(g.statuses));
  if (sorted.length <= BREAKDOWN_ROWS) return sorted;
  const tail = sorted.slice(BREAKDOWN_ROWS - 1);
  const merged = new Map<AssetStatus, number>();
  for (const g of tail) for (const s of g.statuses) merged.set(s.status, (merged.get(s.status) ?? 0) + s.count);
  const other: BreakdownGroup = {
    label: `Other (${tail.length})`,
    filter: null,
    total: tail.reduce((n, g) => n + g.total, 0),
    statuses: order([...merged].map(([status, count]) => ({ status, count }))),
  };
  return [...sorted.slice(0, BREAKDOWN_ROWS - 1), other];
}

/** SQL fragment limiting an "Asset" alias to the user's managed departments. */
function deptSql(user: CurrentUser, alias = "a") {
  if (user.role === "ADMIN") return Prisma.sql`TRUE`;
  if (!user.managedDepartmentIds.length) return Prisma.sql`FALSE`;
  return Prisma.sql`${Prisma.raw(`"${alias}"."departmentId"`)} IN (${Prisma.join(user.managedDepartmentIds)})`;
}

/** Everything on the manager/admin dashboard, scoped (ARCHITECTURE.md §8, PLAN Phase 10). */
export async function getStaffDashboard(user: CurrentUser, warrantyDays: number) {
  const scope = managedAssetScope(user);
  const now = new Date();
  const since = new Date(now.getTime() - WEEKS * WEEK);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const soon = new Date(now.getTime() + warrantyDays * DAY);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, 1);

  const [
    byStatus,
    byCategory,
    byDepartment,
    value,
    warrantySoon,
    nextWarranty,
    pendingHandovers,
    pendingRequests,
    openIssues,
    trendRows,
    todayEvents,
    locationAssets,
    maintenanceByMonth,
    purchasesByMonth,
    transactionsByMonth,
    warrantyByMonth,
    locations,
    lateMaintenance,
  ] = await Promise.all([
    prisma.asset.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["categoryId", "status"], where: { AND: [scope, { status: { not: "RETIRED" } }] }, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ["departmentId", "status"], where: { AND: [scope, { status: { not: "RETIRED" } }] }, _count: { _all: true } }),
    prisma.asset.aggregate({ where: { AND: [scope, { status: { not: "RETIRED" } }] }, _sum: { purchaseCost: true }, _count: { _all: true } }),
    prisma.asset.count({ where: { AND: [scope, { status: { not: "RETIRED" } }, { warrantyEnd: { gte: now, lte: soon } }] } }),
    prisma.asset.findFirst({
      where: { AND: [scope, { status: { not: "RETIRED" } }, { warrantyEnd: { gte: now, lte: soon } }] },
      orderBy: { warrantyEnd: "asc" },
      select: { name: true, warrantyEnd: true },
    }),
    prisma.assignment.count({ where: { isActive: true, handoverStatus: "PENDING", asset: scope } }),
    prisma.employeeRequest.count({ where: { AND: [requestScope(user), { status: { in: ["PENDING", "IN_PROGRESS"] } }] } }),
    prisma.assetIssue.count({ where: { status: { in: ["REPORTED", "UNDER_REVIEW", "MAINTENANCE"] }, asset: scope } }),
    prisma.assetHistory.findMany({ where: { createdAt: { gte: since }, toStatus: { not: null }, asset: scope }, select: { toStatus: true, createdAt: true } }),
    prisma.assetHistory.findMany({
      where: { createdAt: { gte: startOfToday }, asset: scope },
      orderBy: { createdAt: "asc" },
      select: { id: true, event: true, description: true, createdAt: true, asset: { select: { name: true } } },
    }),
    prisma.asset.groupBy({
      by: ["locationId", "status"],
      where: { AND: [scope, { status: { not: "RETIRED" } }] },
      _count: { _all: true },
      _sum: { purchaseCost: true },
    }),
    prisma.$queryRaw<{ m: string; total: number }[]>`
      SELECT to_char(date_trunc('month', mr."serviceDate" AT TIME ZONE ${TZ}), 'YYYY-MM') AS m, COALESCE(SUM(mr.cost), 0)::float AS total
      FROM "MaintenanceRecord" mr JOIN "Asset" a ON a.id = mr."assetId"
      WHERE mr."serviceDate" >= ${yearAgo} AND mr.status <> 'CANCELLED' AND ${deptSql(user)}
      GROUP BY 1`,
    prisma.$queryRaw<{ m: string; total: number }[]>`
      SELECT to_char(date_trunc('month', a."purchaseDate" AT TIME ZONE ${TZ}), 'YYYY-MM') AS m, COALESCE(SUM(a."purchaseCost"), 0)::float AS total
      FROM "Asset" a WHERE a."purchaseDate" >= ${yearAgo} AND ${deptSql(user)}
      GROUP BY 1`,
    prisma.$queryRaw<{ m: string; n: number }[]>`
      SELECT to_char(date_trunc('month', h."createdAt" AT TIME ZONE ${TZ}), 'YYYY-MM') AS m, COUNT(*)::int AS n
      FROM "AssetHistory" h JOIN "Asset" a ON a.id = h."assetId"
      WHERE h."createdAt" >= ${yearAgo} AND ${deptSql(user)}
      GROUP BY 1`,
    prisma.$queryRaw<{ m: string; n: number }[]>`
      SELECT to_char(date_trunc('month', a."warrantyEnd" AT TIME ZONE ${TZ}), 'YYYY-MM') AS m, COUNT(*)::int AS n
      FROM "Asset" a
      WHERE a."warrantyEnd" >= ${now} AND a."warrantyEnd" < ${sixMonths} AND a.status <> 'RETIRED' AND ${deptSql(user)}
      GROUP BY 1`,
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, address: true }, orderBy: { name: "asc" } }),
    prisma.maintenanceRecord.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, expectedCompletion: { lt: now }, asset: scope } }),
  ]);

  const [categories, departments] = await Promise.all([
    prisma.assetCategory.findMany({ where: { id: { in: byCategory.map((c) => c.categoryId) } }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: byDepartment.map((d) => d.departmentId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
  ]);

  const count = (s: AssetStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((n, r) => n + r._count._all, 0);
  const trend = (status?: AssetStatus) => {
    const buckets = Array.from({ length: WEEKS }, () => 0);
    for (const h of trendRows) {
      if (status && h.toStatus !== status) continue;
      const i = WEEKS - 1 - Math.floor((now.getTime() - h.createdAt.getTime()) / WEEK);
      if (i >= 0 && i < WEEKS) buckets[i]++;
    }
    return buckets;
  };
  const months = lastMonths(MONTHS);
  const series = <T extends { m: string }>(rows: T[], pick: (r: T) => number, ms = months) => ms.map((m) => ({ label: m.label, full: m.full, value: pick(rows.find((r) => r.m === m.key) ?? ({} as T)) || 0 }));

  // "Where your assets are": per-location status breakdown (stacked bar) + stats.
  const locCards = locations
    .map((l) => {
      const rows = locationAssets.filter((r) => r.locationId === l.id);
      const total = rows.reduce((n, r) => n + r._count._all, 0);
      const inUse = rows.find((r) => r.status === "ASSIGNED")?._count._all ?? 0;
      return {
        ...l,
        total,
        inUse,
        inUsePct: total ? Math.round((inUse / total) * 100) : 0,
        value: rows.reduce((s, r) => s + Number(r._sum.purchaseCost ?? 0), 0),
        statuses: STATUS_ORDER.map((status) => ({ status, count: rows.find((r) => r.status === status)?._count._all ?? 0 })).filter((s) => s.count),
      };
    })
    .filter((l) => l.total);

  return {
    total,
    counts: {
      available: count("AVAILABLE"),
      reserved: count("RESERVED"),
      assigned: count("ASSIGNED"),
      maintenance: count("UNDER_MAINTENANCE"),
      damaged: count("DAMAGED"),
      lost: count("LOST"),
      retired: count("RETIRED"),
      returned: count("RETURNED"),
    },
    breakdown: {
      status: byStatus
        .map((r) => ({ label: STATUS_LABELS[r.status], filter: "", total: r._count._all, statuses: [{ status: r.status, count: r._count._all }] }))
        .sort((a, b) => b.total - a.total),
      category: breakdown(byCategory, (r) => r.categoryId, new Map(categories.map((c) => [c.id, c.name])), "category"),
      department: breakdown(byDepartment, (r) => r.departmentId, new Map(departments.map((d) => [d.id, d.name])), "department"),
      location: breakdown(locationAssets, (r) => r.locationId, new Map(locations.map((l) => [l.id, l.name])), "location"),
    } satisfies Record<string, BreakdownGroup[]>,
    warrantySoon,
    nextWarranty,
    pendingHandovers,
    pendingRequests,
    openIssues,
    lateMaintenance,
    activeValue: Number(value._sum.purchaseCost ?? 0),
    activeCount: value._count._all,
    trends: { total: trend(), available: trend("AVAILABLE"), assigned: trend("ASSIGNED"), maintenance: trend("UNDER_MAINTENANCE") },
    today: todayEvents,
    locations: locCards,
    maintenanceByMonth: series(maintenanceByMonth, (r) => r.total),
    purchasesByMonth: series(purchasesByMonth, (r) => r.total),
    transactionsByMonth: series(transactionsByMonth, (r) => r.n),
    warrantyByMonth: series(warrantyByMonth, (r) => r.n, lastMonths(6, true)),
  };
}

export type StaffDashboard = Awaited<ReturnType<typeof getStaffDashboard>>;

/** "Needs your action" list for managers/admins. */
export async function getActionItems(user: CurrentUser) {
  const scope = managedAssetScope(user);
  const [returns, toInspect, critical, transfers, requests, disputed] = await Promise.all([
    prisma.assetReturn.findMany({ where: { status: "REQUESTED", asset: scope }, take: 5, orderBy: { requestedAt: "asc" }, include: { asset: { select: { name: true } }, returnedBy: { select: { name: true } } } }),
    prisma.assetReturn.findMany({ where: { status: "RECEIVED", asset: scope }, take: 5, include: { asset: { select: { name: true } }, returnedBy: { select: { name: true } } } }),
    prisma.assetIssue.findMany({
      where: { severity: { in: ["CRITICAL", "HIGH"] }, status: { in: ["REPORTED", "UNDER_REVIEW"] }, asset: scope },
      take: 5,
      include: { asset: { select: { assetTag: true } }, reportedBy: { select: { name: true } } },
    }),
    prisma.assetTransfer.findMany({ where: { status: "REQUESTED", asset: scope }, take: 5, include: { asset: { select: { name: true } }, toEmployee: { select: { name: true } }, requestedBy: { select: { name: true } } } }),
    prisma.employeeRequest.findMany({
      where: { AND: [requestScope(user), { status: "PENDING", type: { in: ["NEW_ASSET", "REPLACEMENT"] } }] },
      take: 5,
      include: { employee: { select: { name: true } } },
    }),
    prisma.assignment.findMany({ where: { isActive: true, handoverStatus: "DISPUTED", asset: scope }, take: 5, include: { asset: { select: { id: true, name: true } }, employee: { select: { name: true } } } }),
  ]);
  type Item = { tag: string; bg: string; fg: string; title: string; sub: string; cta: string; href: string };
  const items: Item[] = [
    ...returns.map((r) => ({ tag: "RET", bg: "#E3EBF7", fg: "#1F4E95", title: `Receive ${r.asset.name}`, sub: `Return requested by ${r.returnedBy.name}`, cta: "Receive", href: `/returns/${r.id}/receive` })),
    ...toInspect.map((r) => ({ tag: "INS", bg: "#EDE7F6", fg: "#4C2A85", title: `Inspect ${r.asset.name}`, sub: `Returned by ${r.returnedBy.name} · blocks reassignment`, cta: "Inspect", href: `/returns/${r.id}/inspect` })),
    ...critical.map((i) => ({ tag: "!", bg: "#F8DDD2", fg: "#8E2A12", title: i.title, sub: `${i.severity === "CRITICAL" ? "Critical" : "High"} · ${i.reportedBy.name} · ${i.asset.assetTag}`, cta: "Review", href: "/issues" })),
    ...disputed.map((g) => ({ tag: "DSP", bg: "#F8DDD2", fg: "#8E2A12", title: `Disputed handover · ${g.asset.name}`, sub: g.employee.name, cta: "Review", href: `/assets/${g.asset.id}` })),
    ...transfers.map((t) => ({ tag: "TRF", bg: "#EDE7F6", fg: "#4C2A85", title: `${t.asset.name} → ${t.toEmployee.name}`, sub: `Transfer requested by ${t.requestedBy.name}`, cta: "Decide", href: `/transfers?t=${t.id}` })),
    ...requests.map((r) => ({ tag: "REQ", bg: "#DCEFE2", fg: "#1F5C3A", title: r.title, sub: `${r.type === "NEW_ASSET" ? "New asset" : "Replacement"} · ${r.employee.name}`, cta: "Open", href: `/requests?r=${r.id}` })),
  ];
  return items;
}

/** Employee home numbers. */
export async function getEmployeeSummary(userId: string, employeeId: string | null) {
  const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 });
  if (!employeeId) return { held: 0, pending: [], inRepair: 0, openRequests: 0, openIssues: 0, assets: [], requests: [], notifications };
  const [assignments, openRequests, openIssues, requests] = await Promise.all([
    prisma.assignment.findMany({
      where: { employeeId, isActive: true },
      select: {
        id: true,
        handoverStatus: true,
        accessories: true,
        assignedAt: true,
        asset: { select: { id: true, name: true, assetTag: true, status: true, category: { select: { name: true, code: true } } } },
      },
      orderBy: { assignedAt: "desc" },
    }),
    prisma.employeeRequest.count({ where: { employeeId, status: { in: ["PENDING", "IN_PROGRESS", "APPROVED"] } } }),
    prisma.assetIssue.count({ where: { reportedById: employeeId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.employeeRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, requestNo: true, title: true, status: true, managerRemarks: true } }),
  ]);
  return {
    held: assignments.length,
    pending: assignments.filter((a) => a.handoverStatus === "PENDING"),
    inRepair: assignments.filter((a) => a.asset.status === "UNDER_MAINTENANCE").length,
    openRequests,
    openIssues,
    assets: assignments,
    requests,
    notifications,
  };
}
