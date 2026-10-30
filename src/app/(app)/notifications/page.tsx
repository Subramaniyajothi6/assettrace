import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/list/Pagination";
import { homeFor } from "@/components/shell/nav";
import { paging, param, type SearchParams } from "@/lib/list";
import { MarkAllRead, NotificationRow } from "./NotificationRow";
import { TabIndicator } from "@/components/motion/TabIndicator";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const unreadOnly = param(sp, "tab") === "unread";
  const { page, skip, take, size } = paging(sp, 20);
  const where = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const groups: [string, typeof items][] = [
    ["TODAY", items.filter((n) => n.createdAt >= startOfToday)],
    ["EARLIER", items.filter((n) => n.createdAt < startOfToday)],
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: homeFor(user.role) }, { label: "Notifications" }]}
        title="Notifications"
        actions={
          <>
            <nav className="tabs" aria-label="Filter notifications">
              <TabIndicator />
              <Link href="/notifications" aria-current={!unreadOnly ? "page" : undefined}>
                All
              </Link>
              <Link href="/notifications?tab=unread" aria-current={unreadOnly ? "page" : undefined}>
                Unread{unread ? ` · ${unread}` : ""}
              </Link>
            </nav>
            {unread ? <MarkAllRead /> : null}
          </>
        }
      />
      <section className="card rise" style={{ padding: 12, maxWidth: 980, width: "100%" }}>
        {items.length ? (
          groups.map(([label, list]) =>
            list.length ? (
              <div key={label}>
                <h2 className="muted" style={{ margin: "12px 14px 6px", fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>
                  {label}
                </h2>
                {list.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </div>
            ) : null,
          )
        ) : (
          <div className="empty">
            <Bell size={30} />
            <b>You&apos;re all caught up</b>
          </div>
        )}
        <Pagination basePath="/notifications" sp={sp} page={page} size={size} total={total} />
      </section>
    </>
  );
}
