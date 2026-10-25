import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Denied } from "@/components/Denied";
import { formatDate, formatDateTime } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/labels";
import { HandoverForm } from "./HandoverForm";

export const metadata = { title: "Confirm handover" };

export default async function HandoverPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const user = await requireUser();
  const g = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      asset: { include: { category: { select: { name: true, code: true } }, location: { select: { name: true } } } },
      assignedBy: { select: { name: true } },
      employee: { select: { name: true } },
    },
  });
  if (!g) notFound();
  if (g.employeeId !== user.employeeId) return <Denied home="/home" />;
  const a = g.asset;

  if (g.handoverStatus !== "PENDING" || !g.isActive) {
    const ok = g.handoverStatus === "CONFIRMED";
    return (
      <div className="card pad empty rise">
        <span className="ico" style={{ width: 72, height: 72, borderRadius: "50%", background: ok ? "#DCEFE2" : "#F8DDD2", color: ok ? "#1F5C3A" : "#8E2A12" }}>
          {ok ? <Check size={32} /> : <TriangleAlert size={32} />}
        </span>
        <b>{ok ? "Handover confirmed" : g.isActive ? "Problem reported" : "This assignment has ended"}</b>
        <span>
          {a.name}
          {ok ? ` is in your assets. Signed ${formatDateTime(g.handoverConfirmedAt)}.` : g.isActive ? " · your asset manager will follow up." : "."}
        </span>
        <Link className="btn pri" href="/my-assets">
          Back to my assets
        </Link>
      </div>
    );
  }

  const items = [a.category.name, ...g.accessories];
  return (
    <>
      <PageHeader crumbs={[{ label: "My assets", href: "/my-assets" }, { label: "Confirm handover" }]} title="Confirm you received it" />
      <div className="row">
        <section className="card side rise" style={{ overflow: "hidden" }}>
          <div style={{ height: 170, background: "var(--at-chip)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--at-muted)" }}>
            <CategoryIcon code={a.category.code} name={a.category.name} size={56} boxed={false} />
          </div>
          <div style={{ padding: "20px 22px" }}>
            <span className="tag">{a.assetTag}</span>
            <br />
            <b style={{ fontSize: 22 }}>{a.name}</b>
            <br />
            <small className="muted">Serial {a.serialNumber ?? "—"}</small>
          </div>
          <dl className="kv" style={{ padding: "0 22px 22px" }}>
            <dt>Handed over by</dt>
            <dd>{g.assignedBy.name}</dd>
            <dt>Date</dt>
            <dd>{formatDate(g.assignedAt)}</dd>
            <dt>Condition</dt>
            <dd>{CONDITION_LABELS[g.conditionAtAssignment]}</dd>
            <dt>Location</dt>
            <dd>{a.location?.name ?? "—"}</dd>
            <dt>Return by</dt>
            <dd>{formatDate(g.expectedReturnDate)}</dd>
            {g.remarks ? (
              <>
                <dt>Note</dt>
                <dd>{g.remarks}</dd>
              </>
            ) : null}
          </dl>
        </section>
        <HandoverForm assignmentId={g.id} items={items} signerName={g.employee.name} today={formatDate(new Date())} />
      </div>
    </>
  );
}
