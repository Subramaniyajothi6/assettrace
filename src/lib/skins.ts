/** Visual skins ported from the prototype. Final choice is a one-line Setting change (`uiSkin`). */
export const SKINS = [
  { id: "warm", name: "Warm pill", dark: true },
  { id: "corporate", name: "Corporate", dark: true },
  { id: "ledger", name: "Ledger", dark: false },
  { id: "midnight", name: "Midnight ops", dark: false },
  { id: "bento", name: "Bento", dark: false },
  { id: "swiss", name: "Swiss", dark: false },
  { id: "brutal", name: "Neo-brutal", dark: false },
  { id: "nordic", name: "Nordic calm", dark: true },
] as const;

export type SkinId = (typeof SKINS)[number]["id"];

export const DEFAULT_SKIN: SkinId = "warm";

export function isSkin(v: string | undefined | null): v is SkinId {
  return SKINS.some((s) => s.id === v);
}

/** Only these skins have a dark variant; others are forced to light. */
export function skinHasDark(skin: SkinId): boolean {
  return SKINS.find((s) => s.id === skin)!.dark;
}
