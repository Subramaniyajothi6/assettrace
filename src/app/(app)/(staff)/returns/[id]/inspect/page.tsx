import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/labels";
import { InspectionForm } from "./InspectionForm";

export const metadata = { title: "Inspection" };

export default async function InspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const r = await prisma.assetReturn.findFirst({
    where: { AND: [{ id }, { asset: managedAssetScope(user) }] },
    include: { asset: { include: { category: { select: { code: true } } } }, returnedBy: { select: { name: true } }, assignment: { select: { accessories: true } } },
  });
  if (!r) notFound();
  if (r.status !== "RECEIVED") {
    return (
      <EmptyState title={r.status === "INSPECTED" ? "Already inspected" : "Receive the asset first"}>
        <Link className="btn pri" href={r.status === "REQUESTED" ? `/returns/${r.id}/receive` : "/returns"}>
          {r.status === "REQUESTED" ? "Receive it" : "Back to returns"}
        </Link>
      </EmptyState>
    );
  }
  const present = r.assignment.accessories.filter((x) => !r.missingAccessories.includes(x));
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Returns", href: "/returns" }, { label: "Inspection" }]}
        title="Inspect returned asset"
        actions={
          <ol className="gap8" style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, fontWeight: 600 }}>
            <li className="pill s-ok">Requested</li>
            <li className="pill s-ok">Received</li>
            <li className="pill s-info" aria-current="step">
              Inspection
            </li>
            <li className="pill s-mute">Status updated</li>
          </ol>
        }
      />
      <div className="row">
        <aside className="card pad side rise" style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
          <span className="tag">
            {r.asset.assetTag} · {r.returnNo}
          </span>
          <b style={{ fontSize: 20 }}>{r.asset.name}</b>
          <StatusBadge status="RETURNED" label="Returned · awaiting inspection" />
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr", fontSize: 14 }}>
            <dt>Returned by</dt>
            <dd>{r.returnedBy.name}</dd>
            <dt>Received</dt>
            <dd>{formatDate(r.receivedAt)}</dd>
            <dt>Condition</dt>
            <dd>{r.condition ? CONDITION_LABELS[r.condition] : "—"}</dd>
            <dt>Missing</dt>
            <dd style={{ color: "#8E2A12" }}>{r.missingAccessories.join(", ") || "Nothing"}</dd>
            <dt>Damage</dt>
            <dd>{r.damage || "None noted"}</dd>
          </dl>
        </aside>
        <InspectionForm
          id={r.id}
          isLaptop={["LAP", "TAB", "MOB"].includes(r.asset.category.code)}
          defaults={{
            condition: r.condition && r.condition !== "NEW" ? r.condition : "GOOD",
            charger: !r.missingAccessories.includes("Charger"),
            damage: r.damage ?? "",
            missing: r.missingAccessories.join(", "),
          }}
          present={present}
        />
      </div>
    </>
  );
}
