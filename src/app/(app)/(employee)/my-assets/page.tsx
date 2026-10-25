import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { daysUntil } from "@/components/WarrantyCell";
import { formatDate, rupee } from "@/lib/format";
import { CONDITION_LABELS, HANDOVER_LABELS } from "@/lib/labels";
import { employeeOptions, locationOptions } from "@/server/queries/people";
import { MyAssetActions } from "./MyAssetActions";

export const metadata = { title: "My assets" };

export default async function MyAssetsPage() {
  const user = await requireUser();
  const assignments = user.employeeId
    ? await prisma.assignment.findMany({
        where: { employeeId: user.employeeId, isActive: true },
        orderBy: { assignedAt: "desc" },
        include: {
          asset: {
            include: {
              category: { select: { name: true, code: true } },
              returns: { where: { status: { in: ["REQUESTED", "RECEIVED"] } }, select: { id: true, status: true } },
              maintenance: { where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, select: { serviceProvider: true, expectedCompletion: true } },
              transfers: { where: { status: "REQUESTED" }, select: { transferNo: true } },
            },
          },
        },
      })
    : [];
  const [employees, locations] = assignments.length ? await Promise.all([employeeOptions(user.employeeId), locationOptions()]) : [[], []];
  const total = assignments.reduce((s, g) => s + Number(g.asset.purchaseCost ?? 0), 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/home" }, { label: "My assets" }]}
        title="My assets"
        actions={
          <span className="muted">
            {assignments.length} asset{assignments.length === 1 ? "" : "s"} · {rupee(total)} in your care
          </span>
        }
      />
      {assignments.length ? (
        assignments.map((g, i) => {
          const a = g.asset;
          const ret = a.returns[0];
          const m = a.maintenance[0];
          const pill =
            g.handoverStatus === "PENDING" ? (
              <StatusBadge status="RESERVED" label="Waiting for your signature" />
            ) : g.handoverStatus === "DISPUTED" ? (
              <StatusBadge status="DISPUTED" label="Problem reported" />
            ) : ret ? (
              <StatusBadge status="REQUESTED" label="Return requested" />
            ) : a.status === "UNDER_MAINTENANCE" ? (
              <StatusBadge status="UNDER_MAINTENANCE" label="At service centre" />
            ) : (
              <StatusBadge status="ASSIGNED" label="With you" />
            );
          const facts: [string, string][] = [
            ["Assigned", formatDate(g.assignedAt)],
            ["Handover", g.handoverStatus === "CONFIRMED" ? `Signed ${formatDate(g.handoverConfirmedAt)}` : HANDOVER_LABELS[g.handoverStatus]],
            ["Return by", formatDate(g.expectedReturnDate)],
            ["Condition", CONDITION_LABELS[a.condition]],
            ["Accessories", g.accessories.join(", ") || "—"],
            ["Warranty", a.warrantyEnd ? `${daysUntil(a.warrantyEnd) < 0 ? "Expired" : "Until"} ${formatDate(a.warrantyEnd)}` : "—"],
          ];
          if (m) facts.push(["Repair", `${m.serviceProvider ?? "Service centre"} · back ${m.expectedCompletion ? formatDate(m.expectedCompletion) : "soon"}`]);
          return (
            <article key={g.id} className="card pad rise" style={{ animationDelay: `${80 + i * 70}ms`, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
                <span className="ico" style={{ width: 64, height: 64 }}>
                  <CategoryIcon code={a.category.code} name={a.category.name} size={28} boxed={false} />
                </span>
                <span style={{ flex: "1 1 240px" }}>
                  <b style={{ fontSize: 20 }}>{a.name}</b>
                  <br />
                  <span className="tag">
                    {a.assetTag} · {a.serialNumber ?? a.category.name}
                  </span>
                </span>
                {pill}
              </div>
              <details>
                <summary className="btn sm" style={{ width: "fit-content", listStyle: "none" }}>
                  Details
                </summary>
                <div
                  className="rise"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                    gap: 12,
                    padding: 16,
                    marginTop: 12,
                    borderRadius: "var(--at-r2)",
                    background: "var(--at-chip)",
                    fontSize: 14,
                  }}
                >
                  {facts.map(([k, v]) => (
                    <span key={k}>
                      <span className="muted">{k}</span>
                      <br />
                      <b>{v}</b>
                    </span>
                  ))}
                </div>
              </details>
              <div className="gap8">
                {g.handoverStatus === "PENDING" ? (
                  <Link className="btn pri" href={`/my-assets/handover/${g.id}`}>
                    Review and sign
                  </Link>
                ) : null}
                <MyAssetActions
                  assetId={a.id}
                  canMove={g.handoverStatus === "CONFIRMED" && !ret && a.status === "ASSIGNED"}
                  pendingTransferNo={a.transfers[0]?.transferNo ?? null}
                  employees={employees}
                  locations={locations}
                  locationId={a.locationId}
                />
                <Link className="btn" href="/my-history">
                  View history
                </Link>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState title="No assets assigned to you" action={{ label: "New request", href: "/my-requests?new=1&type=NEW_ASSET" }}>
          Need equipment? Send a request.
        </EmptyState>
      )}
    </>
  );
}
