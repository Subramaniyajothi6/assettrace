import "server-only";
import type { AssetStatus } from "@prisma/client";
import { prisma } from "../db";
import { managedAssetScope, type CurrentUser } from "../permissions";

const WEEKS = 9;
const WEEK = 7 * 864e5;

/** Phase 1 dashboard numbers (full analytics come in Phase 10). All scoped to the manager's departments. */
export async function getStaffKpis(user: CurrentUser, warrantyDays: number) {
  const scope = managedAssetScope(user);
  const now = new Date();
  const soon = new Date(now.getTime() + warrantyDays * 864e5);
  const since = new Date(now.getTime() - WEEKS * WEEK);

  const [byStatus, warrantySoon, pendingHandovers, toInspect, history] = await Promise.all([
    prisma.asset.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.asset.count({ where: { ...scope, status: { not: "RETIRED" }, warrantyEnd: { gte: now, lte: soon } } }),
    prisma.assignment.count({ where: { isActive: true, handoverStatus: "PENDING", asset: scope } }),
    prisma.assetReturn.count({ where: { status: "RECEIVED", asset: scope } }),
    prisma.assetHistory.findMany({
      where: { createdAt: { gte: since }, toStatus: { not: null }, asset: scope },
      select: { toStatus: true, createdAt: true },
    }),
  ]);

  const count = (s: AssetStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((n, r) => n + r._count._all, 0);

  /** Weekly count of history moves into `status`, oldest first. */
  const trend = (status?: AssetStatus) => {
    const buckets = Array.from({ length: WEEKS }, () => 0);
    for (const h of history) {
      if (status && h.toStatus !== status) continue;
      const i = WEEKS - 1 - Math.floor((now.getTime() - h.createdAt.getTime()) / WEEK);
      if (i >= 0 && i < WEEKS) buckets[i]++;
    }
    return buckets;
  };

  return {
    total,
    available: count("AVAILABLE"),
    reserved: count("RESERVED"),
    assigned: count("ASSIGNED"),
    maintenance: count("UNDER_MAINTENANCE"),
    warrantySoon,
    pendingHandovers,
    toInspect,
    trends: {
      total: trend(),
      available: trend("AVAILABLE"),
      assigned: trend("ASSIGNED"),
      maintenance: trend("UNDER_MAINTENANCE"),
    },
  };
}

/** Employee home numbers. */
export async function getEmployeeSummary(employeeId: string | null) {
  if (!employeeId) return { held: 0, pending: [], inRepair: 0, openRequests: 0, openIssues: 0 };
  const [assignments, openRequests, openIssues] = await Promise.all([
    prisma.assignment.findMany({
      where: { employeeId, isActive: true },
      select: { id: true, handoverStatus: true, accessories: true, assignedAt: true, asset: { select: { name: true, status: true } } },
      orderBy: { assignedAt: "desc" },
    }),
    prisma.employeeRequest.count({ where: { employeeId, status: { in: ["PENDING", "IN_PROGRESS", "APPROVED"] } } }),
    prisma.assetIssue.count({ where: { reportedById: employeeId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
  ]);
  return {
    held: assignments.length,
    pending: assignments.filter((a) => a.handoverStatus === "PENDING"),
    inRepair: assignments.filter((a) => a.asset.status === "UNDER_MAINTENANCE").length,
    openRequests,
    openIssues,
  };
}
