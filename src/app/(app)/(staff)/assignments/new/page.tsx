import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { param, type SearchParams } from "@/lib/list";
import { AssignForm } from "./AssignForm";

export const metadata = { title: "Assign asset" };

export default async function AssignPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const empWhere = user.role === "ADMIN" ? { isActive: true } : { isActive: true, departmentId: { in: user.managedDepartmentIds } };
  const [pool, employees, locations] = await Promise.all([
    prisma.asset.findMany({
      where: { AND: [managedAssetScope(user), { status: { in: ["AVAILABLE", "RESERVED"] } }] },
      select: { id: true, assetTag: true, name: true, status: true, condition: true, locationId: true, category: { select: { code: true } } },
      orderBy: [{ status: "asc" }, { assetTag: "asc" }],
    }),
    prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        locationId: true,
        department: { select: { name: true } },
        _count: { select: { currentAssets: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const header = <PageHeader crumbs={[{ label: "Assignments", href: "/assignments" }, { label: "New" }]} title="Assign an asset" />;
  if (!pool.length) {
    return (
      <>
        {header}
        <EmptyState title="Nothing to assign" action={{ label: "Register asset", href: "/assets/new" }}>
          Every asset in your scope is in use. Register a new one first.
        </EmptyState>
      </>
    );
  }
  return (
    <>
      {header}
      <AssignForm
        pool={pool.map((a) => ({ id: a.id, tag: a.assetTag, name: a.name, status: a.status, condition: a.condition, locationId: a.locationId, code: a.category.code }))}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          code: e.employeeCode,
          dept: e.department.name,
          locationId: e.locationId,
          holds: e._count.currentAssets,
        }))}
        locations={locations.map((l) => ({ value: l.id, label: l.name }))}
        initialAssetId={param(sp, "asset")}
        initialEmployeeId={param(sp, "employee")}
      />
    </>
  );
}
