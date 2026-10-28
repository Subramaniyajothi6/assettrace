/**
 * Photo upload limits, shared by the forms (checked before sending) and the server (checked again).
 * 1 MB each keeps a 3-photo form well under Vercel's 4.5 MB request limit: a larger request is
 * rejected by the platform before our own validation can show a friendly message.
 */
export const MAX_PHOTO_MB = 1;
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
export const PHOTO_HINT = `JPG, PNG or WebP · up to ${MAX_PHOTO_MB} MB`;

/** Error message for files picked in the browser, or null when they can be sent. */
export function photoError(files: FileList | null, max = 1): string | null {
  const list = Array.from(files ?? []);
  if (list.length > max) return `Choose up to ${max} photos.`;
  const big = list.find((f) => f.size > MAX_PHOTO_BYTES);
  if (big) return `${big.name} is ${(big.size / 1024 / 1024).toFixed(1)} MB. Photos must be ${MAX_PHOTO_MB} MB or smaller.`;
  return null;
}
