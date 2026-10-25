import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { logoutAction } from "@/actions/auth";
import { PageHeader } from "@/components/PageHeader";
import { Initials } from "@/components/Initials";
import { PasswordForm } from "@/components/PasswordForm";
import { homeFor } from "@/components/shell/nav";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [row, emp, managed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { lastLoginAt: true, createdAt: true } }),
    user.employeeId
      ? prisma.employee.findUnique({ where: { id: user.employeeId }, include: { department: true, location: true, _count: { select: { currentAssets: true } } } })
      : null,
    user.role === "MANAGER" ? prisma.department.findMany({ where: { id: { in: user.managedDepartmentIds } }, select: { name: true } }) : [],
  ]);

  return (
    <>
      <PageHeader crumbs={[{ label: "AssetTrace", href: homeFor(user.role) }, { label: "Profile" }]} title="Your profile" />
      <div className="row">
        <section className="hero-dark pad side rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Initials name={user.name} className="profile-av" />
          <div>
            <b style={{ fontSize: 26 }}>{user.name}</b>
            <br />
            <small>
              {ROLE_LABELS[user.role]}
              {emp ? ` · ${emp.employeeCode}` : ""}
            </small>
          </div>
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Designation</dt>
            <dd>{emp?.designation ?? "—"}</dd>
            <dt>Department</dt>
            <dd>{emp?.department.name ?? "—"}</dd>
            {user.role === "MANAGER" ? (
              <>
                <dt>Manages</dt>
                <dd>{managed.map((d) => d.name).join(", ") || "—"}</dd>
              </>
            ) : null}
            <dt>Location</dt>
            <dd>{emp?.location?.name ?? "—"}</dd>
            <dt>Assets held</dt>
            <dd>{emp?._count.currentAssets ?? 0}</dd>
            <dt>Last sign-in</dt>
            <dd>{row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "—"}</dd>
          </dl>
          <form action={logoutAction}>
            <button type="submit" className="btn" style={{ width: "100%", background: "transparent", color: "var(--at-hd-ink)", borderColor: "var(--at-hd-sub)" }}>
              Sign out
            </button>
          </form>
        </section>
        <div className="main-col stack">
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
