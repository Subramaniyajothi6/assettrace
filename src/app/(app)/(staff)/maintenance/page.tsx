import Link from "next/link";
import type { MaintenanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { daysUntil } from "@/components/WarrantyCell";
import { formatDate, isoDayIST, rupee, rupeeShort } from "@/lib/format";
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_TYPE_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { RecordMaintenance } from "./RecordMaintenance";
import { MaintenanceRowActions } from "./RowActions";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const type = param(sp, "type");
  const only = param(sp, "m");
  const { page, skip, take, size } = paging(sp);
  const scope: Prisma.MaintenanceRecordWhereInput = { asset: managedAssetScope(user) };
  const where: Prisma.MaintenanceRecordWhereInput = {
    AND: [
      scope,
      only ? { id: only } : {},
      status === "open" ? { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } : status ? { status: status as MaintenanceStatus } : {},
      type ? { type: type as Prisma.EnumMaintenanceTypeFilter["equals"] } : {},
      q ? { OR: [{ maintenanceNo: ilike(q) }, { problem: ilike(q) }, { serviceProvider: ilike(q) }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }] } : {},
    ],
  };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const open = { AND: [scope, { status: { in: ["SCHEDULED", "IN_PROGRESS"] as MaintenanceStatus[] } }] };

  const [rows, total, openCounts, spentMonth, spentAll, late, pool] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      orderBy: [{ serviceDate: "desc" }],
      skip,
      take,
      include: { asset: { select: { id: true, name: true, assetTag: true, currentHolderId: true } }, issue: { select: { issueNo: true } } },
    }),
    prisma.maintenanceRecord.count({ where }),
    prisma.maintenanceRecord.groupBy({ by: ["status"], where: open, _count: { _all: true } }),
    prisma.maintenanceRecord.aggregate({ where: { AND: [scope, { serviceDate: { gte: monthStart } }, { status: { not: "CANCELLED" } }] }, _sum: { cost: true } }),
    prisma.maintenanceRecord.aggregate({ where: { AND: [scope, { status: { not: "CANCELLED" } }] }, _sum: { cost: true }, _count: { _all: true } }),
    prisma.maintenanceRecord.findMany({ where: { AND: [open, { expectedCompletion: { lt: now } }] }, select: { asset: { select: { name: true } } } }),
    prisma.asset.findMany({
      where: { AND: [managedAssetScope(user), { status: { in: ["AVAILABLE", "ASSIGNED", "DAMAGED", "UNDER_MAINTENANCE"] } }] },
      select: {
        id: true,
        assetTag: true,
        name: true,
        warrantyEnd: true,
        issues: { where: { status: { in: ["REPORTED", "UNDER_REVIEW"] } }, select: { id: true, issueNo: true, title: true } },
      },
      orderBy: { assetTag: "asc" },
    }),
  ]);
  const scheduled = openCounts.find((c) => c.status === "SCHEDULED")?._count._all ?? 0;
  const inProgress = openCounts.find((c) => c.status === "IN_PROGRESS")?._count._all ?? 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Maintenance" }]}
        title="Maintenance"
        actions={
          <>
            {only ? (
              <Link className="btn" href="/maintenance">
                Show all records
              </Link>
            ) : null}
            <RecordMaintenance
              pool={pool.map((a) => ({
                id: a.id,
                label: `${a.assetTag} · ${a.name}`,
                warranty: a.warrantyEnd ? (a.warrantyEnd >= now ? `Warranty active until ${formatDate(a.warrantyEnd)}` : `Warranty expired ${formatDate(a.warrantyEnd)}`) : "No warranty recorded",
                warrantyActive: !!a.warrantyEnd && a.warrantyEnd >= now,
                issues: a.issues.map((x) => ({ value: x.id, label: `${x.issueNo} · ${x.title}` })),
              }))}
              initialAssetId={param(sp, "asset")}
            />
          </>
        }
      />
      <div className="kpis">
        <div className="hero-dark kpi rise">
          <span className="l">In the workshop</span>
          <span className="v">{scheduled + inProgress}</span>
          <span className="s muted">
            {scheduled} scheduled, {inProgress} in progress
          </span>
        </div>
        <div className="hero-blue kpi rise" style={{ animationDelay: "60ms" }}>
          <span className="l">Spent this month</span>
          <span className="v">{rupee(spentMonth._sum.cost ?? 0)}</span>
          <span className="s muted">across {spentAll._count._all} records in total</span>
        </div>
        <Link href="/maintenance?status=open" className="card kpi lift rise" style={{ animationDelay: "120ms" }}>
          <span className="l">Past expected date</span>
          <span className="v">{late.length}</span>
          <span className="s" style={{ color: "var(--at-t-bad)" }}>
            {late[0]?.asset.name ?? "none"}
          </span>
        </Link>
        <div className="card kpi rise" style={{ animationDelay: "180ms" }}>
          <span className="l">Total repair cost</span>
          <span className="v">{rupeeShort(Number(spentAll._sum.cost ?? 0))}</span>
          <span className="s muted">all time</span>
        </div>
      </div>
      <ListToolbar
        placeholder="Record, asset, problem or provider"
        filters={[
          { key: "status", label: "Status", options: [{ value: "open", label: "Open" }, ...Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => ({ value, label }))] },
          { key: "type", label: "Type", options: Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <TableCard
        head={
          <>
            <th>Record</th>
            <th>Asset</th>
            <th>Problem</th>
            <th>Provider</th>
            <th>Expected / done</th>
            <th>Cost</th>
            <th>Status</th>
            <th>
              <span className="sr">Actions</span>
            </th>
          </>
        }
        empty={{ title: "No maintenance records", text: "Use Record maintenance to add the first one." }}
        rows={rows.map((m, i) => {
          const isOpen = m.status === "SCHEDULED" || m.status === "IN_PROGRESS";
          const lt = isOpen && m.expectedCompletion && daysUntil(m.expectedCompletion) < 0;
          return (
            <tr key={m.id} style={{ animationDelay: `${i * 40}ms` }}>
              <td style={{ whiteSpace: "nowrap" }}>
                <span className="tag">{m.maintenanceNo}</span>
                <br />
                <small className="muted">
                  {MAINTENANCE_TYPE_LABELS[m.type]}
                  {m.issue ? ` · ${m.issue.issueNo}` : ""}
                </small>
              </td>
              <td>
                <Link className="cell" href={`/assets/${m.asset.id}?tab=maintenance`}>
                  <span>{m.asset.name}</span>
                  <span className="tag" style={{ color: "var(--at-muted)" }}>
                    {m.asset.assetTag}
                  </span>
                </Link>
              </td>
              <td style={{ color: "var(--at-soft)", minWidth: 160 }}>{m.problem}</td>
              <td style={{ color: "var(--at-soft)", minWidth: 170 }}>{m.serviceProvider ?? "—"}</td>
              <td style={lt ? { color: "var(--at-t-bad)", fontWeight: 700 } : { color: "var(--at-soft)" }}>
                {m.status === "COMPLETED"
                  ? formatDate(m.actualCompletion)
                  : `${formatDate(m.expectedCompletion)}${lt ? ` · ${-daysUntil(m.expectedCompletion!)}d late` : ""}`}
              </td>
              <td className="num">
                <b>{rupee(m.cost)}</b>
                {m.warrantyCovered ? <small className="muted"> warranty</small> : null}
              </td>
              <td>
                <StatusBadge status={m.status} label={MAINTENANCE_STATUS_LABELS[m.status]} />
              </td>
              <td style={{ textAlign: "right" }}>
                {isOpen ? (
                  <MaintenanceRowActions
                    id={m.id}
                    no={m.maintenanceNo}
                    status={m.status}
                    held={!!m.asset.currentHolderId}
                    record={{
                      provider: m.serviceProvider,
                      cost: Number(m.cost),
                      expected: m.expectedCompletion ? isoDayIST(m.expectedCompletion) : "",
                      parts: m.partsReplaced,
                      notes: m.technicianNotes,
                      warranty: m.warrantyCovered,
                    }}
                  />
                ) : null}
              </td>
            </tr>
          );
        })}
        footer={<Pagination basePath="/maintenance" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
