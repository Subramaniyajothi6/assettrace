/** Display formatting. Dates are stored UTC and shown in Asia/Kolkata (CLAUDE.md conventions). */

const TZ = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const longDayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

type DateLike = Date | string | null | undefined;
const toDate = (d: DateLike) => (d == null ? null : d instanceof Date ? d : new Date(d));

/** 24 Oct 2026 */
export function formatDate(d: DateLike): string {
  const x = toDate(d);
  return x ? dateFmt.format(x) : "—";
}

/** 24 Oct 2026, 9:40 AM */
export function formatDateTime(d: DateLike): string {
  const x = toDate(d);
  return x ? `${dateFmt.format(x)}, ${timeFmt.format(x)}` : "—";
}

/** ₹78,500 */
export function rupee(n: number | string | { toString(): string } | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return `₹${v.toLocaleString("en-IN")}`;
}

/** ₹12.4 L / ₹1.20 Cr */
export function rupeeShort(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return rupee(n);
}

/** "Good morning" etc. by the hour in India. */
export function greeting(now = new Date()): string {
  const h = Number(hourFmt.format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** SATURDAY, 24 OCTOBER */
export function longDay(now = new Date()): string {
  return longDayFmt.format(now).toUpperCase();
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}
