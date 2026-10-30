"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A <tbody> whose rows glide to their new place when the order changes (sorting): React keeps keyed rows'
 * DOM nodes, so each moved row is animated from its previous offset (FLIP). New rows use the CSS fade-in.
 */
export function FlipTbody({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLTableSectionElement>(null);
  const prev = useRef(new Map<Element, number>());
  useLayoutEffect(() => {
    const rows = Array.from(ref.current?.children ?? []) as HTMLElement[];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const r of rows) {
      const before = prev.current.get(r);
      const dy = before === undefined ? 0 : before - r.offsetTop;
      if (dy && !still) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 350, easing: "cubic-bezier(.2,.7,.2,1)" });
    }
    prev.current = new Map(rows.map((r) => [r, r.offsetTop]));
  });
  return <tbody ref={ref}>{children}</tbody>;
}
