import Link from "next/link";
import type { Prisma, RequestType } from "@prisma/client";
import { prisma } from "@/server/db";
import { requestScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { UpdateRequestForm } from "./UpdateRequestForm";

export const metadata = { title: "Requests" };

const TY: Record<RequestType, [string, string, string]> = {
  ISSUE: ["ISS", "#F8DDD2", "#8E2A12"],
  REPLACEMENT: ["REP", "#FBEBD2", "#7A4505"],
  RETURN: ["RET", "#DDE6F4", "#1F4E95"],
  NEW_ASSET: ["NEW", "#DCEFE2", "#1F5C3A"],
};
const PC = { URGENT: "#B4232F", HIGH: "#B4232F", MEDIUM: "#8A4D06", LOW: "var(--at-muted)" } as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const type = param(sp, "type") as RequestType | undefined;
  const status = param(sp, "status");
  const priority = param(sp, "priority");
  const { page, skip, take, size } = paging(sp, 10);
  const scope = requestScope(user);
  const where: Prisma.EmployeeRequestWhereInput = {
    AND: [
      scope,
      type ? { type } : {},
      status === "open" ? { status: { in: ["PENDING", "IN_PROGRESS", "APPROVED"] } } : status ? { status: status as Prisma.EnumRequestStatusFilter["equals"] } : {},
      priority ? { priority: priority as Prisma.EnumPriorityFilter["equals"] } : {},
      q ? { OR: [{ requestNo: ilike(q) }, { title: ilike(q) }, { employee: { name: ilike(q) } }, { asset: { assetTag: ilike(q) } }] } : {},
    ],
  };
  const include = {
    employee: { select: { name: true, department: { select: { name: true } } } },
    asset: { select: { id: true, assetTag: true, name: true } },
    issue: { select: { id: true, issueNo: true, status: true } },
    assetReturn: { select: { id: true, returnNo: true, status: true } },
  } satisfies Prisma.EmployeeRequestInclude;
  const [list, total, byType] = await Promise.all([
    prisma.employeeRequest.findMany({ where, include, orderBy: [{ createdAt: "desc" }], skip, take }),
    prisma.employeeRequest.count({ where }),
    prisma.employeeRequest.groupBy({ by: ["type"], where: scope, _count: { _all: true } }),
  ]);
  const picked = param(sp, "r");
  const cur = (picked ? (list.find((r) => r.id === picked) ?? (await prisma.employeeRequest.findFirst({ where: { AND: [scope, { id: picked }] }, include }))) : null) ?? list[0] ?? null;
  const pick = (id: string) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "r") s.set(k, v);
    s.set("r", id);
    return `/requests?${s.toString()}`;
  };
  const next = cur
    ? cur.type === "RETURN" && cur.assetReturn?.status === "REQUESTED"
      ? (["Receive return", `/returns/${cur.assetReturn.id}/receive`] as const)
      : cur.type === "ISSUE"
        ? (["Open issue board", "/issues"] as const)
        : cur.type === "NEW_ASSET" && cur.status !== "COMPLETED"
          ? (["Assign an asset", "/assignments/new"] as const)
          : cur.asset
            ? (["Open asset", `/assets/${cur.asset.id}`] as const)
            : null
    : null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Requests" }]}
        title="Employee requests"
        actions={
          <Link className="btn" href="/issues">
            Issues
          </Link>
        }
      />
      <ListToolbar
        placeholder="Request no., title, employee or asset"
        filters={[
          { key: "type", label: "Type", options: (Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => ({ value: t, label: `${REQUEST_TYPE_LABELS[t]} · ${byType.find((b) => b.type === t)?._count._all ?? 0}` })) },
          { key: "status", label: "Status", options: [{ value: "open", label: "Open" }, ...Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({ value, label }))] },
          { key: "priority", label: "Priority", options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <div className="row">
        <section className="card main-col rise" style={{ padding: 10, animationDelay: "60ms" }}>
          {list.length ? (
            list.map((r, i) => {
              const t = TY[r.type];
              return (
                <Link
                  key={r.id}
                  href={pick(r.id)}
                  scroll={false}
                  className="li"
                  style={{ background: cur?.id === r.id ? "var(--at-chip)" : "transparent", animation: "rise .5s both", animationDelay: `${i * 40}ms` }}
                >
                  <span className="ico" style={{ background: t[1], color: t[2], fontSize: 11, fontWeight: 800 }}>
                    {t[0]}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <b style={{ fontSize: 16 }}>{r.title}</b>
                      <small style={{ fontWeight: 700, color: PC[r.priority] }}>{PRIORITY_LABELS[r.priority]}</small>
                    </span>
                    <small className="muted">
                      {r.requestNo} · {r.employee.name} · {formatDate(r.createdAt)}
                    </small>
                  </span>
                  <StatusBadge status={r.status} label={REQUEST_STATUS_LABELS[r.status]} />
                </Link>
              );
            })
          ) : (
            <div className="empty">
              <b>No requests</b>
              <span>Nothing matches these filters.</span>
            </div>
          )}
          <Pagination basePath="/requests" sp={sp} page={page} size={size} total={total} />
        </section>

        {cur ? (
          <aside className="card pad side rise" style={{ animationDelay: "120ms", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="tag">{cur.requestNo}</span>
              <StatusBadge status={cur.status} label={REQUEST_STATUS_LABELS[cur.status]} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{cur.title}</h2>
            <dl className="kv" style={{ gridTemplateColumns: "100px 1fr", fontSize: 14 }}>
              <dt>Employee</dt>
              <dd>
                {cur.employee.name} · {cur.employee.department.name}
              </dd>
              <dt>Type</dt>
              <dd>{REQUEST_TYPE_LABELS[cur.type]}</dd>
              <dt>Asset</dt>
              <dd>{cur.asset ? <Link href={`/assets/${cur.asset.id}`}>{cur.asset.assetTag}</Link> : "—"}</dd>
              <dt>Priority</dt>
              <dd style={{ color: PC[cur.priority] }}>{PRIORITY_LABELS[cur.priority]}</dd>
              {cur.issue ? (
                <>
                  <dt>Issue</dt>
                  <dd>
                    {cur.issue.issueNo} · <StatusBadge status={cur.issue.status} />
                  </dd>
                </>
              ) : null}
              {cur.assetReturn ? (
                <>
                  <dt>Return</dt>
                  <dd>
                    {cur.assetReturn.returnNo} · <StatusBadge status={cur.assetReturn.status} />
                  </dd>
                </>
              ) : null}
            </dl>
            <p style={{ margin: 0, padding: 14, borderRadius: "var(--at-r2)", background: "var(--at-chip)", fontSize: 15, color: "var(--at-soft)" }}>“{cur.description}”</p>
            {cur.status === "CANCELLED" ? (
              <div className="banner info">
                <span>The employee cancelled this request.</span>
              </div>
            ) : (
              <UpdateRequestForm id={cur.id} status={cur.status} remarks={cur.managerRemarks ?? ""} next={next ? { label: next[0], href: next[1] } : null} />
            )}
          </aside>
        ) : null}
      </div>
    </>
  );
}
