import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { REPORTS, reportByKey, type Cell, type Column } from "@/server/queries/reports";
import { getSettings } from "@/server/settings";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar, type FilterDef } from "@/components/list/ListToolbar";
import { DateRange } from "@/components/list/DateRange";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { formatDate, formatDateTime, rupee } from "@/lib/format";
import { paging, param, type SearchParams } from "@/lib/list";

export const metadata = { title: "Reports & export" };

function show(v: Cell, col: Column): string {
  if (v == null || v === "") return "—";
  if (v instanceof Date) return formatDate(v);
  if (col.kind === "money" && typeof v === "number") return rupee(v);
  return String(v);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const def = reportByKey(param(sp, "r")) ?? REPORTS[0];
  const { page, skip, take, size } = paging(sp);
  const deptWhere = user.role === "ADMIN" ? { isActive: true } : { isActive: true, id: { in: user.managedDepartmentIds } };

  const [result, categories, departments, locations, scopeDepts, settings] = await Promise.all([
    def.run(user, sp, { skip, take }),
    prisma.assetCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: deptWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    user.role === "ADMIN" ? Promise.resolve([]) : prisma.department.findMany({ where: { id: { in: user.managedDepartmentIds } }, select: { name: true } }),
    getSettings(),
  ]);

  const filters: FilterDef[] = [];
  if (def.filters.includes("status") && def.statuses) filters.push({ key: "status", label: "Status", options: Object.entries(def.statuses).map(([value, label]) => ({ value, label })) });
  if (def.filters.includes("days"))
    filters.push({ key: "days", label: "Ending within", options: [7, 15, 30, 60, 90, 180].map((n) => ({ value: String(n), label: `${n} days${n === settings.warrantyAlertDays ? " (default)" : ""}` })) });
  if (def.filters.includes("category")) filters.push({ key: "category", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })) });
  if (def.filters.includes("department")) filters.push({ key: "department", label: "Department", options: departments.map((d) => ({ value: d.id, label: d.name })) });
  if (def.filters.includes("location")) filters.push({ key: "location", label: "Location", options: locations.map((l) => ({ value: l.id, label: l.name })) });

  // Export links carry the current filters (minus paging).
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page" && k !== "r") qs.set(k, v);
  const exportHref = (format: "csv" | "xlsx") => `/api/export/${def.key}?${new URLSearchParams([...qs.entries(), ["format", format]]).toString()}`;
  const scopeText = user.role === "ADMIN" ? "all departments" : scopeDepts.map((d) => d.name).join(", ") || "no departments";

  return (
    <>
      <PageHeader crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Reports" }]} title="Reports & export" />
      <nav aria-label="Reports" className="rise" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/reports?r=${r.key}`}
            className="pick"
            aria-current={r.key === def.key ? "page" : undefined}
            aria-pressed={r.key === def.key}
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, textDecoration: "none" }}
          >
            <b style={{ fontSize: 16 }}>{r.title}</b>
            <small className="muted">{r.description}</small>
          </Link>
        ))}
      </nav>

      <section className="card pad rise" style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{def.title}</h2>
            <small className="muted">
              {result.total} row{result.total === 1 ? "" : "s"} · {scopeText} · generated {formatDateTime(new Date())}
            </small>
          </div>
          <div className="gap8">
            <a className="btn" href={exportHref("csv")} download>
              <Download size={16} /> Export CSV
            </a>
            <a className="btn" href={exportHref("xlsx")} download style={{ background: "#1F6B43", color: "#FFFFFF", borderColor: "#1F6B43" }}>
              <FileSpreadsheet size={16} /> Export Excel
            </a>
          </div>
        </div>
        <ListToolbar key={def.key} placeholder="Search this report" filters={filters}>
          {def.dateLabel ? <DateRange key={`${def.key}-dates`} label={def.dateLabel} /> : null}
        </ListToolbar>
      </section>

      <TableCard
        head={result.columns.map((c) => (
          <th key={c.label} style={{ textAlign: c.kind === "money" || c.kind === "number" ? "right" : undefined, minWidth: c.kind === "long" ? 280 : undefined }}>
            {c.label}
          </th>
        ))}
        empty={{ title: "No rows", text: "Nothing matches this report with these filters." }}
        rows={result.rows.map((r, i) => (
          <tr key={i} style={{ animationDelay: `${Math.min(i * 30, 450)}ms` }}>
            {r.map((v, j) => {
              const col = result.columns[j];
              const numeric = col.kind === "money" || col.kind === "number";
              // Free text wraps in a wide column; everything else stays on one line (the table scrolls sideways).
              const long = col.kind === "long";
              return (
                <td key={j} className={numeric ? "num" : undefined} style={{ textAlign: numeric ? "right" : undefined, whiteSpace: long ? undefined : "nowrap", minWidth: long ? 280 : undefined }}>
                  {j === 0 ? <b>{show(v, col)}</b> : show(v, col)}
                </td>
              );
            })}
          </tr>
        ))}
        footer={
          <>
            <Pagination basePath="/reports" sp={sp} page={page} size={size} total={result.total} />
            <small className="muted" style={{ display: "block", padding: "0 16px 12px" }}>
              Exports include every row that matches the filters (up to 10,000).
            </small>
          </>
        }
      />
    </>
  );
}
