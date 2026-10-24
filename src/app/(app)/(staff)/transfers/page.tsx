import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Prisma, TransferStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { TRANSFER_STATUS_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { ReviewForm, CancelTransfer } from "./ReviewForm";

export const metadata = { title: "Transfers" };

const TABS: { key: string; label: string; statuses?: TransferStatus[] }[] = [
  { key: "pending", label: "Pending review", statuses: ["REQUESTED"] },
  { key: "approved", label: "Approved & completed", statuses: ["APPROVED", "COMPLETED"] },
  { key: "rejected", label: "Rejected & cancelled", statuses: ["REJECTED", "CANCELLED"] },
  { key: "all", label: "All" },
];

export default async function TransfersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp, "tab")) ?? TABS[0];
  const q = param(sp, "q");
  const { page, skip, take, size } = paging(sp, 8);
  const where: Prisma.AssetTransferWhereInput = {
    AND: [
      // Managers see transfers out of or into their departments.
      user.role === "ADMIN"
        ? {}
        : { OR: [{ asset: managedAssetScope(user) }, { fromDepartmentId: { in: user.managedDepartmentIds } }, { toDepartmentId: { in: user.managedDepartmentIds } }] },
      tab.statuses ? { status: { in: tab.statuses } } : {},
      q
        ? {
            OR: [
              { transferNo: ilike(q) },
              { asset: { assetTag: ilike(q) } },
              { asset: { name: ilike(q) } },
              { fromEmployee: { name: ilike(q) } },
              { toEmployee: { name: ilike(q) } },
            ],
          }
        : {},
    ],
  };
  const include = {
    asset: { select: { id: true, name: true, assetTag: true, departmentId: true } },
    fromEmployee: { select: { name: true } },
    toEmployee: { select: { name: true } },
    fromDepartment: { select: { name: true } },
    toDepartment: { select: { name: true } },
    fromLocation: { select: { name: true } },
    toLocation: { select: { name: true } },
    requestedBy: { select: { id: true, name: true } },
    reviewedBy: { select: { name: true } },
  } satisfies Prisma.AssetTransferInclude;
  const [list, total] = await Promise.all([
    prisma.assetTransfer.findMany({ where, include, orderBy: { requestedAt: "desc" }, skip, take }),
    prisma.assetTransfer.count({ where }),
  ]);
  const picked = param(sp, "t");
  const cur = (picked ? (list.find((t) => t.id === picked) ?? (await prisma.assetTransfer.findFirst({ where: { AND: [where, { id: picked }] }, include }))) : null) ?? list[0] ?? null;
  const canReview = cur && (user.role === "ADMIN" || (!!cur.asset.departmentId && user.managedDepartmentIds.includes(cur.asset.departmentId)));
  const tabHref = (k: string) => (k === "pending" ? "/transfers" : `/transfers?tab=${k}`);
  const pickHref = (id: string) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "t") s.set(k, v);
    s.set("t", id);
    return `/transfers?${s.toString()}`;
  };
  const step = cur ? (cur.status === "COMPLETED" ? 4 : cur.status === "APPROVED" || cur.status === "REJECTED" ? 2 : cur.status === "CANCELLED" ? 1 : 1) : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Transfers" }]}
        title="Transfers"
        actions={
          <nav className="tabs" aria-label="Transfer views">
            {TABS.map((t) => (
              <Link key={t.key} href={tabHref(t.key)} aria-current={t.key === tab.key ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        }
      />
      <ListToolbar placeholder="Transfer no., asset or employee" />
      <div className="row">
        <div className="side stack" style={{ gap: 10 }}>
          {list.length ? (
            list.map((t, i) => (
              <Link
                key={t.id}
                href={pickHref(t.id)}
                scroll={false}
                className="card pick rise"
                aria-pressed={cur?.id === t.id}
                style={{ flexDirection: "column", alignItems: "stretch", gap: 6, borderRadius: "var(--at-r2)", animationDelay: `${i * 50}ms`, textDecoration: "none" }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="tag">{t.transferNo}</span>
                  <StatusBadge status={t.status} label={TRANSFER_STATUS_LABELS[t.status]} />
                </span>
                <b style={{ fontSize: 16 }}>{t.asset.name}</b>
                <span style={{ fontSize: 14, color: "var(--at-soft)" }}>
                  {t.fromEmployee?.name ?? "Store"} → {t.toEmployee.name}
                </span>
                <small className="muted">{formatDate(t.requestedAt)}</small>
              </Link>
            ))
          ) : (
            <div className="card pad empty">
              <b>No transfers here</b>
              <span>Transfers start from an asset&apos;s page.</span>
            </div>
          )}
          <div className="card" style={{ overflow: "hidden" }}>
            <Pagination basePath="/transfers" sp={sp} page={page} size={size} total={total} />
          </div>
        </div>

        {cur ? (
          <section className="card pad main-col rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <span className="tag">
                  {cur.transferNo} · {cur.asset.assetTag}
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 600 }}>
                  <Link href={`/assets/${cur.asset.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {cur.asset.name}
                  </Link>
                </h2>
              </div>
              <StatusBadge status={cur.status} label={TRANSFER_STATUS_LABELS[cur.status]} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 14, alignItems: "center" }}>
              <div className="card pad-s" style={{ background: "var(--at-chip)", boxShadow: "none" }}>
                <small className="muted">From</small>
                <br />
                <b style={{ fontSize: 17 }}>{cur.fromEmployee?.name ?? "Store"}</b>
                <br />
                <small className="muted">
                  {[cur.fromDepartment?.name, cur.fromLocation?.name].filter(Boolean).join(" · ")}
                </small>
              </div>
              <span className="iconbtn" style={{ background: "var(--at-on)", color: "var(--at-on-ink)" }}>
                <ArrowRight size={18} />
              </span>
              <div className="hero-blue pad-s">
                <small className="muted">To</small>
                <br />
                <b style={{ fontSize: 17 }}>{cur.toEmployee.name}</b>
                <br />
                <small className="muted">{[cur.toDepartment?.name, cur.toLocation?.name].filter(Boolean).join(" · ")}</small>
              </div>
            </div>
            <div>
              <span className="lbl">Reason</span>
              <p style={{ margin: "6px 0", fontSize: 15, color: "var(--at-soft)" }}>{cur.reason}</p>
              <small className="muted">
                Requested by {cur.requestedBy.name} · {formatDateTime(cur.requestedAt)}
              </small>
            </div>
            {cur.status === "REQUESTED" ? (
              canReview ? (
                <ReviewForm id={cur.id} fromName={cur.fromEmployee?.name ?? "the current holder"} toName={cur.toEmployee.name} canCancel={cur.requestedBy.id === user.id} />
              ) : (
                <div className="banner info">
                  <span>Waiting for a manager of the asset&apos;s department to review it.</span>
                  {cur.requestedBy.id === user.id ? <CancelTransfer id={cur.id} /> : null}
                </div>
              )
            ) : cur.reviewRemarks ? (
              <div className={`banner ${cur.status === "REJECTED" ? "bad" : "ok"}`}>
                <span>
                  <b>Remarks:</b> {cur.reviewRemarks}
                  {cur.reviewedBy ? ` · ${cur.reviewedBy.name}` : ""}
                </span>
              </div>
            ) : null}
            <ol style={{ listStyle: "none", margin: 0, padding: "14px 0 0", borderTop: "1px solid var(--at-line)", display: "flex", flexWrap: "wrap", gap: 16 }}>
              {["Requested", cur.status === "REJECTED" ? "Rejected" : cur.status === "CANCELLED" ? "Cancelled" : "Approved", "Handover signed", "Completed"].map((s, i) => {
                const ok = i < step;
                const bad = (cur.status === "REJECTED" && i === 1) || (cur.status === "CANCELLED" && i === 1);
                return (
                  <li key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: ok || bad ? "var(--at-ink)" : "var(--at-muted)" }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: bad ? "#F8DDD2" : ok ? "#DCEFE2" : "var(--at-chip)",
                        color: bad ? "#8E2A12" : ok ? "#1F5C3A" : "var(--at-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                      }}
                    >
                      {bad ? "✕" : ok ? "✓" : i + 1}
                    </span>
                    {s}
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </>
  );
}
