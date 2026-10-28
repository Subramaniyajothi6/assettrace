import { formatDate } from "@/lib/format";

/** Days from today to `d` (negative = past). */
export function daysUntil(d: Date): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 864e5);
}

/** Warranty end date with an "ends in N days" / "expired" hint. */
export function WarrantyCell({ end, retired, alertDays }: { end: Date | null; retired?: boolean; alertDays: number }) {
  if (!end) return <span className="muted">—</span>;
  const d = daysUntil(end);
  const hint =
    retired ? null : d < 0 ? (
      <small style={{ color: "var(--at-t-bad)", fontWeight: 600 }}>Expired</small>
    ) : d <= alertDays ? (
      <small style={{ color: "var(--at-t-warn)", fontWeight: 600 }}>{d === 0 ? "Ends today" : `Ends in ${d} day${d === 1 ? "" : "s"}`}</small>
    ) : null;
  return (
    <span style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ color: "var(--at-soft)" }}>{formatDate(end)}</span>
      {hint}
    </span>
  );
}
