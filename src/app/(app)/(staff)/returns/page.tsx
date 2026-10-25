import Link from "next/link";
import type { Prisma, ReturnStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { formatDate } from "@/lib/format";
import { INSPECTION_RESULT_LABELS, RETURN_STATUS_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { StartReturn } from "./StartReturn";

export const metadata = { title: "Returns" };

const TABS: { key: string; label: string; status?: ReturnStatus }[] = [
  { key: "requested", label: "Requested", status: "REQUESTED" },
  { key: "received", label: "Received", status: "RECEIVED" },
  { key: "inspected", label: "Inspected", status: "INSPECTED" },
  { key: "all", label: "All" },
];

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp, "tab")) ?? TABS[0];
  const q = param(sp, "q");
  const { page, skip, take, size } = paging(sp, 12);
  const scope: Prisma.AssetReturnWhereInput = { asset: managedAssetScope(user) };
  const where: Prisma.AssetReturnWhereInput = {
    AND: [
      scope,
      tab.status ? { status: tab.status } : {},
      q ? { OR: [{ returnNo: ilike(q) }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }, { returnedBy: { name: ilike(q) } }] } : {},
    ],
  };
  const [list, total, counts, assigned] = await Promise.all([
    prisma.assetReturn.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip,
      take,
      include: { asset: { select: { id: true, name: true, assetTag: true } }, returnedBy: { select: { name: true } }, inspection: { select: { result: true } } },
    }),
    prisma.assetReturn.count({ where }),
    prisma.assetReturn.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.asset.findMany({
      where: { AND: [managedAssetScope(user), { status: "ASSIGNED" }, { returns: { none: { status: { in: ["REQUESTED", "RECEIVED"] } } } }] },
      select: { id: true, assetTag: true, name: true, currentHolder: { select: { name: true } } },
      orderBy: { assetTag: "asc" },
    }),
  ]);
  const n = (s: ReturnStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Returns" }]}
        title="Returns"
        actions={
          <>
            <nav className="tabs" aria-label="Return views">
              {TABS.map((t) => (
                <Link key={t.key} href={t.key === "requested" ? "/returns" : `/returns?tab=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>
                  {t.label}
                  {t.status ? ` · ${n(t.status)}` : ""}
                </Link>
              ))}
            </nav>
            <Link className="btn" href="/inspections">
              Inspections
            </Link>
            <StartReturn assets={assigned.map((a) => ({ value: a.id, label: `${a.assetTag} · ${a.name} · ${a.currentHolder?.name ?? ""}` }))} />
          </>
        }
      />
      <ol className="card pad-s rise" style={{ listStyle: "none", margin: 0, display: "flex", flexWrap: "wrap", gap: "10px 26px", fontSize: 14, color: "var(--at-soft)" }}>
        <li>
          <b style={{ color: "var(--at-ink)" }}>1 · Requested</b> by the employee or you
        </li>
        <li>
          <b style={{ color: "var(--at-ink)" }}>2 · Received</b> asset checked in, assignment closed
        </li>
        <li>
          <b style={{ color: "var(--at-ink)" }}>3 · Inspected</b> required before it can be assigned again
        </li>
      </ol>
      <ListToolbar placeholder="Return no., asset or employee" />
      {list.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
          {list.map((r, i) => {
            const cta =
              r.status === "REQUESTED"
                ? (["Receive", `/returns/${r.id}/receive`] as const)
                : r.status === "RECEIVED"
                  ? (["Inspect", `/returns/${r.id}/inspect`] as const)
                  : (["View asset", `/assets/${r.asset.id}?tab=returns`] as const);
            return (
              <article key={r.id} className="card pad lift rise" style={{ animationDelay: `${80 + i * 60}ms`, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="tag">{r.returnNo}</span>
                  <StatusBadge
                    status={r.status}
                    label={r.inspection ? `Result: ${INSPECTION_RESULT_LABELS[r.inspection.result].split(" — ")[0]}` : RETURN_STATUS_LABELS[r.status]}
                  />
                </div>
                <div>
                  <b style={{ fontSize: 18 }}>{r.asset.name}</b>
                  <br />
                  <span className="tag" style={{ color: "var(--at-muted)" }}>
                    {r.asset.assetTag}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Initials name={r.returnedBy.name} small />
                  <span>
                    <b>{r.returnedBy.name}</b>
                    <br />
                    <small className="muted">{r.status === "REQUESTED" ? `Requested ${formatDate(r.requestedAt)}` : `Received ${formatDate(r.receivedAt)}`}</small>
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--at-soft)" }}>
                  {[r.reason, r.missingAccessories.length ? `Missing: ${r.missingAccessories.join(", ")}` : null, r.damage].filter(Boolean).join(" · ")}
                </p>
                <div className="gap8">
                  {r.status === "REQUESTED" || r.status === "RECEIVED" || r.status === "INSPECTED" ? (
                    <Link className={r.status === "INSPECTED" ? "btn sm" : "btn pri sm"} href={cta[1]}>
                      {cta[0]}
                    </Link>
                  ) : null}
                  <Link className="btn sm" href={`/assets/${r.asset.id}`}>
                    Asset history
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card pad empty">
          <b>No returns here</b>
          <span>Returns appear when an employee or you request one.</span>
        </div>
      )}
      <div className="card" style={{ overflow: "hidden" }}>
        <Pagination basePath="/returns" sp={sp} page={page} size={size} total={total} />
      </div>
    </>
  );
}
