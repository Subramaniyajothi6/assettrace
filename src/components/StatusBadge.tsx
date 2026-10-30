"use client";

import { useEffect, useRef } from "react";
import type { AssetStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/labels";

const ASSET_STATUSES = new Set<string>(Object.keys(STATUS_LABELS));

type Props = {
  /** An AssetStatus, or any other workflow status (PENDING, APPROVED, ...). */
  status: AssetStatus | string;
  /** Override the label text. */
  label?: string;
  className?: string;
};

/**
 * Pill with a 7px dot. Asset statuses get their own colour; others map to a tone.
 * When the status changes in place (after an action refreshes the page), the pill pops and its row glows.
 */
export function StatusBadge({ status, label, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === status) return;
    prev.current = status;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate([{ transform: "scale(.82)" }, { transform: "scale(1.06)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });
    // Rows glow through their (transparent) background; cards get a fading ring so their own fill stays put.
    const row = el.closest("tr, li");
    if (row) row.animate([{ backgroundColor: "color-mix(in srgb, var(--at-t-ok) 18%, transparent)" }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease-out" });
    else el.closest(".card, article")?.animate([{ boxShadow: "0 0 0 3px color-mix(in srgb, var(--at-t-ok) 45%, transparent)" }, { boxShadow: "0 0 0 3px transparent" }], { duration: 1200, easing: "ease-out" });
  }, [status]);
  const isAsset = ASSET_STATUSES.has(status);
  const cls = isAsset ? `s-${status}` : `s-${STATUS_TONES[status] ?? "mute"}`;
  const text = label ?? (isAsset ? STATUS_LABELS[status as AssetStatus] : humanize(status));
  return (
    <span ref={ref} className={cn("pill", cls, className)}>
      {text}
    </span>
  );
}

function humanize(s: string) {
  const t = s.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
