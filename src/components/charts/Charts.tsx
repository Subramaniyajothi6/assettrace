"use client";

import { useState } from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AssetStatus } from "@prisma/client";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";
import type { BreakdownGroup } from "@/server/queries/dashboard";

/** Segment order in status-split bars: in use first, problems last (matches the location bars). */
const STATUS_ORDER: AssetStatus[] = ["ASSIGNED", "AVAILABLE", "UNDER_MAINTENANCE", "RESERVED", "RETURNED", "DAMAGED", "LOST", "RETIRED"];

export type Point = { label: string; value: number };

// Single-series charts use one accent from the active skin; text stays in ink tokens.
const ACCENT = "var(--at-accent)";
const GRID = "var(--at-line)";
const TICK = { fill: "var(--at-muted)", fontSize: 12 };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const compactInr = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}k` : `₹${n}`);

function TipBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--at-card)", color: "var(--at-ink)", border: "1px solid var(--at-line)", borderRadius: 10, padding: "8px 12px", boxShadow: "0 8px 24px rgba(0,0,0,.12)", fontSize: 13 }}>
      <div className="muted">{label}</div>
      <b>{value}</b>
    </div>
  );
}

type TipProps = { active?: boolean; payload?: readonly { value?: unknown; payload?: Point }[]; label?: unknown };
const tip = (fmt: (n: number) => string) =>
  function Tip({ active, payload, label }: TipProps) {
    if (!active || !payload?.length) return null;
    return <TipBox label={String(payload[0].payload?.label ?? label)} value={fmt(Number(payload[0].value ?? 0))} />;
  };

/** Data table behind a chart (accessible alternative, CLAUDE/dataviz rule). */
function TableView({ data, unit }: { data: Point[]; unit: (n: number) => string }) {
  return (
    <details style={{ fontSize: 13 }}>
      <summary className="muted" style={{ cursor: "pointer", width: "fit-content" }}>
        Show as table
      </summary>
      <table className="tbl" style={{ fontSize: 13, marginTop: 6 }}>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td className="num" style={{ textAlign: "right" }}>
                {unit(d.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function ChartCard({ title, sub, children, className = "", style }: { title: string; sub?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card pad rise ${className}`} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, ...style }}>
      <div>
        <h2 className="h2">{title}</h2>
        {sub ? <small className="muted">{sub}</small> : null}
      </div>
      {children}
    </section>
  );
}

/** Vertical columns over time (one series). */
export function ColumnChart({ data, money, height = 200 }: { data: Point[]; money?: boolean; height?: number }) {
  const fmt = money ? inr : (n: number) => n.toLocaleString("en-IN");
  if (data.every((d) => !d.value)) return <EmptyChart />;
  return (
    <>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={money ? 52 : 28} tickFormatter={money ? compactInr : undefined} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--at-chip)" }} content={tip(fmt)} />
            <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView data={data} unit={fmt} />
    </>
  );
}

/** Area over time (one series), e.g. monthly transactions. */
export function TrendChart({ data, height = 200, unit = "events" }: { data: Point[]; height?: number; unit?: string }) {
  const fmt = (n: number) => `${n.toLocaleString("en-IN")} ${unit}`;
  if (data.every((d) => !d.value)) return <EmptyChart />;
  return (
    <>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--at-accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--at-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip cursor={{ stroke: "var(--at-muted)", strokeDasharray: "3 3" }} content={tip(fmt)} />
            <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#trendFill)" dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <TableView data={data} unit={fmt} />
    </>
  );
}

export type BreakdownTab = { key: string; label: string; title: string; sub: string; groups: BreakdownGroup[] };

/**
 * Dashboard breakdown: one card, a tab per dimension (status, category, department, location).
 * Each row is a bar split by status, in the same colours as the location bars; every segment links to the filtered asset list.
 */
export function BreakdownCard({ tabs }: { tabs: BreakdownTab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  const top = Math.max(1, ...tab.groups.map((g) => g.total));
  // Keep the card the same height on every tab so the page below doesn't jump.
  const rows = Math.max(...tabs.map((t) => t.groups.length));
  const split = tab.key !== "status";
  const legend = STATUS_ORDER.filter((s) => tab.groups.some((g) => g.statuses.some((x) => x.status === s)));
  const href = (g: BreakdownGroup, status?: AssetStatus) => {
    const q = [g.filter, status && `status=${status}`].filter(Boolean).join("&");
    return `/assets${q ? `?${q}` : ""}`;
  };
  const move = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    setActive(next.key);
    document.getElementById(`bd-tab-${next.key}`)?.focus();
  };

  return (
    <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 className="h2">{tab.title}</h2>
          <small className="muted">{tab.sub}</small>
        </div>
        <div className="seg" role="tablist" aria-label="Break down by" style={{ background: "var(--at-chip)", boxShadow: "none", padding: 4 }}>
          {tabs.map((t, i) => (
            <button
              key={t.key}
              id={`bd-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={t.key === tab.key}
              aria-controls="bd-panel"
              tabIndex={t.key === tab.key ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => move(e, i)}
              style={{ height: 32, padding: "0 14px", fontSize: 13 }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div id="bd-panel" role="tabpanel" aria-labelledby={`bd-tab-${tab.key}`} style={{ minHeight: rows * 28 + (rows - 1) * 10 }}>
        {tab.groups.length ? (
          <ul key={tab.key} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {tab.groups.map((g, i) => (
              <li key={g.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 20%) 1fr 32px", gap: 12, alignItems: "center", height: 28, fontSize: 14 }}>
                {g.filter === null ? (
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</span>
                ) : (
                  <Link href={href(g)} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit", textDecoration: "none" }} title={`Show ${g.label.toLowerCase()} assets`}>
                    {g.label}
                  </Link>
                )}
                <div
                  className="loc-bar"
                  role="img"
                  aria-label={`${g.label}: ${g.statuses.map((s) => `${s.count} ${STATUS_LABELS[s.status].toLowerCase()}`).join(", ")}`}
                  style={{ width: `${(g.total / top) * 100}%`, background: "transparent", animationDelay: `${i * 45}ms` }}
                >
                  {g.statuses.map((s) => {
                    const label = `${split ? `${g.label} · ` : ""}${STATUS_LABELS[s.status]}: ${s.count} (${Math.round((s.count / g.total) * 100)}%)`;
                    return g.filter === null ? (
                      <span key={s.status} title={label} style={{ flex: `${s.count} 1 0`, background: STATUS_COLORS[s.status], minWidth: 4 }} />
                    ) : (
                      <Link key={s.status} href={href(g, s.status)} title={label} style={{ flex: `${s.count} 1 0`, background: STATUS_COLORS[s.status] }} />
                    );
                  })}
                </div>
                <b className="num" style={{ textAlign: "right" }}>
                  {g.total}
                </b>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyChart />
        )}
      </div>

      {split && legend.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "var(--at-soft)" }}>
          {legend.map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_COLORS[s], flex: "none" }} aria-hidden="true" />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="empty" style={{ padding: 24 }}>
      <span>No data yet.</span>
    </div>
  );
}
