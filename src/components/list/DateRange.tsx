"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** From/to date inputs stored in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD). */
export function DateRange({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const set = (key: "from" | "to", value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return (
    <span className="gap8" style={{ gap: 6 }}>
      <small className="muted">{label}</small>
      <label className="sr" htmlFor="dr-from">
        {label} from
      </label>
      <input id="dr-from" type="date" className="inp" style={{ width: 150, height: 44, borderRadius: "var(--at-pill)" }} defaultValue={sp.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
      <span className="muted">–</span>
      <label className="sr" htmlFor="dr-to">
        {label} to
      </label>
      <input id="dr-to" type="date" className="inp" style={{ width: 150, height: 44, borderRadius: "var(--at-pill)" }} defaultValue={sp.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
    </span>
  );
}
