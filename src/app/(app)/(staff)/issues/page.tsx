import Link from "next/link";
import type { IssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { formatDate } from "@/lib/format";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import { ilike, param, type SearchParams } from "@/lib/list";
import { IssueCardActions } from "./IssueCardActions";

export const metadata = { title: "Issue board" };

const COLUMNS: IssueStatus[] = ["REPORTED", "UNDER_REVIEW", "MAINTENANCE", "RESOLVED", "CLOSED"];
const SEV = { CRITICAL: "#B4232F", HIGH: "#D2643E", MEDIUM: "#D08A1E", LOW: "#9AA6B2" } as const;
const CLOSED_LIMIT = 10;

export default async function IssuesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const severity = param(sp, "severity");
  const category = param(sp, "category");
  const where: Prisma.AssetIssueWhereInput = {
    AND: [
      { asset: managedAssetScope(user) },
      severity ? { severity: severity as Prisma.EnumSeverityFilter["equals"] } : {},
      category ? { category: category as Prisma.EnumIssueCategoryFilter["equals"] } : {},
      q ? { OR: [{ issueNo: ilike(q) }, { title: ilike(q) }, { asset: { assetTag: ilike(q) } }, { reportedBy: { name: ilike(q) } }] } : {},
    ],
  };
  const [issues, closedCount, maint] = await Promise.all([
    prisma.assetIssue.findMany({
      where: { AND: [where, { status: { not: "CLOSED" } }] },
      orderBy: [{ reportedAt: "desc" }],
      include: { asset: { select: { id: true, name: true, assetTag: true, status: true } }, reportedBy: { select: { name: true } } },
    }),
    prisma.assetIssue.count({ where: { AND: [where, { status: "CLOSED" }] } }),
    prisma.maintenanceRecord.findMany({ where: { issue: where, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, select: { id: true, issueId: true, maintenanceNo: true } }),
  ]);
  const closed = await prisma.assetIssue.findMany({
    where: { AND: [where, { status: "CLOSED" }] },
    orderBy: { reportedAt: "desc" },
    take: CLOSED_LIMIT,
    include: { asset: { select: { id: true, name: true, assetTag: true, status: true } }, reportedBy: { select: { name: true } } },
  });
  const all = [...issues, ...closed];
  const maintByIssue = new Map(maint.map((m) => [m.issueId, m]));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Requests", href: "/requests" }, { label: "Issues" }]}
        title="Issue board"
        actions={<span className="muted">Move an issue forward with the button on its card</span>}
      />
      <ListToolbar
        placeholder="Issue no., title, asset or employee"
        filters={[
          { key: "severity", label: "Severity", options: Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "category", label: "Category", options: Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <div className="tw" style={{ paddingBottom: 6 }}>
        <div className="kanban">
          {COLUMNS.map((s, k) => {
            const items = all.filter((i) => i.status === s);
            const count = s === "CLOSED" ? closedCount : items.length;
            return (
              <section key={s} className="col rise" style={{ animationDelay: `${k * 60}ms` }} aria-label={ISSUE_STATUS_LABELS[s]}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px" }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{ISSUE_STATUS_LABELS[s]}</h2>
                  <span className="pill s-mute" style={{ padding: "2px 9px" }}>
                    {count}
                  </span>
                </div>
                {items.map((i) => (
                  <article key={i.id} className="icard" style={{ borderLeftColor: SEV[i.severity] }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="tag">{i.issueNo}</span>
                      <b style={{ fontSize: 12, color: SEV[i.severity] }}>{SEVERITY_LABELS[i.severity]}</b>
                    </div>
                    <b style={{ fontSize: 15, lineHeight: 1.3 }}>{i.title}</b>
                    <small className="muted">
                      <Link href={`/assets/${i.asset.id}?tab=issues`} style={{ color: "inherit" }}>
                        {i.asset.name}
                      </Link>{" "}
                      · {i.reportedBy.name} · {formatDate(i.reportedAt)}
                    </small>
                    {i.resolution ? <small style={{ color: "var(--at-soft)" }}>{i.resolution}</small> : null}
                    <span className="pill s-mute" style={{ alignSelf: "flex-start" }}>
                      {ISSUE_CATEGORY_LABELS[i.category]}
                    </span>
                    <IssueCardActions id={i.id} no={i.issueNo} status={i.status} maintenance={maintByIssue.get(i.id) ?? null} assetReturned={i.asset.status === "RETURNED"} />
                  </article>
                ))}
                {s === "CLOSED" && closedCount > CLOSED_LIMIT ? <small className="muted" style={{ padding: "0 6px" }}>Showing the latest {CLOSED_LIMIT}.</small> : null}
                {!items.length ? <small className="muted" style={{ padding: "0 6px" }}>Nothing here.</small> : null}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
