"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AssetStatus } from "@prisma/client";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";

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

/** Ranked horizontal bars with direct labels (identity is the text, not the color). */
export function BarList({ data, unit = "assets", max = 8 }: { data: Point[]; unit?: string; max?: number }) {
  if (!data.length) return <EmptyChart />;
  const shown = data.length > max ? [...data.slice(0, max - 1), { label: "Other", value: data.slice(max - 1).reduce((s, d) => s + d.value, 0) }] : data;
  const top = Math.max(...shown.map((d) => d.value), 1);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {shown.map((d, i) => (
        <li key={d.label} title={`${d.label}: ${d.value} ${unit}`} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 36%) 1fr auto", gap: 10, alignItems: "center", fontSize: 14 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
          <span style={{ height: 12, background: "var(--at-chip)", borderRadius: 4, overflow: "hidden" }}>
            <i
              style={{
                display: "block",
                height: "100%",
                width: `${(d.value / top) * 100}%`,
                background: ACCENT,
                borderRadius: 4,
                transformOrigin: "left",
                animation: `slide .8s cubic-bezier(.2,.7,.2,1) ${200 + i * 45}ms both`,
              }}
            />
          </span>
          <b className="num" style={{ minWidth: 24, textAlign: "right" }}>
            {d.value}
          </b>
        </li>
      ))}
    </ul>
  );
}

/** Status distribution donut. Status colours are fixed by the design; the legend carries names + counts. */
export function StatusDonut({ data }: { data: { status: AssetStatus; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart />;
  const rows = [...data].sort((a, b) => b.value - a.value);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
      <div style={{ width: 170, height: 170, position: "relative", flex: "none" }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="status" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="var(--at-card)" strokeWidth={2}>
              {rows.map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TipBox label={STATUS_LABELS[payload[0].payload.status as AssetStatus]} value={`${payload[0].value} of ${total} (${Math.round((Number(payload[0].value) / total) * 100)}%)`} />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <b style={{ fontSize: 26 }}>{total}</b>
          <small className="muted">assets</small>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, flex: "1 1 160px", fontSize: 14 }}>
        {rows.map((d) => (
          <li key={d.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[d.status], flex: "none" }} aria-hidden="true" />
            <span style={{ flex: 1 }}>{STATUS_LABELS[d.status]}</span>
            <b className="num">{d.value}</b>
            <small className="muted num" style={{ width: 36, textAlign: "right" }}>
              {Math.round((d.value / total) * 100)}%
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="empty" style={{ padding: 24 }}>
      <span>No data yet.</span>
    </div>
  );
}
