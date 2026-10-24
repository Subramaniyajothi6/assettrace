"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { Sparkline } from "./Sparkline";

type Props = {
  label: string;
  value: number;
  /** Small line under the number, e.g. "3 reserved for new joiners". */
  sub?: string;
  /** Colour of the sub line. */
  tone?: "ok" | "bad" | "muted";
  trend?: number[];
  /** "dark" and "blue" are the hero cards; one of each per row. */
  variant?: "card" | "dark" | "blue";
  href?: string;
  delay?: number;
};

const VARIANT = { card: "card", dark: "hero-dark", blue: "hero-blue" } as const;
const TONE = { ok: "#2E7D4F", bad: "var(--at-alert)", muted: undefined } as const;

/** KPI tile with count-up number and sparkline (ARCHITECTURE.md §8). */
export function KpiCard({ label, value, sub, tone = "muted", trend, variant = "card", href, delay = 0 }: Props) {
  const n = useCountUp(value);
  const body = (
    <>
      <span className="l">{label}</span>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <span className="v">{n.toLocaleString("en-IN")}</span>
        {trend ? <Sparkline values={trend} /> : null}
      </div>
      {sub ? (
        <span className={cn("s", tone === "muted" && "muted")} style={{ color: TONE[tone] }}>
          {sub}
        </span>
      ) : null}
    </>
  );
  const className = cn(VARIANT[variant], "kpi lift rise");
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
