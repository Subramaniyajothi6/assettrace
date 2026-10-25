import Link from "next/link";
import type { HistoryEvent, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { DateRange } from "@/components/list/DateRange";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { HISTORY_EVENT_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";

export const metadata = { title: "Activity" };

/** Every recorded transaction across assets ("View all transactions"), scoped like everything else. */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const event = param(sp, "event") as HistoryEvent | undefined;
  const from = param(sp, "from");
  const to = param(sp, "to");
  const { page, skip, take, size } = paging(sp, 25);
  const where: Prisma.AssetHistoryWhereInput = {
    AND: [
      { asset: managedAssetScope(user) },
      event ? { event } : {},
      from ? { createdAt: { gte: new Date(`${from}T00:00:00`) } } : {},
      to ? { createdAt: { lte: new Date(`${to}T23:59:59.999`) } } : {},
      q ? { OR: [{ description: ilike(q) }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }, { actor: { name: ilike(q) } }] } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.assetHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { asset: { select: { id: true, name: true, assetTag: true } }, actor: { select: { name: true } } },
    }),
    prisma.assetHistory.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Activity" }]}
        title="All activity"
        actions={<span className="muted">{user.role === "ADMIN" ? "Every transaction, all departments" : "Every transaction in your departments"}</span>}
      />
      <ListToolbar
        placeholder="Asset, description or person"
        filters={[{ key: "event", label: "Event", options: Object.entries(HISTORY_EVENT_LABELS).map(([value, label]) => ({ value, label })) }]}
      >
        <DateRange label="Date" />
      </ListToolbar>
      <TableCard
        head={
          <>
            <th>When</th>
            <th>Event</th>
            <th>Asset</th>
            <th>Details</th>
            <th>Status</th>
            <th>By</th>
          </>
        }
        empty={{ title: "No activity", text: "Nothing matches these filters." }}
        rows={rows.map((h, i) => (
          <tr key={h.id} style={{ animationDelay: `${Math.min(i * 25, 500)}ms` }}>
            <td style={{ whiteSpace: "nowrap", color: "var(--at-soft)" }}>{formatDateTime(h.createdAt)}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <b>{HISTORY_EVENT_LABELS[h.event]}</b>
            </td>
            <td>
              <Link className="cell" href={`/assets/${h.asset.id}`}>
                <span>{h.asset.name}</span>
                <span className="tag">{h.asset.assetTag}</span>
              </Link>
            </td>
            <td style={{ color: "var(--at-soft)", maxWidth: 420 }}>{h.description}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              {h.toStatus && h.fromStatus !== h.toStatus ? (
                <span className="gap8" style={{ flexWrap: "nowrap" }}>
                  {h.fromStatus ? <StatusBadge status={h.fromStatus} /> : null}
                  {h.fromStatus ? <span className="muted">→</span> : null}
                  <StatusBadge status={h.toStatus} />
                </span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td className="muted" style={{ whiteSpace: "nowrap" }}>
              {h.actor.name}
            </td>
          </tr>
        ))}
        footer={<Pagination basePath="/activity" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
