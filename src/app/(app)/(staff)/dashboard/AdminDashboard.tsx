import Link from "next/link";
import { Boxes, Building2, Plus, UserRoundX, Users } from "lucide-react";
import { AGE_BANDS, type AdminOverview } from "@/server/queries/admin";
import type { getActionItems, StaffDashboard } from "@/server/queries/dashboard";
import { StatTile, StatusKey } from "@/components/StatTile";
import { Initials } from "@/components/Initials";
import { BreakdownCard, ChartCard, ColumnChart, SpendChart, TrendChart } from "@/components/charts/Charts";
import { firstName, formatDate, formatDateTime, greeting, longDay, rupeeShort } from "@/lib/format";
import { ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";

type Props = {
  data: AdminOverview;
  d: StaffDashboard;
  actions: Awaited<ReturnType<typeof getActionItems>>;
  name: string;
  now: Date;
};

/** Newest to oldest; "Unknown" (no purchase date) is grey. */
const AGE_COLORS = ["#C3D5F0", "#7FA4DA", "#3A6BB8", "#1F3F6E", "#B0AAA0"];
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The admin's Dashboard (layout B): assets and departments in a wide main column, people and to-dos in a
 * side panel that stays in view. Built for running the organisation; the manager's task list and location
 * rows stay on the manager Dashboard.
 */
export function AdminDashboard({ data, d, actions, name, now }: Props) {
  const { departments, unmanaged, totals, users, charts } = data;
  const unmanagedAssets = unmanaged.reduce((n, x) => n + x.total, 0);
  const statuses = STATUS_ORDER.filter((s) => departments.some((x) => x.statuses.some((y) => y.status === s && y.count)));
  const count = (...tags: string[]) => actions.filter((a) => tags.includes(a.tag)).length;
  const work = [
    { label: "Handovers to sign", value: d.pendingHandovers, href: "/assignments?tab=pending" },
    { label: "Returns to process", value: count("RET", "INS"), href: "/returns" },
    { label: "Transfers to decide", value: count("TRF"), href: "/transfers" },
    { label: "Requests open", value: d.pendingRequests, href: "/requests?status=open" },
    { label: "Issues open", value: d.openIssues, href: "/issues" },
    { label: "In maintenance", value: d.counts.maintenance, href: "/maintenance?status=open" },
  ];
  const waiting = work.reduce((n, w) => n + w.value, 0);
  const todo = [
    ...unmanaged.map((x) => ({
      key: x.id,
      tag: x.code,
      tone: "bad",
      title: `${x.name} has no manager`,
      sub: `${plural(x.total, "asset")}, ${plural(x.people, "person", "people")}`,
      cta: "Add manager",
      href: "/admin/departments",
    })),
    ...(data.employeesWithoutLogin
      ? [{ key: "logins", tag: "USR", tone: "wait", title: `${plural(data.employeesWithoutLogin, "employee")} can't sign in`, sub: "No user account yet", cta: "Create logins", href: "/admin/users" }]
      : []),
    ...(users.tempPasswords
      ? [{ key: "pwd", tag: "PWD", tone: "wait", title: `${plural(users.tempPasswords, "temporary password")} not changed`, sub: "Not signed in since the account was created or reset", cta: "Open users", href: "/admin/users" }]
      : []),
  ];

  return (
    <div className="admin-dash">
      <div className="admin-main">
        <section className="card pad rise" style={{ background: "var(--at-greet)", animationDelay: "120ms", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "var(--at-alert)" }}>{longDay(now)}</span>
            <h2 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-.02em" }}>
              {greeting(now)}, {firstName(name)}.
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "var(--at-soft)" }}>
              {unmanaged.length ? (
                <Link href="/admin/departments" style={{ color: "var(--at-t-bad)", fontWeight: 700, textDecoration: "none" }}>
                  {unmanaged.length === 1 ? "1 department has" : `${unmanaged.length} departments have`} no manager
                </Link>
              ) : (
                "Every department has a manager"
              )}
              {data.employeesWithoutLogin ? (
                <>
                  , <b style={{ color: "var(--at-ink)" }}>{plural(data.employeesWithoutLogin, "employee")}</b> can&apos;t sign in yet
                </>
              ) : null}
              , and across all departments <b style={{ color: "var(--at-ink)" }}>{plural(waiting, "item")}</b> {waiting === 1 ? "is" : "are"} waiting on someone.
            </p>
          </div>
          <div className="gap8">
            <Link className="btn pri" href="/admin/users">
              <Plus size={17} /> Add user
            </Link>
            <Link className="btn" href="/admin/departments">
              Master data
            </Link>
            <Link className="btn" href="/reports">
              Reports
            </Link>
            <Link className="btn" href="/activity">
              All activity
            </Link>
          </div>
        </section>

        <div className="kpis">
          <StatTile variant="dark" icon={Building2} label="Departments" value={departments.length} sub={plural(totals.people, "person", "people")} href="/admin/departments" delay={160} />
          <StatTile variant="blue" icon={Boxes} label="Assets" value={totals.assets} sub={`${rupeeShort(totals.value)} · ${totals.inUse} in use`} href="/assets" delay={200} />
          <StatTile
            icon={UserRoundX}
            label="Without a manager"
            value={unmanaged.length}
            tone="bad"
            sub={unmanaged.length ? `${plural(unmanagedAssets, "asset")} only you can manage` : "Every department has one"}
            href="/admin/departments"
            delay={240}
          />
          <StatTile icon={Users} label="Can sign in" value={data.employees - data.employeesWithoutLogin} sub={`of ${plural(data.employees, "employee")}`} href="/admin/users" delay={280} />
        </div>

        <section className="card pad rise" style={{ animationDelay: "300ms", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <h2 className="h2">Departments</h2>
            <small className="muted">Active assets · click a department for its assets</small>
          </div>
          <div className="tw">
            <table className="tbl admin-depts">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Manager(s)</th>
                  <th>Status split</th>
                  <th className="num">Assets</th>
                  <th className="num">In use</th>
                  <th className="num">Value</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/assets?department=${x.id}`} className="admin-dept">
                        <span className="ico" style={{ fontSize: 11, fontWeight: 700 }}>
                          {x.code}
                        </span>
                        <b>{x.name}</b>
                      </Link>
                    </td>
                    <td>{x.managers.length ? <span style={{ color: "var(--at-soft)" }}>{x.managers.join(", ")}</span> : <span className="pill s-bad">No manager</span>}</td>
                    <td>
                      {x.total ? (
                        <div className="loc-bar" role="img" aria-label={`${x.name}: ${x.statuses.map((s) => `${s.count} ${STATUS_LABELS[s.status].toLowerCase()}`).join(", ")}`}>
                          {STATUS_ORDER.map((s) => {
                            const c = x.statuses.find((y) => y.status === s)?.count ?? 0;
                            return c ? (
                              <Link key={s} href={`/assets?department=${x.id}&status=${s}`} title={`${c} ${STATUS_LABELS[s].toLowerCase()}`} style={{ flex: `${c} 1 0`, background: STATUS_COLORS[s] }} />
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <small className="muted">No assets</small>
                      )}
                    </td>
                    <td className="num">{x.total}</td>
                    <td className="num">{pct(x.inUse, x.total)}%</td>
                    <td className="num">{rupeeShort(x.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>All departments</td>
                  <td />
                  <td />
                  <td className="num">{totals.assets}</td>
                  <td className="num">{pct(totals.inUse, totals.assets)}%</td>
                  <td className="num">{rupeeShort(totals.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <StatusKey items={statuses.map((s) => ({ label: STATUS_LABELS[s], color: STATUS_COLORS[s] }))} />
        </section>

        <BreakdownCard
          tabs={[
            { key: "status", label: "Status", title: "All assets by status", sub: `${d.total} assets in all departments`, groups: d.breakdown.status },
            { key: "category", label: "Category", title: "Active assets by category", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.category },
            { key: "department", label: "Department", title: "Active assets by department", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.department },
            { key: "location", label: "Location", title: "Active assets by location", sub: `Coloured by status · ${d.activeCount} active assets`, groups: d.breakdown.location },
          ]}
        />

        {/* Admin charts answer budget and planning questions; the manager dashboard keeps its own charts. */}
        <div className="dash-charts">
          <ChartCard title="Spend per month" sub="Purchases vs repairs, last 12 months, all departments">
            <SpendChart data={charts.spend} />
          </ChartCard>
          <ChartCard title="Value going out of warranty" sub="Purchase value of assets whose warranty ends, next 6 months">
            <ColumnChart data={charts.warranty} money zeroText="nothing ending" height={170} />
            {charts.warrantyTop.length ? (
              <div className="admin-top">
                {charts.warrantyTop.map((a) => (
                  <Link key={a.id} href={`/assets/${a.id}`}>
                    <span className="tag">{a.tag}</span>
                    <span>{a.name}</span>
                    <small className="muted">{formatDate(a.warrantyEnd)}</small>
                    <b>{rupeeShort(a.value)}</b>
                  </Link>
                ))}
              </div>
            ) : null}
          </ChartCard>
          <ChartCard title="Asset age by department" sub="Active assets by years since purchase">
            <div className="admin-age">
              {departments.map((x) => {
                const bands = charts.ageByDept[x.id] ?? [0, 0, 0, 0, 0];
                const total = bands.reduce((n, v) => n + v, 0);
                return (
                  <div key={x.id}>
                    <span>{x.name}</span>
                    {total ? (
                      <div className="loc-bar" role="img" aria-label={`${x.name}: ${bands.map((v, i) => (v ? `${v} ${AGE_BANDS[i].toLowerCase()}` : null)).filter(Boolean).join(", ")}`}>
                        {bands.map((v, i) => (v ? <i key={i} title={`${v} · ${AGE_BANDS[i]}`} style={{ display: "block", flex: `${v} 1 0`, background: AGE_COLORS[i] }} /> : null))}
                      </div>
                    ) : (
                      <small className="muted">No assets</small>
                    )}
                    <b>{total}</b>
                  </div>
                );
              })}
            </div>
            <StatusKey items={AGE_BANDS.filter((_, i) => departments.some((x) => (charts.ageByDept[x.id] ?? [])[i])).map((b) => ({ label: b, color: AGE_COLORS[AGE_BANDS.indexOf(b)] }))} />
          </ChartCard>
          <ChartCard title="In use per month" sub="Share of assets held by someone at each month's end">
            <TrendChart data={charts.inUse} percent height={170} />
            <small className="muted">
              {plural(charts.idleNow, "active asset")} not assigned to anyone right now.
            </small>
          </ChartCard>
        </div>
      </div>

      {/* Side panel: stays in view while the main column scrolls (stacks below on narrow screens). */}
      <aside className="admin-side">
        <section className="card rise" style={{ animationDelay: "160ms", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 8px 8px" }}>
            <h2 className="h2">Needs an admin</h2>
            {todo.length ? <span className="pill s-bad">{todo.length} open</span> : <span className="pill s-ok">All clear</span>}
          </div>
          {todo.length ? (
            todo.map((t) => (
              <Link key={t.key} className="li" href={t.href}>
                <span className={`ico s-${t.tone}`} style={{ fontSize: 11, fontWeight: 800 }}>
                  {t.tag}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <b>{t.title}</b>
                  <small className="muted">{t.sub}</small>
                </span>
                <span className="btn sm">{t.cta}</span>
              </Link>
            ))
          ) : (
            <div className="empty">
              <b>Nothing to fix</b>
              <span>Every department has a manager and every employee can sign in.</span>
            </div>
          )}
        </section>

        <section className="card pad rise" style={{ animationDelay: "200ms", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h2 className="h2">Open work</h2>
            <small className="muted">All departments</small>
          </div>
          <div className="admin-work">
            {work.map((w) => (
              <Link key={w.label} href={w.href}>
                {w.label}
                <b>{w.value}</b>
              </Link>
            ))}
          </div>
          <small className="muted">Managers handle these. Click one to see the list.</small>
        </section>

        <section className="card pad rise" style={{ animationDelay: "240ms", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h2 className="h2">Users</h2>
            <Link href="/admin/users" className="muted" style={{ fontSize: 13 }}>
              {users.active} active{users.inactive ? ` · ${users.inactive} inactive` : ""} ›
            </Link>
          </div>
          <div className="admin-roles">
            <span>
              <b>{users.admins}</b>
              Admin{users.admins === 1 ? "" : "s"}
            </span>
            <span>
              <b>{users.managers}</b>
              Manager{users.managers === 1 ? "" : "s"}
            </span>
            <span>
              <b>{users.employees}</b>
              Employee{users.employees === 1 ? "" : "s"}
            </span>
          </div>
          <small className="muted">Latest sign-ins</small>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.recentSignIns.map((u) => (
              <div key={u.id} className="admin-signin">
                <Initials name={u.name} small />
                <span style={{ minWidth: 0 }}>
                  <b>{u.name}</b>
                  <small className="muted">{ROLE_LABELS[u.role]}</small>
                </span>
                <small style={u.stale ? { color: "var(--at-t-bad)", fontWeight: 700 } : { color: "var(--at-muted)" }}>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</small>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
