import Link from "next/link";
import { Laptop, PenLine } from "lucide-react";
import { requireUser } from "@/server/permissions";
import { getEmployeeSummary } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ago } from "@/components/NotificationIcon";
import { firstName, formatDate, greeting, longDay } from "@/lib/format";
import { REQUEST_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Home" };

const STEP = { PENDING: 1, APPROVED: 2, IN_PROGRESS: 3, COMPLETED: 4, REJECTED: 4, CANCELLED: 4 } as const;

export default async function HomePage() {
  const user = await requireUser();
  const s = await getEmployeeSummary(user.id, user.employeeId);
  const repair = s.assets.find((g) => g.asset.status === "UNDER_MAINTENANCE");

  return (
    <>
      <section
        className="card pad rise"
        style={{ background: "var(--at-greet)", display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "var(--at-alert)" }}>{longDay()}</span>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-.02em" }}>
            {greeting()}, {firstName(user.name)}.
          </h1>
          <p style={{ margin: 0, fontSize: 17, color: "var(--at-soft)" }}>
            You hold{" "}
            <b style={{ color: "var(--at-ink)" }}>
              {s.held} company asset{s.held === 1 ? "" : "s"}
            </b>
            .{s.pending.length ? ` ${s.pending.length} waiting for your signature.` : ""}
            {repair ? ` Your ${repair.asset.name} is in for repair.` : ""}
          </p>
        </div>
        <div className="gap8">
          <Link className="btn" href="/report-issue">
            Report an issue
          </Link>
          <Link className="btn pri" href="/my-requests?new=1">
            New request
          </Link>
        </div>
      </section>

      {s.pending.map((g) => (
        <Link
          key={g.id}
          className="banner rise"
          href={`/my-assets/handover/${g.id}`}
          style={{ background: "#1F4E95", color: "#FFFFFF", textDecoration: "none", animationDelay: "80ms" }}
        >
          <span className="ico" style={{ background: "#2F62AE", color: "#FFFFFF" }}>
            <PenLine size={22} />
          </span>
          <span style={{ flex: "1 1 260px" }}>
            <b style={{ fontSize: 17 }}>Confirm you received the {g.asset.name}</b>
            <br />
            <small style={{ color: "#DCE6F6" }}>
              Assigned {formatDate(g.assignedAt)} · {g.accessories.join(", ") || "no accessories"}
            </small>
          </span>
          <b>Review and sign →</b>
        </Link>
      ))}

      <div className="kpis">
        <KpiCard variant="dark" label="My assets" value={s.held} sub={s.inRepair ? `${s.inRepair} in for repair` : "all with you"} href="/my-assets" />
        <KpiCard variant="blue" label="Pending handovers" value={s.pending.length} sub="waiting for your signature" href="/my-assets" delay={60} />
        <KpiCard label="Open issues" value={s.openIssues} sub="reported by you" href="/my-requests" delay={120} />
        <KpiCard label="Open requests" value={s.openRequests} sub="pending or in progress" href="/my-requests" delay={180} />
      </div>

      <div className="row">
        <section className="main-col rise" style={{ animationDelay: "140ms", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="h2" style={{ fontSize: 20 }}>
              My assets
            </h2>
            <Link href="/my-assets" style={{ fontWeight: 600, textDecoration: "none" }}>
              See all
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {s.assets.length ? (
              s.assets.map((g) => (
                <Link key={g.id} className="card pad-s lift" href="/my-assets" style={{ textDecoration: "none", color: "var(--at-ink)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span className="ico" style={{ width: 46, height: 46 }}>
                    <Laptop size={22} />
                  </span>
                  <b style={{ fontSize: 16 }}>{g.asset.name}</b>
                  <span className="tag">{g.asset.assetTag}</span>
                  {g.handoverStatus === "PENDING" ? (
                    <StatusBadge status="RESERVED" label="Sign to confirm" />
                  ) : g.asset.status === "UNDER_MAINTENANCE" ? (
                    <StatusBadge status="UNDER_MAINTENANCE" label="In repair" />
                  ) : (
                    <StatusBadge status="ASSIGNED" label="With you" />
                  )}
                </Link>
              ))
            ) : (
              <div className="card pad empty">
                <b>No assets yet</b>
                <span>Ask for one with a new request.</span>
              </div>
            )}
          </div>
        </section>

        <section className="card pad side rise" style={{ animationDelay: "200ms", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <h2 className="h2">My requests</h2>
            <Link href="/my-requests" style={{ fontWeight: 600, textDecoration: "none" }}>
              All
            </Link>
          </div>
          {s.requests.length ? (
            s.requests.map((r) => (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 0", borderTop: "1px solid var(--at-line)" }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <b>{r.title}</b>
                  <StatusBadge status={r.status} label={REQUEST_STATUS_LABELS[r.status]} />
                </span>
                <small className="muted">
                  {r.requestNo}
                  {r.managerRemarks ? ` · ${r.managerRemarks}` : ""}
                </small>
                <span style={{ height: 6, background: "var(--at-chip)", borderRadius: 3, overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", width: `${STEP[r.status] * 25}%`, background: "var(--at-accent)" }} />
                </span>
              </div>
            ))
          ) : (
            <small className="muted">No requests yet.</small>
          )}
          <h2 className="h2" style={{ margin: "16px 0 6px" }}>
            Latest updates
          </h2>
          {s.notifications.length ? (
            s.notifications.map((n) => (
              <Link key={n.id} href={n.link ?? "/notifications"} style={{ display: "flex", gap: 10, padding: "8px 0", textDecoration: "none", color: "inherit" }}>
                <i style={{ width: 8, height: 8, borderRadius: "50%", background: n.isRead ? "var(--at-line)" : "var(--at-alert)", marginTop: 7, flex: "none" }} />
                <span>
                  <b style={{ fontSize: 14 }}>{n.title}</b>
                  <br />
                  <small className="muted">{ago(n.createdAt)}</small>
                </span>
              </Link>
            ))
          ) : (
            <small className="muted">Nothing new.</small>
          )}
        </section>
      </div>
    </>
  );
}
