import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Timeline } from "@/components/Timeline";
import { param, type SearchParams } from "@/lib/list";
import { TabIndicator } from "@/components/motion/TabIndicator";

export const metadata = { title: "My asset history" };

const monthFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" });

/**
 * Timeline of assets the employee holds or held, limited to their own holding periods
 * (ARCHITECTURE.md §3: other holders' history stays private).
 */
export default async function MyHistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const cat = param(sp, "category");
  const periods = user.employeeId
    ? await prisma.assignment.findMany({
        where: { employeeId: user.employeeId },
        select: { assetId: true, assignedAt: true, endedAt: true, isActive: true, asset: { select: { categoryId: true, category: { select: { name: true } } } } },
      })
    : [];

  const windows: Prisma.AssetHistoryWhereInput[] = periods
    .filter((p) => !cat || p.asset.categoryId === cat)
    .map((p) => {
      const from = new Date(p.assignedAt);
      from.setHours(0, 0, 0, 0);
      return { assetId: p.assetId, createdAt: { gte: from, ...(p.isActive ? {} : { lte: p.endedAt ?? new Date() }) } };
    });
  const rows = windows.length
    ? await prisma.assetHistory.findMany({
        where: { OR: windows },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { actor: { select: { name: true } }, asset: { select: { name: true, assetTag: true } } },
      })
    : [];

  const cats = [...new Map(periods.map((p) => [p.asset.categoryId, p.asset.category.name])).entries()];
  const groups: [string, typeof rows][] = [];
  for (const h of rows) {
    const k = monthFmt.format(h.createdAt).toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last[0] === k) last[1].push(h);
    else groups.push([k, [h]]);
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/home" }, { label: "History" }]}
        title="My asset history"
        actions={
          cats.length > 1 ? (
            <nav className="tabs" aria-label="Filter by category">
              <TabIndicator />
              <Link href="/my-history" aria-current={!cat ? "page" : undefined}>
                All assets
              </Link>
              {cats.map(([id, name]) => (
                <Link key={id} href={`/my-history?category=${id}`} aria-current={cat === id ? "page" : undefined}>
                  {name}
                </Link>
              ))}
            </nav>
          ) : null
        }
      />
      <p className="muted rise" style={{ margin: 0 }}>
        Only the time each asset was with you is shown here. Other holders&apos; history is private.
      </p>
      <section className="card rise" style={{ animationDelay: "80ms", padding: "8px 0" }}>
        {groups.length ? (
          groups.map(([month, items]) => (
            <div key={month}>
              <h2 className="muted" style={{ margin: "16px 26px 0", fontSize: 13, letterSpacing: ".08em" }}>
                {month}
              </h2>
              <Timeline
                items={items.map((h) => ({
                  ...h,
                  context: (
                    <span style={{ fontSize: 14, color: "var(--at-soft)" }}>
                      {h.asset.name} <span className="tag">{h.asset.assetTag}</span>
                    </span>
                  ),
                }))}
              />
            </div>
          ))
        ) : (
          <div className="empty">
            <b>No history yet</b>
          </div>
        )}
      </section>
    </>
  );
}
