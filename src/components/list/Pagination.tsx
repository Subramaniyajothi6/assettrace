import Link from "next/link";
import type { SearchParams } from "@/lib/list";

/** Server-rendered pager: "Showing 1–15 of 34" + Previous/Next links that keep the filters. */
export function Pagination({ basePath, sp, page, size, total }: { basePath: string; sp: SearchParams; page: number; size: number; total: number }) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="pager">
      <small className="muted">
        Showing {from}–{to} of {total}
      </small>
      <div className="gap8">
        {page > 1 ? (
          <Link className="btn sm" href={href(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="btn sm" aria-disabled="true">
            Previous
          </span>
        )}
        <small className="muted">
          Page {page} of {pages}
        </small>
        {page < pages ? (
          <Link className="btn sm" href={href(page + 1)}>
            Next
          </Link>
        ) : (
          <span className="btn sm" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
