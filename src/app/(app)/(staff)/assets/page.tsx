import Link from "next/link";
import { Boxes, CircleCheck, Plus, SearchCheck, ShieldAlert } from "lucide-react";
import type { AssetStatus } from "@prisma/client";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { assetFormOptions, listAssets } from "@/server/queries/assets";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { WarrantyCell } from "@/components/WarrantyCell";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatTile } from "@/components/StatTile";
import { CONDITION_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";
import { param, type SearchParams } from "@/lib/list";

export const metadata = { title: "Assets" };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { warrantyAlertDays } = await getSettings();
  const [{ rows, total, page, size, kpis }, opts] = await Promise.all([listAssets(user, sp, warrantyAlertDays), assetFormOptions(user)]);
  const filtered = Object.keys(sp).some((k) => k !== "page" && param(sp, k));
  const years = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i));

  const statusOrder = Object.keys(STATUS_LABELS) as AssetStatus[];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: "/dashboard" }, { label: "Assets" }]}
        title="Assets"
        actions={
          <>
            <Link className="btn" href="/scan">
              Scan QR
            </Link>
            <Link className="btn pri" href="/assets/new">
              <Plus size={17} /> Register asset
            </Link>
          </>
        }
      />
      <div className="kpis">
        <StatTile
          variant="dark"
          icon={Boxes}
          label="In this view"
          value={total}
          sub={`${kpis.inScope} in your scope`}
          bar={{ total, segments: statusOrder.map((s) => ({ label: STATUS_LABELS[s], value: kpis.inView[s] ?? 0, color: STATUS_COLORS[s] })) }}
          delay={80}
        />
        <StatTile
          variant="blue"
          icon={CircleCheck}
          label="Ready to assign"
          value={kpis.available}
          sub={`${kpis.reserved} reserved`}
          bar={{ total: kpis.inScope, segments: [{ label: "Available", value: kpis.available, color: STATUS_COLORS.AVAILABLE }] }}
          delay={140}
        />
        <StatTile
          icon={ShieldAlert}
          label="Warranty ending soon"
          value={kpis.warrantySoon}
          sub={`within ${warrantyAlertDays} days`}
          bar={{ total: kpis.inScope, segments: [{ label: "Ending soon", value: kpis.warrantySoon, color: STATUS_COLORS.UNDER_MAINTENANCE }] }}
          href="/assets?warranty=soon"
          delay={200}
        />
        <StatTile
          icon={SearchCheck}
          label="Not inspected after return"
          value={kpis.returned}
          sub="blocks reassignment"
          bar={{ total: kpis.inScope, segments: [{ label: "Returned", value: kpis.returned, color: STATUS_COLORS.RETURNED }] }}
          href="/assets?status=RETURNED"
          delay={260}
        />
      </div>
      <ListToolbar
        placeholder="Asset ID, serial no., name, brand or employee"
        filters={[
          { key: "category", label: "Category", options: opts.categories.map((c) => ({ value: c.id, label: c.name })) },
          { key: "status", label: "Status", options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "location", label: "Location", options: opts.locations.map((l) => ({ value: l.id, label: l.name })) },
          { key: "department", label: "Department", options: opts.departments.map((d) => ({ value: d.id, label: d.name })) },
          { key: "condition", label: "Condition", options: Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "brand", label: "Brand", options: opts.brands.map((b) => ({ value: b, label: b })) },
          {
            key: "warranty",
            label: "Warranty",
            options: [
              { value: "active", label: "Active" },
              { value: "soon", label: `Ending in ${warrantyAlertDays} days` },
              { value: "expired", label: "Expired" },
              { value: "none", label: "No warranty" },
            ],
          },
          { key: "year", label: "Purchase year", options: years.map((y) => ({ value: y, label: y })) },
        ]}
      />
      <TableCard
        head={
          <>
            <th>Asset</th>
            <th>Category</th>
            <th>Serial no.</th>
            <th>Status</th>
            <th>With</th>
            <th>Location</th>
            <th>Condition</th>
            <th>Warranty</th>
          </>
        }
        empty={
          filtered
            ? { title: "No assets match", text: "Try a different search or clear the filters." }
            : { title: "No assets yet", text: "Register the first one.", action: { label: "Register asset", href: "/assets/new" } }
        }
        rows={rows.map((a, i) => (
          <tr key={a.id} style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}>
            <td>
              <Link className="cell" href={`/assets/${a.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CategoryIcon code={a.category.code} />
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span className="tag">{a.assetTag}</span>
                </span>
              </Link>
            </td>
            <td>
              <Link href={`/assets?category=${a.categoryId}`} style={{ color: "var(--at-soft)", textDecoration: "none" }} title={`Show all ${a.category.name.toLowerCase()} assets`}>
                {a.category.name}
              </Link>
            </td>
            <td className="mono" style={{ fontSize: 12, color: "var(--at-soft)" }}>
              {a.serialNumber ?? "—"}
            </td>
            <td>
              <StatusBadge status={a.status} />
            </td>
            <td>
              {a.currentHolder ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Initials name={a.currentHolder.name} small />
                  {a.currentHolder.name}
                </span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td style={{ color: "var(--at-soft)" }}>{a.location?.name ?? "—"}</td>
            <td style={{ color: "var(--at-soft)" }}>{CONDITION_LABELS[a.condition]}</td>
            <td>
              <WarrantyCell end={a.warrantyEnd} retired={a.status === "RETIRED"} alertDays={warrantyAlertDays} />
            </td>
          </tr>
        ))}
        footer={<Pagination basePath="/assets" sp={sp} page={page} size={size} total={total} />}
      />
    </>
  );
}
