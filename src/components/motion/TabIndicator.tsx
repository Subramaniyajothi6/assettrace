"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Sliding highlight for a `.tabs` or `.seg` bar. Put it first inside the bar: it sits behind the item marked
 * aria-current="page" / aria-selected="true" and glides to the new one when that changes (link tabs keep the
 * same bar across navigations, so the slide works for them too). Styles: `.has-ind` / `.tab-ind` in globals.css.
 */
export function TabIndicator() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const ind = ref.current;
    const bar = ind?.parentElement;
    if (!ind || !bar) return;
    const place = () => {
      const active = bar.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
      ind.style.opacity = active ? "1" : "0";
      if (!active) return;
      ind.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      ind.style.width = `${active.offsetWidth}px`;
      ind.style.height = `${active.offsetHeight}px`;
    };
    bar.classList.add("has-ind");
    place();
    // Slide only after the first placement, so the page doesn't open with a swoosh.
    const raf = requestAnimationFrame(() => ind.classList.add("ready"));
    const mo = new MutationObserver(place);
    mo.observe(bar, { subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-selected"] });
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);
  return <span ref={ref} className="tab-ind" aria-hidden="true" />;
}
