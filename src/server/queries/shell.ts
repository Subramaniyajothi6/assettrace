import "server-only";
import { prisma } from "../db";
import { managedAssetScope, requestScope, type CurrentUser } from "../permissions";
import type { BadgeKey } from "@/components/shell/nav";

/** Count badges for the top nav, scoped to what the user can see (mirrors prototype `counts()`). */
export async function getNavBadges(user: CurrentUser): Promise<Partial<Record<BadgeKey, number>>> {
  if (user.role === "EMPLOYEE") {
    const myAssets = user.employeeId
      ? await prisma.assignment.count({
          where: { employeeId: user.employeeId, isActive: true, handoverStatus: "PENDING" },
        })
      : 0;
    return { myAssets };
  }

  const asset = managedAssetScope(user);
  const [assignments, transfers, requests, maintenance, returns] = await Promise.all([
    prisma.assignment.count({ where: { isActive: true, handoverStatus: { not: "CONFIRMED" }, asset } }),
    prisma.assetTransfer.count({ where: { status: "REQUESTED", asset } }),
    prisma.employeeRequest.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, ...requestScope(user) } }),
    prisma.maintenanceRecord.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, asset } }),
    prisma.assetReturn.count({ where: { status: { in: ["REQUESTED", "RECEIVED"] }, asset } }),
  ]);
  return { assignments, transfers, requests, maintenance, returns };
}

export function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/** Subtitle under the brand: "Adz4needz · IT, Engineering" etc. */
export async function getScopeLabel(user: CurrentUser, orgName: string): Promise<string> {
  if (user.role === "ADMIN") return `${orgName} · all departments`;
  if (user.role === "MANAGER") {
    const depts = await prisma.department.findMany({
      where: { id: { in: user.managedDepartmentIds } },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return `${orgName} · ${depts.map((d) => d.name).join(", ") || "no departments"}`;
  }
  if (!user.employeeId) return orgName;
  const emp = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    select: { department: { select: { name: true } } },
  });
  return emp ? `${orgName} · ${emp.department.name}` : orgName;
}
