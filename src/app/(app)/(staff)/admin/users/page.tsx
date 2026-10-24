import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { DEFAULT_TEMP_PASSWORD } from "@/server/services/employees";
import { PageHeader } from "@/components/PageHeader";
import { Denied } from "@/components/Denied";
import { ListToolbar } from "@/components/list/ListToolbar";
import { Pagination } from "@/components/list/Pagination";
import { TableCard } from "@/components/list/TableCard";
import { homeFor } from "@/components/shell/nav";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { ilike, paging, param, type SearchParams } from "@/lib/list";
import { CreateUserForm, ResetPassword, RoleSelect, UserToggle } from "./UserForms";

export const metadata = { title: "Users & roles" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireUser();
  if (me.role !== "ADMIN") return <Denied home={homeFor(me.role)} />;
  const sp = await searchParams;
  const q = param(sp, "q");
  const role = param(sp, "role");
  const status = param(sp, "status");
  const { page, skip, take, size } = paging(sp);

  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ name: ilike(q) }, { email: ilike(q) }] } : {}),
    ...(role ? { role: role as Prisma.EnumRoleFilter["equals"] } : {}),
    ...(status ? { isActive: status === "active" } : {}),
  };

  const [users, total, byRole, noLogin] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      skip,
      take,
      include: { managedDepartments: { select: { name: true } } },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.employee.findMany({ where: { userId: null, isActive: true }, select: { id: true, name: true, employeeCode: true }, orderBy: { name: "asc" } }),
  ]);
  const n = (r: string) => byRole.find((x) => x.role === r)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Admin", href: "/dashboard" }, { label: "Users" }]}
        title="Users & roles"
        actions={
          <span className="card" style={{ padding: "10px 16px", borderRadius: "var(--at-pill)" }}>
            <b>{n("ADMIN")}</b> admin · <b>{n("MANAGER")}</b> managers · <b>{n("EMPLOYEE")}</b> employees
          </span>
        }
      />
      <div className="kpis">
        <div className="hero-dark kpi rise">
          <b>Admin</b>
          <span className="muted" style={{ fontSize: 14 }}>
            Everything, including users, roles, master data and settings.
          </span>
        </div>
        <div className="hero-blue kpi rise" style={{ animationDelay: "60ms" }}>
          <b>Manager</b>
          <span className="muted" style={{ fontSize: 14 }}>
            Assets, assignments, maintenance and reports for their departments.
          </span>
        </div>
        <div className="card kpi rise" style={{ animationDelay: "120ms" }}>
          <b>Employee</b>
          <span className="muted" style={{ fontSize: 14 }}>
            Own assets only: sign handovers, report issues, make requests.
          </span>
        </div>
      </div>
      <ListToolbar
        placeholder="Search name or email"
        filters={[
          { key: "role", label: "Role", options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
        ]}
      />
      <div className="row">
        <div className="main-col">
          <TableCard
            head={
              <>
                <th>User</th>
                <th>Role</th>
                <th>Manages</th>
                <th>Last sign-in</th>
                <th>Active</th>
                <th>
                  <span className="sr">Password</span>
                </th>
              </>
            }
            empty={{ title: "No users match", text: "Try a different search." }}
            rows={users.map((u, i) => (
              <tr key={u.id} style={{ animationDelay: `${i * 35}ms`, opacity: u.isActive ? 1 : 0.55 }}>
                <td>
                  <b>{u.name}</b>
                  <br />
                  <small className="muted">{u.email}</small>
                </td>
                <td>
                  <RoleSelect id={u.id} name={u.name} role={u.role} self={u.id === me.id} />
                </td>
                <td className="muted" style={{ fontSize: 14 }}>
                  {u.role === "ADMIN" ? "All departments" : u.managedDepartments.map((d) => d.name).join(", ") || "—"}
                </td>
                <td className="muted" style={{ fontSize: 14 }}>
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                </td>
                <td>
                  <UserToggle id={u.id} name={u.name} active={u.isActive} self={u.id === me.id} />
                </td>
                <td>
                  <ResetPassword id={u.id} name={u.name} suggested={DEFAULT_TEMP_PASSWORD()} />
                </td>
              </tr>
            ))}
            footer={
              <>
                <small className="muted" style={{ display: "block", padding: "10px 16px 2px" }}>
                  Department managers are set on Master data → Departments.
                </small>
                <Pagination basePath="/admin/users" sp={sp} page={page} size={size} total={total} />
              </>
            }
          />
        </div>
        <CreateUserForm
          employees={noLogin.map((e) => ({ value: e.id, label: `${e.name} · ${e.employeeCode}` }))}
          suggested={DEFAULT_TEMP_PASSWORD()}
        />
      </div>
    </>
  );
}
