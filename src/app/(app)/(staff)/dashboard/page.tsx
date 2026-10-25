import Link from "next/link";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { getStaffKpis } from "@/server/queries/dashboard";
import { checkWarranties } from "@/server/services/notifications";
import { KpiCard } from "@/components/KpiCard";
import { firstName, greeting, longDay } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getSettings();
  // Warranty alerts without a paid cron: idempotent check on dashboard load (ARCHITECTURE.md §5).
  await checkWarranties(user).catch((e) => console.error("warranty check failed", e));
  const k = await getStaffKpis(user, settings.warrantyAlertDays);

  const todo = [
    k.pendingHandovers && `${k.pendingHandovers} handover${k.pendingHandovers === 1 ? "" : "s"} waiting for a signature`,
    k.toInspect && `${k.toInspect} return${k.toInspect === 1 ? "" : "s"} to inspect`,
    k.warrantySoon && `${k.warrantySoon} warrant${k.warrantySoon === 1 ? "y ends" : "ies end"} within ${settings.warrantyAlertDays} days`,
  ].filter(Boolean);

  return (
    <>
      <section
        className="card pad rise"
        style={{ background: "var(--at-greet)", display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 680 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "var(--at-alert)" }}>{longDay()}</span>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-.02em" }}>
            {greeting()}, {firstName(user.name)}.
          </h1>
          <p style={{ margin: 0, fontSize: 17, color: "var(--at-soft)" }}>
            {todo.length ? `${todo.join(" · ")}.` : "Nothing waiting on you right now."}
          </p>
        </div>
        <div className="gap8">
          <Link className="btn" href="/scan">
            Scan QR
          </Link>
          <Link className="btn pri" href="/assets/new">
            Register asset
          </Link>
        </div>
      </section>

      <div className="kpis">
        <KpiCard variant="dark" label="Total assets" value={k.total} trend={k.trends.total} sub="in your departments" href="/assets" />
        <KpiCard
          label="Available"
          value={k.available}
          trend={k.trends.available}
          sub={k.reserved ? `${k.reserved} reserved for new joiners` : "ready to assign"}
          tone="ok"
          href="/assets?status=AVAILABLE"
          delay={60}
        />
        <KpiCard
          variant="blue"
          label="Assigned"
          value={k.assigned}
          trend={k.trends.assigned}
          sub={k.pendingHandovers ? `${k.pendingHandovers} awaiting signature` : "all handovers signed"}
          href="/assets?status=ASSIGNED"
          delay={120}
        />
        <KpiCard
          label="Under maintenance"
          value={k.maintenance}
          trend={k.trends.maintenance}
          sub={k.warrantySoon ? `${k.warrantySoon} warranties expiring soon` : "no warranties expiring"}
          tone={k.warrantySoon ? "bad" : "muted"}
          href="/assets?status=UNDER_MAINTENANCE"
          delay={180}
        />
      </div>
    </>
  );
}
