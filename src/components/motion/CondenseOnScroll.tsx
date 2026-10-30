"use client";

import { useEffect } from "react";

/** Sets `data-condensed` on <html> once the page is scrolled 40px, so the sticky page title shrinks (globals.css). */
export function CondenseOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let on = false;
    const check = () => {
      // Two thresholds, so the header shrinking (which shortens the page) can't make it flip back and forth.
      const next = on ? window.scrollY > 10 : window.scrollY > 60;
      if (next !== on) root.toggleAttribute("data-condensed", (on = next));
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      root.removeAttribute("data-condensed");
    };
  }, []);
  return null;
}
