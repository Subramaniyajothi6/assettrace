import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/format";
import { ReceiveForm } from "./ReceiveForm";

export const metadata = { title: "Receive return" };

export default async function ReceivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const r = await prisma.assetReturn.findFirst({
    where: { AND: [{ id }, { asset: managedAssetScope(user) }] },
    include: { asset: { include: { category: { select: { name: true, code: true } } } }, returnedBy: { select: { name: true } }, assignment: true },
  });
  if (!r) notFound();
  if (r.status !== "REQUESTED") {
    return (
      <EmptyState title={r.status === "RECEIVED" ? "Already received" : "This return is closed"}>
        {r.status === "RECEIVED" ? (
          <Link className="btn pri" href={`/returns/${r.id}/inspect`}>
            Go to inspection
          </Link>
        ) : (
          <Link className="btn" href="/returns">
            Back to returns
          </Link>
        )}
      </EmptyState>
    );
  }
  const a = r.asset;
  return (
    <>
      <PageHeader crumbs={[{ label: "Returns", href: "/returns" }, { label: r.returnNo }]} title="Receive a return" />
      {a.status === "UNDER_MAINTENANCE" ? (
        <div className="banner warn">
          <span>
            <b>It&apos;s still under maintenance.</b> Complete the maintenance first, then receive it.
          </span>
          <Link href={`/maintenance?status=open&q=${a.assetTag}`}>Open maintenance →</Link>
        </div>
      ) : null}
      <section className="card pad rise" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="ico" style={{ width: 56, height: 56 }}>
          <CategoryIcon code={a.category.code} name={a.category.name} size={26} boxed={false} />
        </span>
        <span style={{ flex: "1 1 220px" }}>
          <b style={{ fontSize: 20 }}>{a.name}</b>
          <br />
          <span className="tag">
            {a.assetTag} · {a.serialNumber ?? "—"}
          </span>
        </span>
        <span style={{ fontSize: 14 }}>
          <span className="muted">Returned by</span>
          <br />
          <b>{r.returnedBy.name}</b>
          <br />
          <span className="muted">held since {formatDate(r.assignment.assignedAt)}</span>
        </span>
      </section>
      <ReceiveForm id={r.id} accessories={r.assignment.accessories} receiver={user.name} holderFirstName={r.returnedBy.name.split(" ")[0]} />
    </>
  );
}
