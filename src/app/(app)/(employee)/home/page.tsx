import Link from "next/link";
import { PenLine } from "lucide-react";
import { requireUser } from "@/server/permissions";
import { getEmployeeSummary } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/KpiCard";
import { firstName, formatDate, greeting, longDay } from "@/lib/format";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const s = await getEmployeeSummary(user.employeeId);

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
    </>
  );
}
