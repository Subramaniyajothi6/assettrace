import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { CONDITION_LABELS, INSPECTION_RESULT_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";

export const metadata = { title: "Inspections" };

const TONE = { GOOD: "ok", MINOR_REPAIR_REQUIRED: "wait", MAJOR_REPAIR_REQUIRED: "wait", DAMAGED: "bad", RETIRE: "mute" } as const;

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const result = param(sp, "result");
  const { page, skip, take, size } = paging(sp);
  const where: Prisma.AssetInspectionWhereInput = {
    AND: [
      { asset: managedAssetScope(user) },
      result ? { result: result as Prisma.EnumInspectionResultFilter["equals"] } : {},
      q ? { OR: [{ asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }, { assetReturn: { returnNo: ilike(q) } }] } : {},
    ],
  };
  const [rows, total, awaiting] = await Promise.all([
    prisma.assetInspection.findMany({
      where,
      orderBy: { inspectedAt: "desc" },
      skip,
      take,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        assetReturn: { select: { returnNo: true, returnedBy: { select: { name: true } } } },
        inspectedBy: { select: { name: true } },
      },
    }),
    prisma.assetInspection.count({ where }),
    prisma.assetReturn.count({ where: { status: "RECEIVED", asset: managedAssetScope(user) } }),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Returns", href: "/returns" }, { label: "Inspections" }]}
        title="Inspections"
        actions={
          awaiting ? (
            <Link className="btn pri" href="/returns?tab=received">
              {awaiting} waiting for inspection
            </Link>
          ) : null
        }
      />
      <ListToolbar
        placeholder="Asset or return no."
        filters={[{ key: "result", label: "Result", options: Object.entries(INSPECTION_RESULT_LABELS).map(([value, label]) => ({ value, label: label.split(" — ")[0] })) }]}
      />
      <TableCard
        head={
          <>
            <th>Date</th>
            <th>Asset</th>
            <th>Return</th>
            <th>Condition</th>
            <th>Functional</th>
            <th>Result</th>
            <th>Inspector</th>
          </>
        }
        empty={{ title: "No inspections yet", text: "Inspections are recorded after a return is received." }}
        rows={rows.map((x, i) => (
          <tr key={x.id} style={{ animationDelay: `${i * 35}ms` }}>
            <td style={{ color: "var(--at-soft)" }}>{formatDate(x.inspectedAt)}</td>
            <td>
              <Link className="cell" href={`/assets/${x.asset.id}?tab=returns`}>
                <span>{x.asset.name}</span>
                <span className="tag">{x.asset.assetTag}</span>
              </Link>
            </td>
            <td>
              <span className="tag">{x.assetReturn?.returnNo ?? "—"}</span>
              <br />
              <small className="muted">{x.assetReturn?.returnedBy.name}</small>
            </td>
            <td>{CONDITION_LABELS[x.physicalCondition]}</td>
            <td>{x.isFunctional ? "Yes" : "No"}</td>
            <td>
              <StatusBadge status={TONE[x.result] === "ok" ? "COMPLETED" : TONE[x.result] === "bad" ? "REJECTED" : TONE[x.result] === "wait" ? "PENDING" : "CLOSED"} label={INSPECTION_RESULT_LABELS[x.result].split(" — ")[0]} />
            </td>
            <td className="muted">{x.inspectedBy.name}</td>
          </tr>
        ))}
        footer={<Pagination basePath="/inspections" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
