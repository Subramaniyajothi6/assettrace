"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { rupee, rupeeShort } from "@/lib/format";

const FORMATS = {
  int: (n: number) => n.toLocaleString("en-IN"),
  rupee,
  rupeeShort,
};

/** A KPI number that counts up from 0 on mount (server pages pass the value, the client animates it). */
export function CountUp({ value, format = "int", ms = 700 }: { value: number; format?: keyof typeof FORMATS; ms?: number }) {
  return <>{FORMATS[format](useCountUp(value, ms))}</>;
}
