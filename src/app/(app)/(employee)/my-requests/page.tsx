import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";
import { param, type SearchParams } from "@/lib/list";
import { CancelRequest, NewRequestForm } from "./NewRequestForm";

export const metadata = { title: "My requests" };

const STEPS = ["Sent", "Under review", "In progress", "Done"];
const STEP = { PENDING: 1, APPROVED: 2, IN_PROGRESS: 3, COMPLETED: 4, REJECTED: 4, CANCELLED: 4 } as const;

export default async function MyRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [requests, assets] = user.employeeId
    ? await Promise.all([
        prisma.employeeRequest.findMany({
          where: { employeeId: user.employeeId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { asset: { select: { assetTag: true } }, handledBy: { select: { name: true } }, issue: { select: { issueNo: true, status: true } } },
        }),
        prisma.asset.findMany({ where: { currentHolderId: user.employeeId }, select: { id: true, name: true, assetTag: true }, orderBy: { name: "asc" } }),
      ])
    : [[], []];

  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/home" }, { label: "My requests" }]} title="My requests" />
      <div className="row">
        <div className="main-col stack" style={{ gap: 14 }}>
          {requests.length ? (
            requests.map((r, i) => {
              const k = STEP[r.status];
              const bad = r.status === "REJECTED" || r.status === "CANCELLED";
              return (
                <article key={r.id} className="card pad rise" style={{ animationDelay: `${i * 60}ms`, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <span className="tag">
                        {r.requestNo} · {REQUEST_TYPE_LABELS[r.type]}
                        {r.asset ? ` · ${r.asset.assetTag}` : ""}
                        {r.issue ? ` · ${r.issue.issueNo}` : ""}
                      </span>
                      <br />
                      <b style={{ fontSize: 18 }}>{r.title}</b>
                    </div>
                    <StatusBadge status={r.status} label={REQUEST_STATUS_LABELS[r.status]} />
                  </div>
                  <ol aria-label="Progress" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
                    {STEPS.map((s, j) => {
                      const on = j < k;
                      return (
                        <li key={s} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: on ? "var(--at-ink)" : "var(--at-muted)" }}>
                          <span style={{ height: 6, borderRadius: 3, background: on ? (bad && j === k - 1 ? "#D2643E" : "var(--at-accent)") : "var(--at-line)" }} />
                          {j === 3 && bad ? REQUEST_STATUS_LABELS[r.status] : s}
                        </li>
                      );
                    })}
                  </ol>
                  {r.managerRemarks ? (
                    <div className="li" style={{ background: "var(--at-chip)" }}>
                      <Initials name={r.handledBy?.name ?? "Asset manager"} small />
                      <span style={{ fontSize: 14 }}>
                        <b>{r.handledBy?.name ?? "Asset manager"}:</b> {r.managerRemarks}
                      </span>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <small className="muted">Sent {formatDate(r.createdAt)}</small>
                    {r.status === "PENDING" ? <CancelRequest id={r.id} no={r.requestNo} /> : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card pad empty">
              <b>No requests yet</b>
              <span>Use the form to ask for something.</span>
            </div>
          )}
        </div>
        <NewRequestForm
          assets={assets.map((a) => ({ value: a.id, label: `${a.name} · ${a.assetTag}` }))}
          initialType={param(sp, "type")}
          initialAssetId={param(sp, "asset")}
          focus={param(sp, "new") === "1"}
        />
      </div>
    </>
  );
}
