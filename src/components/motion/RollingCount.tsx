"use client";

import { useEffect, useRef } from "react";

/** A small count (nav badges) whose new value rolls up into place when it changes, but not on first render. */
export function RollingCount({ value }: { value: number }) {
  const prev = useRef<number | null>(null);
  const changed = prev.current !== null && prev.current !== value;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span key={value} className={changed ? "roll-in" : undefined}>
      {value}
    </span>
  );
}
