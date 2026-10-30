import Link from "next/link";
import type { IssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { formatDate } from "@/lib/format";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_COLORS, ISSUE_STATUS_LABELS, ISSUE_STATUS_ORDER, SEVERITY_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { IssueCardActions } from "./IssueCardActions";
import { TabIndicator } from "@/components/motion/TabIndicator";

export const metadata = { title: "Issues" };

// Theme tokens (globals.css) so severity text keeps 4.5:1 contrast in light and dark.
const SEV = { CRITICAL: "var(--at-t-bad)", HIGH: "var(--at-t-high)", MEDIUM: "var(--at-t-warn)", LOW: "var(--at-muted)" } as const;

const TABS = ["open", "resolved", "closed", "all"] as const;
type Tab = (typeof TABS)[number];
const TAB_STATUS: Record<Tab, IssueStatus[] | null> = {
  open: ["REPORTED", "UNDER_REVIEW", "MAINTENANCE"],
  resolved: ["RESOLVED"],
  closed: ["CLOSED"],
  all: null,
};
const TAB_LABEL: Record<Tab, string> = { open: "Open", resolved: "Resolved", closed: "Closed", all: "All" };

// Enum order in the schema: Severity LOW→CRITICAL, IssueStatus REPORTED→CLOSED.
const SORTS = {
  new: [{ reportedAt: "desc" }],
  old: [{ reportedAt: "asc" }],
  severity: [{ severity: "desc" }, { reportedAt: "desc" }],
  status: [{ status: "asc" }, { reportedAt: "desc" }],
} satisfies Record<string, Prisma.AssetIssueOrderByWithRelationInput[]>;
type Sort = keyof typeof SORTS;

/** Five-step bar: steps done in ink, the current step in its status colour. */
function Progress({ status }: { status: IssueStatus }) {
  const at = ISSUE_STATUS_ORDER.indexOf(status);
  return (
    <span className="pipe" role="img" aria-label={`Step ${at + 1} of ${ISSUE_STATUS_ORDER.length}: ${ISSUE_STATUS_LABELS[status]}`}>
      {ISSUE_STATUS_ORDER.map((s, k) => (
        <i key={s} data-on={k <= at || undefined} style={{ "--c": k < at ? "var(--at-ink)" : ISSUE_STATUS_COLORS[status] } as React.CSSProperties} />
      ))}
    </span>
  );
}

export default async function IssuesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const severity = param(sp, "severity");
  const category = param(sp, "category");
  const tab: Tab = TABS.includes(param(sp, "tab") as Tab) ? (param(sp, "tab") as Tab) : "open";
  const sort: Sort = (param(sp, "sort") as Sort) in SORTS ? (param(sp, "sort") as Sort) : "new";
  const { page, skip, take, size } = paging(sp);

  const where: Prisma.AssetIssueWhereInput = {
    AND: [
      { asset: managedAssetScope(user) },
      severity ? { severity: severity as Prisma.EnumSeverityFilter["equals"] } : {},
      category ? { category: category as Prisma.EnumIssueCategoryFilter["equals"] } : {},
      q ? { OR: [{ issueNo: ilike(q) }, { title: ilike(q) }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }, { reportedBy: { name: ilike(q) } }] } : {},
    ],
  };
  const inTab = (t: Tab): Prisma.AssetIssueWhereInput => (TAB_STATUS[t] ? { AND: [where, { status: { in: TAB_STATUS[t]! } }] } : where);

  const [issues, total, counts] = await Promise.all([
    prisma.assetIssue.findMany({
      where: inTab(tab),
      orderBy: SORTS[sort],
      skip,
      take,
      include: { asset: { select: { id: true, name: true, assetTag: true, status: true } }, reportedBy: { select: { name: true } } },
    }),
    prisma.assetIssue.count({ where: inTab(tab) }),
    Promise.all(TABS.map((t) => prisma.assetIssue.count({ where: inTab(t) }))),
  ]);
  const maint = await prisma.maintenanceRecord.findMany({
    where: { issueId: { in: issues.map((i) => i.id) }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    select: { id: true, issueId: true, maintenanceNo: true },
  });
  const maintByIssue = new Map(maint.map((m) => [m.issueId, m]));

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") p.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/issues?${s}` : "/issues";
  };
  const SortTh = ({ label, by, alt }: { label: string; by: Sort; alt?: Sort }) => {
    const on = sort === by || sort === alt;
    const nextSort = on && alt ? (sort === by ? alt : by) : by;
    return (
      <th aria-sort={on ? (sort === "old" ? "ascending" : "descending") : undefined}>
        <Link href={href({ sort: nextSort === "new" ? null : nextSort })} style={{ color: "inherit", textDecoration: "none", whiteSpace: "nowrap" }}>
          {label} <span style={{ opacity: on ? 1 : 0.35 }}>{on && sort === "old" ? "↑" : "↓"}</span>
        </Link>
      </th>
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Requests", href: "/requests" }, { label: "Issues" }]}
        title="Issues"
        actions={
          <nav className="tabs" aria-label="Issue views">
            <TabIndicator />
            {TABS.map((t, k) => (
              <Link key={t} href={href({ tab: t === "open" ? null : t })} aria-current={t === tab ? "page" : undefined}>
                {TAB_LABEL[t]} · {counts[k]}
              </Link>
            ))}
          </nav>
        }
      />
      <ListToolbar
        placeholder="Issue no., title, asset or employee"
        filters={[
          { key: "severity", label: "Severity", options: Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "category", label: "Category", options: Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <TableCard
        head={
          <>
            <th>Issue</th>
            <th>Problem</th>
            <SortTh label="Severity" by="severity" />
            <th>Category</th>
            <SortTh label="Reported" by="new" alt="old" />
            <SortTh label="Status" by="status" />
            <th aria-label="Next step" />
          </>
        }
        empty={
          tab === "open" && !q && !severity && !category
            ? { title: "No open issues", text: "Issues employees report show up here." }
            : { title: "No issues match", text: "Try another tab, or clear the search and filters." }
        }
        rows={issues.map((i) => (
          <tr key={i.id}>
            <td>
              <span className="tag">{i.issueNo}</span>
            </td>
            <td style={{ minWidth: 260 }}>
              <b style={{ display: "block" }}>{i.title}</b>
              <small className="muted">
                <Link href={`/assets/${i.asset.id}?tab=issues`} style={{ color: "inherit" }}>
                  {i.asset.name}
                </Link>{" "}
                · {i.reportedBy.name}
              </small>
              {i.resolution ? (
                <small style={{ display: "block", color: "var(--at-soft)" }}>
                  {/* Resolutions from maintenance are stored as "Fixed: …"; drop that so it doesn't read "Fix: Fixed: …". */}
                  <b>Fix:</b> {i.resolution.replace(/^Fixed:\s*/, "")}
                </small>
              ) : null}
            </td>
            <td>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: SEV[i.severity], whiteSpace: "nowrap" }}>
                <i style={{ width: 8, height: 8, borderRadius: "50%", background: SEV[i.severity] }} aria-hidden="true" />
                {SEVERITY_LABELS[i.severity]}
              </span>
            </td>
            <td>
              <span className="pill s-mute">{ISSUE_CATEGORY_LABELS[i.category]}</span>
            </td>
            <td style={{ whiteSpace: "nowrap" }}>{formatDate(i.reportedAt)}</td>
            <td>
              <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <b style={{ fontSize: 13, whiteSpace: "nowrap" }}>{ISSUE_STATUS_LABELS[i.status]}</b>
                <Progress status={i.status} />
              </span>
            </td>
            <td style={{ textAlign: "right" }}>
              <IssueCardActions id={i.id} no={i.issueNo} status={i.status} maintenance={maintByIssue.get(i.id) ?? null} assetReturned={i.asset.status === "RETURNED"} />
            </td>
          </tr>
        ))}
        footer={<Pagination basePath="/issues" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
