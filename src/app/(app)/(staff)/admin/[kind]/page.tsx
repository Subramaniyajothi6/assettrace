import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { PageHeader } from "@/components/PageHeader";
import { Denied } from "@/components/Denied";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { homeFor } from "@/components/shell/nav";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { MASTER_KINDS, type MasterKind } from "@/lib/validation/masterdata";
import { AddMasterForm, EditMaster, MasterToggle, type MasterValues } from "./MasterForms";
import { TabIndicator } from "@/components/motion/TabIndicator";

export const metadata = { title: "Master data" };

const TABS: { kind: MasterKind; label: string }[] = [
  { kind: "departments", label: "Departments" },
  { kind: "locations", label: "Locations" },
  { kind: "categories", label: "Categories" },
  { kind: "vendors", label: "Vendors" },
];

type Row = { values: MasterValues; active: boolean; cells: React.ReactNode[] };

export default async function MasterPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<SearchParams> }) {
  const { kind: raw } = await params;
  if (!(MASTER_KINDS as readonly string[]).includes(raw)) notFound();
  const kind = raw as MasterKind;
  const user = await requireUser();
  // Locations: managers too. Everything else: admin only.
  if (user.role !== "ADMIN" && !(kind === "locations" && user.role === "MANAGER")) return <Denied home={homeFor(user.role)} />;

  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const { page, skip, take, size } = paging(sp);
  const active = status === "active" ? true : status === "inactive" ? false : undefined;
  const nameWhere = { ...(q ? { name: ilike(q) } : {}), ...(active !== undefined ? { isActive: active } : {}) };

  let rows: Row[] = [];
  let total = 0;
  let head: string[] = [];

  if (kind === "departments") {
    head = ["Department name", "Code", "Managers", "Employees", "Assets"];
    const [list, n] = await Promise.all([
      prisma.department.findMany({
        where: nameWhere,
        orderBy: { name: "asc" },
        skip,
        take,
        include: { managers: { select: { id: true, name: true } }, _count: { select: { employees: true, assets: true } } },
      }),
      prisma.department.count({ where: nameWhere }),
    ]);
    total = n;
    rows = list.map((d) => ({
      active: d.isActive,
      values: { id: d.id, name: d.name, code: d.code, managerIds: d.managers.map((m) => m.id) },
      cells: [d.code, d.managers.map((m) => m.name).join(", ") || "—", d._count.employees, d._count.assets],
    }));
  } else if (kind === "locations") {
    head = ["Name", "Code", "Address", "Employees", "Assets"];
    const [list, n] = await Promise.all([
      prisma.location.findMany({ where: nameWhere, orderBy: { name: "asc" }, skip, take, include: { _count: { select: { employees: true, assets: true } } } }),
      prisma.location.count({ where: nameWhere }),
    ]);
    total = n;
    rows = list.map((l) => ({
      active: l.isActive,
      values: { id: l.id, name: l.name, code: l.code, address: l.address },
      cells: [l.code, l.address ?? "—", l._count.employees, l._count.assets],
    }));
  } else if (kind === "categories") {
    head = ["Name", "Code", "Next asset ID", "Assets"];
    const { assetTagPrefix } = await getSettings();
    const [list, n, seqs] = await Promise.all([
      prisma.assetCategory.findMany({ where: nameWhere, orderBy: { name: "asc" }, skip, take, include: { _count: { select: { assets: true } } } }),
      prisma.assetCategory.count({ where: nameWhere }),
      prisma.sequence.findMany({ where: { name: { startsWith: "AST-" } } }),
    ]);
    total = n;
    const seq = Object.fromEntries(seqs.map((s) => [s.name, s.value]));
    rows = list.map((c) => ({
      active: c.isActive,
      values: { id: c.id, name: c.name, code: c.code, description: c.description },
      cells: [
        c.code,
        <span key="t" className="tag">{`${assetTagPrefix}-${c.code}-${String((seq[`AST-${c.code}`] ?? 0) + 1).padStart(4, "0")}`}</span>,
        c._count.assets,
      ],
    }));
  } else {
    head = ["Vendor", "Contact", "Phone", "Assets bought"];
    const [list, n] = await Promise.all([
      prisma.vendor.findMany({ where: nameWhere, orderBy: { name: "asc" }, skip, take, include: { _count: { select: { assets: true } } } }),
      prisma.vendor.count({ where: nameWhere }),
    ]);
    total = n;
    rows = list.map((v) => ({
      active: v.isActive,
      values: { id: v.id, name: v.name, contactName: v.contactName, email: v.email, phone: v.phone },
      cells: [v.contactName ?? "—", v.phone ?? "—", v._count.assets],
    }));
  }

  const managers =
    kind === "departments"
      ? await prisma.user.findMany({ where: { role: "MANAGER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [];

  const tabs = user.role === "ADMIN" ? TABS : TABS.filter((t) => t.kind === "locations");

  return (
    <>
      <PageHeader
        crumbs={[{ label: user.role === "ADMIN" ? "Admin" : "AssetTrace", href: homeFor(user.role) }, { label: "Master data" }]}
        title="Master data"
        actions={
          <nav className="tabs" aria-label="Master data">
            <TabIndicator />
            {tabs.map((t) => (
              <Link key={t.kind} href={`/admin/${t.kind}`} aria-current={t.kind === kind ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        }
      />
      <ListToolbar
        placeholder={`Search ${kind}`}
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
      />
      <div className="row">
        <div className="main-col">
          <TableCard
            head={
              <>
                {head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th>Active</th>
                <th>
                  <span className="sr">Edit</span>
                </th>
              </>
            }
            empty={{ title: q ? "No matches" : `No ${kind} yet`, text: q ? "Try a different search." : "Add the first one with the form." }}
            rows={rows.map((r, i) => (
              <tr key={r.values.id} style={{ animationDelay: `${i * 35}ms`, opacity: r.active ? 1 : 0.55 }}>
                <td>
                  <b>{r.values.name}</b>
                </td>
                {r.cells.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
                <td>
                  <MasterToggle kind={kind} id={r.values.id!} name={r.values.name!} active={r.active} />
                </td>
                <td>
                  <EditMaster kind={kind} v={r.values} managers={managers} />
                </td>
              </tr>
            ))}
            footer={
              <>
                <small className="muted" style={{ display: "block", padding: "10px 16px 2px" }}>
                  Records are deactivated, never deleted, so old assets and history keep their names.
                </small>
                <Pagination basePath={`/admin/${kind}`} sp={sp} page={page} size={size} total={total} />
              </>
            }
          />
        </div>
        <AddMasterForm kind={kind} managers={managers} />
      </div>
    </>
  );
}
