import Link from "next/link";
import { Plus, QrCode } from "lucide-react";
import type { HistoryEvent } from "@prisma/client";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { getActionItems, getStaffDashboard } from "@/server/queries/dashboard";
import { checkWarranties } from "@/server/services/notifications";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { BreakdownCard, ChartCard, ColumnChart, TrendChart } from "@/components/charts/Charts";
import { daysUntil } from "@/components/WarrantyCell";
import { firstName, greeting, longDay, rupeeShort } from "@/lib/format";
import { HISTORY_EVENT_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Dashboard" };

const EV_COLOR: Partial<Record<HistoryEvent, string>> = {
  ASSIGNED: "#3A6BB8",
  HANDOVER_CONFIRMED: "#2E7D4F",
  ISSUE_REPORTED: "#D2643E",
  RETURN_REQUESTED: "#B98516",
  REGISTERED: "#3A6BB8",
  TRANSFERRED: "#7C5CC4",
};
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hourCycle: "h23" });
/** "Needs your action" shows this many items; the rest open behind "Show N more" so the card stays level with the locations card. */
const ACTIONS_SHOWN = 5;

function ActionItem({ a, delay }: { a: Awaited<ReturnType<typeof getActionItems>>[number]; delay: number }) {
  return (
    <Link className="li rise" href={a.href} style={{ animationDelay: `${delay}ms` }}>
      <span className="ico" style={{ background: a.bg, color: a.fg, fontSize: 11, fontWeight: 800 }}>
        {a.tag}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</b>
        <small className="muted">{a.sub}</small>
      </span>
      <span className="btn sm">{a.cta}</span>
    </Link>
  );
}

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
/** 9 am → 6 pm mapped to 0–100% of the timeline. */
const hx = (d: Date) => {
  const [h, m] = hourFmt.format(d).split(":").map(Number);
  return Math.max(1, Math.min(99, ((h + m / 60 - 9) / 9) * 100));
};

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getSettings();
  // Warranty alerts without a paid cron: idempotent check on dashboard load (ARCHITECTURE.md §5).
  await checkWarranties(user).catch((e) => console.error("warranty check failed", e));
  const [d, actions] = await Promise.all([getStaffDashboard(user, settings.warrantyAlertDays), getActionItems(user)]);
  const c = d.counts;
  const now = new Date();
  const toProcess = actions.filter((a) => a.tag === "RET" || a.tag === "INS").length;
  const urgent = actions.filter((a) => a.tag === "!").length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Dashboard" }]}
        title="Dashboard"
        actions={
          <span className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderRadius: "var(--at-pill)" }}>
            <span className="pulse" />
            <b>{timeFmt.format(now)}</b>
            <span style={{ width: 1, height: 26, background: "var(--at-line)" }} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <b style={{ fontSize: 14 }}>{c.assigned} assets in use</b>
              <small className="muted">
                {d.pendingHandovers} handover{d.pendingHandovers === 1 ? "" : "s"} pending
              </small>
            </span>
          </span>
        }
      />

      <div className="row">
        <section className="card pad main-col rise" style={{ background: "var(--at-greet)", animationDelay: "120ms", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "var(--at-alert)" }}>{longDay(now)}</span>
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-.02em" }}>
                {greeting(now)}, {firstName(user.name)}.
              </h2>
              <p style={{ margin: 0, fontSize: 16, color: "var(--at-soft)" }}>
                <b style={{ color: "var(--at-ink)" }}>
                  {d.pendingHandovers} handover{d.pendingHandovers === 1 ? "" : "s"}
                </b>{" "}
                waiting for a signature,{" "}
                <b style={{ color: "var(--at-ink)" }}>
                  {toProcess} return{toProcess === 1 ? "" : "s"}
                </b>{" "}
                to process and <b style={{ color: "var(--at-ink)" }}>{c.maintenance} assets</b> in repair.
                {urgent ? (
                  <>
                    {" "}
                    <Link href="/issues" style={{ color: "#D2414E", fontWeight: 700, textDecoration: "none" }}>
                      {urgent} urgent issue{urgent === 1 ? " needs" : "s need"} a look.
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <div className="gap8" style={{ alignItems: "flex-start" }}>
              <Link className="btn pri" href="/scan">
                <QrCode size={17} /> Scan QR
              </Link>
              <Link className="btn" href="/assets/new">
                <Plus size={17} /> Register asset
              </Link>
              <Link className="btn" href="/activity">
                All activity
              </Link>
            </div>
          </div>
          <div className="timeline" role="img" aria-label={`Today's activity: ${d.today.length} events`}>
            <div className="base" />
            <div className="done" style={{ width: `${hx(now)}%` }} />
            {d.today.map((h, i) => (
              <span
                key={h.id}
                className="ev"
                title={`${timeFmt.format(h.createdAt)} · ${HISTORY_EVENT_LABELS[h.event]} · ${h.asset.name}`}
                style={{ left: `${hx(h.createdAt)}%`, background: EV_COLOR[h.event] ?? "#3A6BB8", animationDelay: `${500 + i * 90}ms` }}
              />
            ))}
            <div className="now" style={{ left: `${hx(now)}%` }} />
            <span className="nowl" style={{ left: `${hx(now)}%` }}>
              {timeFmt.format(now)}
            </span>
            {(
              [
                [9, "9a"],
                [11, "11a"],
                [13, "1p"],
                [15, "3p"],
                [17, "5p"],
              ] as const
            ).map(([h, l]) => (
              <span key={l} className="hr" style={{ left: `${((h - 9) / 9) * 100}%` }}>
                {l}
              </span>
            ))}
          </div>
        </section>

        <section className="card pad side lift rise" style={{ animationDelay: "180ms", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="h2">Asset value</h2>
            <Link className="btn sm" href="/reports">
              Reports ›
            </Link>
          </div>
          <div className="gap8">
            <span className="num" style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-.02em", fontFamily: "var(--at-display)" }}>
              {rupeeShort(d.activeValue)}
            </span>
            <span className="pill s-ok">{d.activeCount} active assets</span>
          </div>
          <small className="muted">Purchases per month, last 12 months</small>
          <ColumnChart data={d.purchasesByMonth} money height={140} />
        </section>
      </div>

      <div className="kpis">
        <KpiCard variant="dark" label="Assigned" value={c.assigned} trend={d.trends.assigned} sub={`${Math.round((c.assigned / Math.max(1, d.total - c.retired)) * 100)}% of active assets in use`} href="/assets?status=ASSIGNED" delay={240} />
        <KpiCard variant="blue" label="Available to assign" value={c.available} trend={d.trends.available} sub={`${c.reserved} reserved for new joiners`} href="/assets?status=AVAILABLE" delay={300} />
        <KpiCard
          label="Under maintenance"
          value={c.maintenance}
          trend={d.trends.maintenance}
          sub={`${d.lateMaintenance} past expected date`}
          tone={d.lateMaintenance ? "bad" : "muted"}
          href="/assets?status=UNDER_MAINTENANCE"
          delay={360}
        />
        <KpiCard
          label={`Warranty ≤ ${settings.warrantyAlertDays} days`}
          value={d.warrantySoon}
          sub={d.nextWarranty ? `Next: ${d.nextWarranty.name} in ${daysUntil(d.nextWarranty.warrantyEnd!)}d` : "Nothing expiring soon"}
          tone={d.warrantySoon ? "bad" : "muted"}
          href="/assets?warranty=soon"
          delay={420}
        />
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {(
          [
            ["Total assets", d.total, "/assets"],
            ["Damaged", c.damaged, "/assets?status=DAMAGED"],
            ["Lost", c.lost, "/assets?status=LOST"],
            ["Retired", c.retired, "/assets?status=RETIRED"],
            ["Pending requests", d.pendingRequests, "/requests?status=open"],
            ["Open issues", d.openIssues, "/issues"],
          ] as const
        ).map(([l, v, href], i) => (
          <Link key={l} href={href} className="card kpi lift rise" style={{ animationDelay: `${460 + i * 40}ms`, padding: "14px 18px", gap: 4 }}>
            <span className="l" style={{ fontSize: 13 }}>
              {l}
            </span>
            <span className="v" style={{ fontSize: 26 }}>
              {v}
            </span>
          </Link>
        ))}
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <section className="card pad main-col rise" style={{ animationDelay: "420ms", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 className="h2">Where your assets are</h2>
            <small className="muted">
              {d.locations.reduce((n, l) => n + l.total, 0)} active assets across {d.locations.length} location{d.locations.length === 1 ? "" : "s"}
            </small>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {d.locations.map((l, li) => (
              <div key={l.id} className="card pad-s lift" style={{ borderTop: `4px solid ${["#3A6BB8", "#D2643E", "#2E7D4F"][li % 3]}`, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="ico" style={{ fontSize: 12, fontWeight: 700 }}>
                    {l.code}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <b style={{ fontSize: 16 }}>{l.name}</b>
                    <small className="muted">{l.address}</small>
                  </span>
                </div>
                <div
                  className="loc-bar"
                  role="img"
                  aria-label={`${l.name}: ${l.statuses.map((s) => `${s.count} ${STATUS_LABELS[s.status].toLowerCase()}`).join(", ")}`}
                  style={{ animationDelay: `${550 + li * 100}ms` }}
                >
                  {l.statuses.map((s) => (
                    <Link
                      key={s.status}
                      href={`/assets?location=${l.id}&status=${s.status}`}
                      title={`${s.count} ${STATUS_LABELS[s.status].toLowerCase()} · ${Math.round((s.count / l.total) * 100)}%`}
                      style={{ flex: `${s.count} 1 0`, background: STATUS_COLORS[s.status] }}
                    />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px 12px", fontSize: 13 }}>
                  {l.statuses.map((s) => (
                    <Link key={s.status} href={`/assets?location=${l.id}&status=${s.status}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
                      <i style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_COLORS[s.status], flex: "none" }} aria-hidden="true" />
                      {s.status === "UNDER_MAINTENANCE" ? "Maintenance" : STATUS_LABELS[s.status]}
                      <b style={{ marginLeft: "auto" }}>{s.count}</b>
                    </Link>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, fontSize: 13, marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--at-line)" }}>
                  <span>
                    <span className="muted">Assets</span>
                    <br />
                    <b style={{ fontSize: 16 }}>{l.total}</b>
                  </span>
                  <span>
                    <span className="muted">In use</span>
                    <br />
                    <b style={{ fontSize: 16 }}>{l.inUsePct}%</b>
                  </span>
                  <span>
                    <span className="muted">Value</span>
                    <br />
                    <b style={{ fontSize: 16 }}>{rupeeShort(l.value)}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card side rise" style={{ animationDelay: "480ms", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 8px 8px" }}>
            <h2 className="h2">Needs your action</h2>
            <span className="pill s-bad">{actions.length} open</span>
          </div>
          {actions.length ? (
            <>
              {actions.slice(0, ACTIONS_SHOWN).map((a, i) => (
                <ActionItem key={`${a.href}-${i}`} a={a} delay={560 + i * 60} />
              ))}
              {actions.length > ACTIONS_SHOWN ? (
                <details className="more-actions">
                  <summary className="btn sm">Show {actions.length - ACTIONS_SHOWN} more</summary>
                  {actions.slice(ACTIONS_SHOWN).map((a, i) => (
                    <ActionItem key={`${a.href}-${i}`} a={a} delay={0} />
                  ))}
                </details>
              ) : null}
            </>
          ) : (
            <div className="empty">
              <b>All clear</b>
              <span>Nothing needs you right now.</span>
            </div>
          )}
        </section>
      </div>

      <div className="dash-charts">
        <BreakdownCard
          tabs={[
            { key: "status", label: "Status", title: "All assets by status", sub: `${d.total} assets in your scope`, groups: d.breakdown.status },
            { key: "category", label: "Category", title: "Active assets by category", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.category },
            { key: "department", label: "Department", title: "Active assets by department", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.department },
            { key: "location", label: "Location", title: "Active assets by location", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.location },
          ]}
        />
        <ChartCard title="Maintenance cost by month" sub="Last 12 months, ₹">
          <ColumnChart data={d.maintenanceByMonth} money />
        </ChartCard>
        <ChartCard title="Warranty expiry" sub="Assets whose warranty ends, next 6 months">
          <ColumnChart data={d.warrantyByMonth} />
        </ChartCard>
        <ChartCard title="Monthly asset transactions" sub="Every recorded history event, last 12 months" style={{ gridColumn: "1 / -1" }}>
          <TrendChart data={d.transactionsByMonth} />
        </ChartCard>
      </div>
    </>
  );
}
