import { z } from "zod";
import { isoDayIST } from "@/lib/format";

/** Convert FormData to a plain object. Repeated keys (or keys ending in []) become arrays. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of fd.entries()) {
    if (rawKey.startsWith("$ACTION")) continue;
    if (value instanceof File) continue; // files are read separately
    const isArray = rawKey.endsWith("[]");
    const key = isArray ? rawKey.slice(0, -2) : rawKey;
    if (isArray) {
      out[key] = [...((out[key] as string[]) ?? []), value];
    } else if (key in out) {
      out[key] = [...[out[key]].flat(), value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Required trimmed text. */
export const text = (label: string, max = 200) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/** Optional trimmed text; "" → null. */
export const optText = (max = 2000) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max, "Too long").optional()).transform((v) => v ?? null);

/** Required id from a <select>. */
export const id = (label: string) => z.string({ error: `Choose ${label}` }).min(1, `Choose ${label}`);

/** Optional id; "" → null. */
export const optId = () => z.preprocess(emptyToUndef, z.string().optional()).transform((v) => v ?? null);

/** Optional date from <input type="date">; "" → null. */
export const optDate = () =>
  z
    .preprocess(emptyToUndef, z.coerce.date({ error: "Enter a valid date" }).optional())
    .transform((v) => v ?? null);

export const reqDate = (label: string) =>
  z.preprocess(emptyToUndef, z.coerce.date({ error: `${label} is required` }));

/** Optional money / number; "" → null. */
export const optMoney = () =>
  z
    .preprocess(emptyToUndef, z.coerce.number({ error: "Enter a number" }).min(0, "Can't be negative").optional())
    .transform((v) => v ?? null);

/** Checkbox: "on"/"true" → true, missing → false. */
export const checkbox = () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** String array from repeated fields or a comma-separated tag input. */
export const stringList = () =>
  z
    .preprocess((v) => {
      const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
      return arr.map((s) => String(s).trim()).filter(Boolean);
    }, z.array(z.string().max(80)))
    .default([]);

export const email = () => z.string().trim().toLowerCase().email("Enter a valid email");

/** A strong-enough password for an internal tool. */
export const password = () =>
  z
    .string()
    .min(8, "At least 8 characters")
    .regex(/\d/, "Include a number")
    .regex(/[^A-Za-z0-9]/, "Include a symbol");

export function enumOf<T extends string>(values: readonly T[], label: string) {
  return z.enum(values as [T, ...T[]], { error: `Choose ${label}` });
}

/**
 * End of today in India, for "can't be in the future" checks. Date inputs ("2026-10-28") parse as UTC
 * midnight, so compare against the end of the IST calendar day expressed the same way; the server's own
 * clock (UTC on Vercel) would still be on yesterday until 05:30 IST.
 */
export const endOfToday = () => new Date(`${isoDayIST()}T23:59:59.999Z`);
