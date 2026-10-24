import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { employeeScope, requireUser } from "@/server/permissions";
import { DEFAULT_TEMP_PASSWORD } from "@/server/services/employees";
import { PageHeader } from "@/components/PageHeader";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { homeFor } from "@/components/shell/nav";
import { ROLE_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { AddEmployeeForm, EditEmployee, EmployeeToggle } from "./EmployeeForms";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = param(sp, "q");
  const dept = param(sp, "dept");
  const loc = param(sp, "loc");
  const status = param(sp, "status");
  const { page, skip, take, size } = paging(sp);

  const where: Prisma.EmployeeWhereInput = {
    AND: [
      employeeScope(user),
      q ? { OR: [{ name: ilike(q) }, { email: ilike(q) }, { employeeCode: ilike(q) }, { designation: ilike(q) }] } : {},
      dept ? { departmentId: dept } : {},
      loc ? { locationId: loc } : {},
      status ? { isActive: status === "active" } : {},
    ],
  };

  const deptWhere = user.role === "ADMIN" ? { isActive: true } : { isActive: true, id: { in: user.managedDepartmentIds } };
  const [rows, total, departments, locations, seq] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip,
      take,
      include: {
        department: { select: { name: true } },
        location: { select: { name: true } },
        user: { select: { role: true, isActive: true } },
        _count: { select: { currentAssets: true } },
      },
    }),
    prisma.employee.count({ where }),
    prisma.department.findMany({ where: deptWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.sequence.findUnique({ where: { name: "EMP" } }),
  ]);
  const deptOpts = departments.map((d) => ({ value: d.id, label: d.name }));
  const locOpts = locations.map((l) => ({ value: l.id, label: l.name }));
  const nextCode = `EMP-${String((seq?.value ?? 0) + 1).padStart(4, "0")}`;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "AssetTrace", href: homeFor(user.role) }, { label: "Employees" }]}
        title="Employees"
        actions={
          <Link className="btn" href="/admin/locations">
            Locations
          </Link>
        }
      />
      <ListToolbar
        placeholder="Search name, email or code"
        filters={[
          { key: "dept", label: "Department", options: deptOpts },
          { key: "loc", label: "Location", options: locOpts },
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
        ]}
      />
      <div className="row">
        <div className="main-col">
          <TableCard
            head={
              <>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Location</th>
                <th>Assets held</th>
                <th>Login</th>
                <th>Status</th>
                <th>Active</th>
                <th>
                  <span className="sr">Edit</span>
                </th>
              </>
            }
            empty={{ title: q || dept || loc || status ? "No matches" : "No employees yet", text: "Try a different search or add an employee." }}
            rows={rows.map((e, i) => (
              <tr key={e.id} style={{ animationDelay: `${i * 35}ms`, opacity: e.isActive ? 1 : 0.55 }}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Initials name={e.name} small />
                    <span>
                      <b>{e.name}</b>
                      <br />
                      <small className="muted">{e.designation ?? e.email}</small>
                    </span>
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {e.employeeCode}
                </td>
                <td>{e.department.name}</td>
                <td className="muted">{e.location?.name ?? "—"}</td>
                <td>
                  <b>{e._count.currentAssets}</b>
                </td>
                <td className="muted" style={{ fontSize: 14 }}>
                  {e.user ? `${ROLE_LABELS[e.user.role]}${e.user.isActive ? "" : " (off)"}` : "No login"}
                </td>
                <td>{e.isActive ? <StatusBadge status="COMPLETED" label="Active" /> : <StatusBadge status="CANCELLED" label="Inactive" />}</td>
                <td>
                  <EmployeeToggle id={e.id} name={e.name} active={e.isActive} />
                </td>
                <td>
                  <EditEmployee
                    v={{ id: e.id, name: e.name, email: e.email, phone: e.phone, designation: e.designation, departmentId: e.departmentId, locationId: e.locationId }}
                    departments={deptOpts}
                    locations={locOpts}
                  />
                </td>
              </tr>
            ))}
            footer={<Pagination basePath="/employees" sp={sp} page={page} size={size} total={total} />}
          />
        </div>
        <AddEmployeeForm departments={deptOpts} locations={locOpts} nextCode={nextCode} tempPassword={DEFAULT_TEMP_PASSWORD()} />
      </div>
    </>
  );
}
