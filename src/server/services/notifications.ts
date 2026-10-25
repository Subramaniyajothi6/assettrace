import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { managedAssetScope, requireUser, type CurrentUser } from "../permissions";
import { getSettings } from "../settings";

/** Bell data: unread count and the latest 10. */
export async function bellData() {
  const user = await requireUser();
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, title: true, message: true, link: true, isRead: true, createdAt: true },
    }),
  ]);
  return { unread, items };
}

/** Mark one notification read (only the owner can). Returns where it points. */
export async function markNotificationRead(id: string) {
  const user = await requireUser();
  const n = await prisma.notification.findFirst({ where: { id, userId: user.id }, select: { id: true, link: true } });
  if (!n) throw new NotFoundError("Notification");
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { link: n.link };
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const r = await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  return { count: r.count };
}

const DAY = 864e5;

/**
 * Warranty alerts (ARCHITECTURE.md §5 "Notifications"). Creates WARRANTY_EXPIRING notifications for
 * assets whose warranty ends within the configured window. Idempotent: an asset that already had an
 * alert in the last 30 days is skipped. Pass a user to limit to their scope (dashboard load);
 * omit for the daily job (all assets).
 */
export async function checkWarranties(user?: CurrentUser) {
  const { warrantyAlertDays } = await getSettings();
  const now = new Date();
  const scope: Prisma.AssetWhereInput = user ? managedAssetScope(user) : {};
  const assets = await prisma.asset.findMany({
    where: { AND: [scope, { status: { not: "RETIRED" } }, { warrantyEnd: { gte: now, lte: new Date(now.getTime() + warrantyAlertDays * DAY) } }] },
    select: { id: true, name: true, assetTag: true, warrantyEnd: true, departmentId: true },
  });
  if (!assets.length) return { created: 0 };

  const recent = await prisma.notification.findMany({
    where: { type: "WARRANTY_EXPIRING", createdAt: { gte: new Date(now.getTime() - 30 * DAY) }, link: { in: assets.map((a) => `/assets/${a.id}`) } },
    select: { link: true },
    distinct: ["link"],
  });
  const done = new Set(recent.map((r) => r.link));
  const due = assets.filter((a) => !done.has(`/assets/${a.id}`));
  if (!due.length) return { created: 0 };

  const [admins, managers] = await Promise.all([
    prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } }),
    prisma.user.findMany({
      where: { role: "MANAGER", isActive: true },
      select: { id: true, managedDepartments: { where: { isActive: true }, select: { id: true } } },
    }),
  ]);
  const data: Prisma.NotificationCreateManyInput[] = [];
  for (const a of due) {
    const days = Math.max(0, Math.ceil((a.warrantyEnd!.getTime() - now.getTime()) / DAY));
    const recipients = new Set([
      ...admins.map((u) => u.id),
      ...managers.filter((m) => a.departmentId && m.managedDepartments.some((d) => d.id === a.departmentId)).map((m) => m.id),
    ]);
    for (const userId of recipients) {
      data.push({
        userId,
        type: "WARRANTY_EXPIRING",
        title: days === 0 ? "Warranty ends today" : `Warranty ends in ${days} day${days === 1 ? "" : "s"}`,
        message: `${a.name} · ${a.assetTag}`,
        link: `/assets/${a.id}`,
      });
    }
  }
  await prisma.notification.createMany({ data });
  return { created: data.length, assets: due.length };
}
