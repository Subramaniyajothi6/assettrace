import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { daysUntil } from "@/components/WarrantyCell";
import { formatDate } from "@/lib/format";
import { HANDOVER_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { AssignmentRowActions } from "./RowActions";

export const metadata = { title: "Assignments" };

const TABS = ["active", "pending", "overdue", "history"] as const;
const END_REASON: Record<string, string> = { RETURNED: "Returned", TRANSFERRED: "Transferred", LOST: "Lost", RETIRED: "Retired" };

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(param(sp, "tab") ?? "") ? (param(sp, "tab") as (typeof TABS)[number]) : "active";
  const q = param(sp, "q");
  const dept = param(sp, "department");
  const { page, skip, take, size } = paging(sp);
  const now = new Date();
  const scope: Prisma.AssignmentWhereInput = { asset: managedAssetScope(user) };

  const tabWhere: Record<(typeof TABS)[number], Prisma.AssignmentWhereInput> = {
    active: { isActive: true },
    // "Not signed": waiting for a signature or disputed, both still need follow-up.
    pending: { isActive: true, handoverStatus: { not: "CONFIRMED" } },
    overdue: { isActive: true, expectedReturnDate: { lt: now } },
    history: { isActive: false },
  };
  const where: Prisma.AssignmentWhereInput = {
    AND: [
      scope,
      tabWhere[tab],
      q ? { OR: [{ employee: { name: ilike(q) } }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }] } : {},
      dept ? { departmentId: dept } : {},
    ],
  };

  const [rows, total, counts, departments] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: tab === "history" ? { endedAt: "desc" } : { assignedAt: "desc" },
      skip,
      take,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        employee: { select: { name: true, department: { select: { name: true } } } },
      },
    }),
    prisma.assignment.count({ where }),
    Promise.all([
      prisma.assignment.count({ where: { AND: [scope, tabWhere.active] } }),
      prisma.assignment.count({ where: { AND: [scope, tabWhere.pending] } }),
      prisma.assignment.count({ where: { AND: [scope, tabWhere.overdue] } }),
      prisma.assignment.count({ where: { AND: [scope, { isActive: true, handoverStatus: "PENDING" }] } }),
      prisma.assignment.count({ where: { AND: [scope, { isActive: true, handoverStatus: "DISPUTED" }] } }),
    ]),
    prisma.department.findMany({
      where: user.role === "ADMIN" ? {} : { id: { in: user.managedDepartmentIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const [active, pending, overdue, waiting, disputed] = counts;
  const tabLabel = { active: `Active · ${active}`, pending: `Not signed · ${pending}`, overdue: `Overdue · ${overdue}`, history: "History" };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Assignments" }]}
        title="Assignments"
        actions={
          <>
            <nav className="tabs" aria-label="Assignment views">
              {TABS.map((t) => (
                <Link key={t} href={t === "active" ? "/assignments" : `/assignments?tab=${t}`} aria-current={t === tab ? "page" : undefined}>
                  {tabLabel[t]}
                </Link>
              ))}
            </nav>
            <Link className="btn pri" href="/assignments/new">
              <Plus size={17} /> Assign asset
            </Link>
          </>
        }
      />
      <div className="kpis">
        <div className="hero-dark kpi rise">
          <span className="l">Active assignments</span>
          <span className="v">{active}</span>
          <span className="s muted">in your departments</span>
        </div>
        <div className="hero-blue kpi rise" style={{ animationDelay: "60ms" }}>
          <span className="l">Waiting for signature</span>
          <span className="v">{waiting}</span>
          <span className="s muted">employees confirm on their phone</span>
        </div>
        <Link href="/assignments?tab=overdue" className="card kpi lift rise" style={{ animationDelay: "120ms" }}>
          <span className="l">Overdue returns</span>
          <span className="v">{overdue}</span>
          <span className="s" style={{ color: "var(--at-t-bad)" }}>
            past the expected return date
          </span>
        </Link>
        <Link href="/assignments?tab=pending" className="card kpi lift rise" style={{ animationDelay: "180ms" }}>
          <span className="l">Disputed handovers</span>
          <span className="v">{disputed}</span>
          <span className="s muted">need a follow-up</span>
        </Link>
      </div>
      <ListToolbar
        placeholder="Employee, asset ID or asset name"
        filters={[{ key: "department", label: "Department", options: departments.map((d) => ({ value: d.id, label: d.name })) }]}
      />
      <TableCard
        head={
          <>
            <th>Asset</th>
            <th>Assigned to</th>
            <th>Since</th>
            <th>Expected return</th>
            <th>Handover</th>
            <th>Accessories</th>
            <th>
              <span className="sr">Actions</span>
            </th>
          </>
        }
        empty={{ title: "Nothing here", text: "No assignments in this view.", action: tab === "active" ? { label: "Assign asset", href: "/assignments/new" } : undefined }}
        rows={rows.map((g, i) => {
          const od = g.isActive && g.expectedReturnDate && daysUntil(g.expectedReturnDate) < 0;
          return (
            <tr key={g.id} style={{ animationDelay: `${Math.min(i * 40, 600)}ms` }}>
              <td>
                <Link className="cell" href={`/assets/${g.asset.id}`}>
                  <span>{g.asset.name}</span>
                  <span className="tag">{g.asset.assetTag}</span>
                </Link>
              </td>
              <td>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Initials name={g.employee.name} small />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <b>{g.employee.name}</b>
                    <small className="muted">{g.employee.department.name}</small>
                  </span>
                </span>
              </td>
              <td style={{ color: "var(--at-soft)" }}>{formatDate(g.assignedAt)}</td>
              <td style={od ? { color: "var(--at-t-bad)", fontWeight: 700 } : { color: "var(--at-soft)" }}>
                {g.isActive
                  ? g.expectedReturnDate
                    ? `${formatDate(g.expectedReturnDate)}${od ? ` · ${-daysUntil(g.expectedReturnDate)} days overdue` : ""}`
                    : "—"
                  : `Ended ${formatDate(g.endedAt)}`}
              </td>
              <td>
                <StatusBadge status={g.handoverStatus} label={HANDOVER_LABELS[g.handoverStatus]} />
              </td>
              <td className="muted" style={{ fontSize: 14 }}>
                {g.accessories.join(", ") || "—"}
              </td>
              <td style={{ textAlign: "right" }}>
                {g.isActive ? (
                  <AssignmentRowActions id={g.id} assetId={g.asset.id} status={g.handoverStatus} overdue={!!od} />
                ) : (
                  <span className="muted">{g.endReason ? END_REASON[g.endReason] : ""}</span>
                )}
              </td>
            </tr>
          );
        })}
        footer={<Pagination basePath="/assignments" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
