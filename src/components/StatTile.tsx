import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/CountUp";

/** `color` defaults to the tile's ink colour (used for single "X of total" shares). */
export type StatSegment = { label: string; value: number; color?: string };

type Props = {
  label: string;
  value: number;
  /** Small line under the label, e.g. "1 reserved". */
  sub?: string;
  icon: LucideIcon;
  /** "dark" and "blue" are the hero cards; one of each per row. */
  variant?: "card" | "dark" | "blue";
  /**
   * Bar under the header, drawn against `total`. Several segments = a status split (pair the tiles with a
   * <StatusKey>); one segment = a share, captioned "9 of 34 {of}".
   */
  bar?: { segments: StatSegment[]; total: number; of?: string };
  href?: string;
  delay?: number;
  /** "bad" shows the number in the alert colour, for a count that needs someone to act. */
  tone?: "bad";
};

const VARIANT = { card: "card", dark: "hero-dark", blue: "hero-blue" } as const;

/** One colour key for a row of status-split bars (tiles, location rows). Lists the statuses given, in order. */
export function StatusKey({ items, label, className }: { items: { label: string; color: string }[]; label?: string; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("status-key", className)}>
      {label ? <b>{label}:</b> : null}
      {items.map((s) => (
        <span key={s.label}>
          <i style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** KPI tile: icon + label on the left, big number on the right, optional bar (status split or single share). */
export function StatTile({ label, value, sub, icon: Icon, variant = "card", bar, href, delay = 0, tone }: Props) {
  const segments = bar?.segments.filter((s) => s.value > 0) ?? [];
  const body = (
    <>
      <div className="stat-head">
        <div className="stat-txt">
          <span className="l">
            <span className="stat-ico" aria-hidden="true">
              <Icon size={17} />
            </span>
            {label}
          </span>
          {sub ? <span className="s muted">{sub}</span> : null}
        </div>
        <span className="v" style={tone === "bad" && value ? { color: "var(--at-t-bad)" } : undefined}>
          <CountUp value={value} />
        </span>
      </div>
      {bar ? (
        <>
          <div className="stat-bar" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ") || "None"}>
            {segments.map((s) => (
              <i key={s.label} title={`${s.label} ${s.value}`} style={{ width: `${bar.total ? (s.value / bar.total) * 100 : 0}%`, background: s.color ?? "currentColor" }} />
            ))}
          </div>
          {/* A split bar's colours are explained by one shared key outside the tiles; a single share just says "9 of 34". */}
          {bar.segments.length === 1 ? (
            <span className="stat-cap">
              {bar.segments[0].value} of {bar.total}
              {bar.of ? ` ${bar.of}` : ""}
            </span>
          ) : null}
        </>
      ) : null}
    </>
  );
  const className = cn(VARIANT[variant], "kpi stat lift rise");
  const style = { animationDelay: `${delay}ms` };
  return href ? (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}
