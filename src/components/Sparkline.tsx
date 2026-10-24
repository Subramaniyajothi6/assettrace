/** Tiny line chart that draws itself in (CSS `.spark path`). */
export function Sparkline({ values, color = "currentColor" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const d = values
    .map((n, i) => `${i ? "L" : "M"}${((i * 100) / (values.length - 1)).toFixed(1)} ${(32 - ((n - min) / range) * 28).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 36" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
