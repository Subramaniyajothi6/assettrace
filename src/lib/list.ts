/** URL-driven list state shared by every list page (search, filters, pagination). */

export const PAGE_SIZE = 15;

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export function pageOf(sp: SearchParams): number {
  const n = Number(param(sp, "page") ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function paging(sp: SearchParams, size = PAGE_SIZE) {
  const page = pageOf(sp);
  return { page, skip: (page - 1) * size, take: size, size };
}

/** Case-insensitive contains filter for Prisma. */
export const ilike = (q: string) => ({ contains: q, mode: "insensitive" as const });
