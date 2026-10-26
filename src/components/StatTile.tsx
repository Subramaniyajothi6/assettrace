import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatSegment = { label: string; value: number; color: string };

type Props = {
  label: string;
  value: number;
  /** Small line under the label, e.g. "1 reserved". */
  sub?: string;
  icon: LucideIcon;
  /** "dark" and "blue" are the hero cards; one of each per row. */
  variant?: "card" | "dark" | "blue";
  /** Coloured bar under the header. Segments are drawn against `total`; each gets a legend entry. */
  bar?: { segments: StatSegment[]; total: number };
  href?: string;
  delay?: number;
};

const VARIANT = { card: "card", dark: "hero-dark", blue: "hero-blue" } as const;

/** KPI tile: icon + label on the left, big number on the right, optional share bar with a legend. */
export function StatTile({ label, value, sub, icon: Icon, variant = "card", bar, href, delay = 0 }: Props) {
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
        <span className="v">{value.toLocaleString("en-IN")}</span>
      </div>
      {bar ? (
        <>
          <div className="stat-bar" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ") || "None"}>
            {segments.map((s) => (
              <i key={s.label} style={{ width: `${bar.total ? (s.value / bar.total) * 100 : 0}%`, background: s.color }} />
            ))}
          </div>
          <div className="stat-legend">
            {segments.length ? (
              segments.map((s) => (
                <span key={s.label}>
                  <i style={{ background: s.color }} aria-hidden="true" />
                  {s.label} {s.value}
                  {bar.segments.length === 1 ? ` of ${bar.total}` : ""}
                </span>
              ))
            ) : (
              <span>None of {bar.total}</span>
            )}
          </div>
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
