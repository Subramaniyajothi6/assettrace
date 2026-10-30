"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FilterSelect } from "./FilterSelect";

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

/** Search box + filter selects that live in the URL (so lists are shareable and server-rendered). */
export function ListToolbar({ placeholder = "Search", filters = [], children }: { placeholder?: string; filters?: FilterDef[]; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const first = useRef(true);
  const id = useId();

  const push = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Dims the list while new results load (CSS: [data-list-pending] in globals.css).
  useEffect(() => {
    document.documentElement.toggleAttribute("data-list-pending", pending);
    return () => document.documentElement.removeAttribute("data-list-pending");
  }, [pending]);

  const active = filters.some((f) => sp.get(f.key)) || !!sp.get("q");

  return (
    <div className="toolbar rise">
      {/* A div, not a label: the clear button must stay out of the input's accessible name. */}
      <div className="search">
        <Search size={18} aria-hidden="true" />
        <label htmlFor={id} className="sr">
          {placeholder}
        </label>
        <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        {q ? (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQ("")}>
            <X size={14} />
          </button>
        ) : null}
      </div>
      {filters.map((f) => (
        <FilterSelect key={f.key} label={f.label} value={sp.get(f.key) ?? ""} options={f.options} onChange={(v) => push({ [f.key]: v })} />
      ))}
      {active ? (
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            setQ("");
            push(Object.fromEntries([["q", null], ...filters.map((f) => [f.key, null])]));
          }}
        >
          <X size={14} /> Clear
        </button>
      ) : null}
      {children}
    </div>
  );
}
