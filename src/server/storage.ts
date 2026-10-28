import "server-only";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/photos";

/** Private Supabase Storage bucket. Only the server (service role key) can read or write it. */
const BUCKET = process.env.SUPABASE_BUCKET ?? "asset-files";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

let client: SupabaseClient | null = null;
function supabase() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase storage is not configured");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/** Check the real file type from its first bytes, not the browser-supplied MIME type. */
function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/** A File from FormData, or null when the field was left empty. */
export function fileFrom(fd: FormData, field: string): File | null {
  const f = fd.get(field);
  return f instanceof File && f.size > 0 ? f : null;
}

export function filesFrom(fd: FormData, field: string, max: number): File[] {
  const files = fd.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > max) throw new AppError(`Up to ${max} photos.`, { [field]: `Up to ${max} photos` });
  return files;
}

/** Validate and upload an image (jpeg/png/webp, ≤ MAX_PHOTO_MB). Returns the storage key. */
export async function uploadImage(file: File, folder: string, field = "photo"): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new AppError(`Photos must be ${MAX_PHOTO_MB} MB or smaller.`, { [field]: `Max ${MAX_PHOTO_MB} MB` });
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !TYPES[type]) throw new AppError("Only JPG, PNG or WebP images.", { [field]: "JPG, PNG or WebP only" });
  const key = `${folder}/${randomUUID()}.${TYPES[type]}`;
  const { error } = await supabase().storage.from(BUCKET).upload(key, buf, { contentType: type, upsert: false });
  if (error) throw new AppError("Couldn't upload the photo. Try again.");
  return key;
}

/** Upload a PNG produced in the browser (signature pad), given as a data URL. */
export async function uploadPngDataUrl(dataUrl: string, folder: string): Promise<string> {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new AppError("Signature is missing.");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length > 1024 * 1024 || sniff(buf) !== "image/png") throw new AppError("Signature image is invalid.");
  const key = `${folder}/${randomUUID()}.png`;
  const { error } = await supabase().storage.from(BUCKET).upload(key, buf, { contentType: "image/png", upsert: false });
  if (error) throw new AppError("Couldn't save the signature. Try again.");
  return key;
}

/** Short-lived signed URL (5 min). Call only after a permission check. */
export async function signedUrl(key: string, seconds = 300): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(key, seconds);
  if (error || !data) throw new AppError("File not found.");
  return data.signedUrl;
}

/** URL the browser uses for a stored file: goes through the permission-checking route. */
export const fileUrl = (key: string) => `/api/files/${key}`;
