import Link from "next/link";
import { Lock } from "lucide-react";
import { prisma } from "@/server/db";
import { assetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Scan result" };

/**
 * QR landing page (ARCHITECTURE.md §5 "QR"). Middleware already sent signed-out users to /login and back.
 * Out-of-scope users get no details at all — not even the holder's name.
 */
export default async function ScanResultPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  const user = await requireUser();
  const exists = await prisma.asset.findUnique({ where: { qrToken }, select: { id: true } });
  if (!exists) {
    return (
      <EmptyState title="Unknown label" action={{ label: "Scan again", href: "/scan" }}>
        This QR code isn&apos;t registered in AssetTrace.
      </EmptyState>
    );
  }
  const a = await prisma.asset.findFirst({
    where: { AND: [{ qrToken }, assetScope(user)] },
    include: { currentHolder: { select: { name: true } }, location: { select: { name: true } } },
  });
  if (!a) {
    return (
      <EmptyState icon={<Lock size={34} />} title="You don't have access to this asset" action={{ label: "Scan another", href: "/scan" }}>
        This label belongs to an asset outside your access. No details are shown. If you found it unattended, tell the IT desk or your asset manager.
      </EmptyState>
    );
  }
  const own = !!user.employeeId && a.currentHolderId === user.employeeId;
  const staff = user.role !== "EMPLOYEE" && (user.role === "ADMIN" || (!!a.departmentId && user.managedDepartmentIds.includes(a.departmentId)));

  return (
    <>
      <PageHeader crumbs={[{ label: "Scan QR", href: "/scan" }, { label: a.assetTag }]} title={a.name} />
      <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
        <StatusBadge status="COMPLETED" label="Match found" />
        <dl className="kv">
          <dt>Asset ID</dt>
          <dd className="mono">{a.assetTag}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={a.status} />
          </dd>
          <dt>Assigned to</dt>
          <dd>{a.currentHolder?.name ?? "—"}</dd>
          <dt>Location</dt>
          <dd>{a.location?.name ?? "—"}</dd>
          <dt>Warranty</dt>
          <dd>{a.warrantyEnd ? `until ${formatDate(a.warrantyEnd)}` : "—"}</dd>
        </dl>
        <div className="gap8">
          {staff ? (
            <Link className="btn pri" href={`/assets/${a.id}`}>
              Open full record
            </Link>
          ) : null}
          {own ? (
            <>
              <Link className={staff ? "btn" : "btn pri"} href="/my-assets">
                Open in my assets
              </Link>
              <Link className="btn" href={`/report-issue?asset=${a.id}`}>
                Report an issue
              </Link>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
