"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders its children only once they scroll into view, so a chart's grow-in animation plays when you
 * reach it rather than on page load. Keeps the space with a fixed height until then.
 */
export function WhenVisible({ height, children }: { height: number | string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {seen ? children : null}
    </div>
  );
}
