import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, TriangleAlert } from "lucide-react";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { daysUntil } from "@/components/WarrantyCell";
import { formatDate, rupee } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/labels";
import { param, type SearchParams } from "@/lib/list";
import { RetireForm } from "./RetireForm";

export const metadata = { title: "Retire asset" };

export default async function RetirePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const a = await prisma.asset.findFirst({
    where: { AND: [{ id }, managedAssetScope(user)] },
    include: {
      currentHolder: { select: { name: true } },
      maintenance: { select: { cost: true, status: true } },
      returns: { where: { status: { in: ["RECEIVED", "INSPECTED"] } }, orderBy: { receivedAt: "desc" }, take: 1, select: { status: true } },
      _count: { select: { assignments: true } },
    },
  });
  if (!a) notFound();
  const crumbs = [{ label: "Assets", href: "/assets" }, { label: a.assetTag, href: `/assets/${a.id}` }, { label: "Retire" }];

  if (a.status === "RETIRED") {
    return (
      <EmptyState icon={<Lock size={30} />} title="Already retired" action={{ label: "View record", href: `/assets/${a.id}` }}>
        Retired assets are read-only.
      </EmptyState>
    );
  }
  const blocker =
    a.currentHolder || a.status === "ASSIGNED"
      ? `This asset is assigned to ${a.currentHolder?.name ?? "someone"}. Request and receive the return first, then retire it.`
      : a.status === "RETURNED" && a.returns[0]?.status !== "INSPECTED"
        ? "This asset was returned and hasn't been inspected yet. Inspect it first."
        : a.status === "RESERVED"
          ? "Reserved assets can't be retired. Make it available first."
          : null;
  if (blocker) {
    return (
      <>
        <PageHeader crumbs={crumbs} title={`Retire ${a.name}`} />
        <div className="banner bad">
          <TriangleAlert size={20} />
          <span>
            <b>Can&apos;t retire yet.</b> {blocker}
          </span>
          <Link href={`/assets/${a.id}`}>Back to the asset →</Link>
        </div>
      </>
    );
  }
  const repairs = a.maintenance.filter((m) => m.status !== "CANCELLED");
  const openRepairs = a.maintenance.filter((m) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS").length;
  return (
    <>
      <PageHeader crumbs={crumbs} title={`Retire ${a.name}`} />
      {param(sp, "from") === "inspection" ? (
        <div className="banner info rise">
          <span>
            <b>Inspection saved with result “Retire”.</b> Complete the retirement below.
          </span>
        </div>
      ) : null}
      <div className="banner bad rise" role="note">
        <Lock size={20} />
        <span>
          <b>Retiring is permanent.</b> The asset can&apos;t be assigned again. Its record, history and reports stay available.
          {openRepairs ? ` ${openRepairs} open maintenance record(s) will be cancelled.` : ""}
        </span>
      </div>
      <div className="row">
        <RetireForm assetId={a.id} tag={a.assetTag} authorizer={user.name} condition={a.condition === "NEW" ? "GOOD" : a.condition} />
        <aside className="card pad side rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={{ fontSize: 16 }}>Asset at a glance</b>
          <dl className="kv" style={{ gridTemplateColumns: "120px 1fr", fontSize: 14 }}>
            <dt>Status</dt>
            <dd>{STATUS_LABELS[a.status]}</dd>
            <dt>Purchased</dt>
            <dd>
              {formatDate(a.purchaseDate)} · {rupee(a.purchaseCost)}
            </dd>
            <dt>Warranty</dt>
            <dd>{a.warrantyEnd ? `${daysUntil(a.warrantyEnd) < 0 ? "Expired" : "Until"} ${formatDate(a.warrantyEnd)}` : "—"}</dd>
            <dt>Repairs</dt>
            <dd>
              {repairs.length} · {rupee(repairs.reduce((s, m) => s + Number(m.cost), 0))}
            </dd>
            <dt>Holders</dt>
            <dd>{a._count.assignments}</dd>
          </dl>
        </aside>
      </div>
    </>
  );
}
