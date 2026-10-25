/** Visual skins ported from the prototype. Final choice is a one-line Setting change (`uiSkin`). */
export const SKINS = [
  { id: "warm", name: "Warm pill", dark: true, swatch: ["#F2F1EE", "#141414", "#C3D5F0"] },
  { id: "corporate", name: "Corporate", dark: true, swatch: ["#F4F6F9", "#0F172A", "#1D4ED8"] },
  { id: "ledger", name: "Ledger", dark: false, swatch: ["#F6F1E7", "#1B1A17", "#8C2F2B"] },
  { id: "midnight", name: "Midnight ops", dark: false, swatch: ["#0B1020", "#121933", "#5EEAD4"] },
  { id: "bento", name: "Bento", dark: false, swatch: ["#E5DDF7", "#D6F0E0", "#FCE1CF"] },
  { id: "swiss", name: "Swiss", dark: false, swatch: ["#FFFFFF", "#000000", "#D81E14"] },
  { id: "brutal", name: "Neo-brutal", dark: false, swatch: ["#FFE45C", "#111111", "#6CB8FF"] },
  { id: "nordic", name: "Nordic calm", dark: true, swatch: ["#EEF2EE", "#2F5D4E", "#DCEADF"] },
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
