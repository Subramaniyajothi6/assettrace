import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { DEFAULT_SKIN, isSkin, type SkinId } from "@/lib/skins";

export type AppSettings = {
  orgName: string;
  assetTagPrefix: string;
  warrantyAlertDays: number;
  uiSkin: SkinId;
};

const DEFAULTS: AppSettings = {
  orgName: "Adz4needz",
  assetTagPrefix: "AST",
  warrantyAlertDays: 30,
  uiSkin: DEFAULT_SKIN,
};

/** System settings (Admin → Settings), read once per request. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const days = Number(map.warrantyAlertDays);
  return {
    orgName: map.orgName || DEFAULTS.orgName,
    assetTagPrefix: map.assetTagPrefix || DEFAULTS.assetTagPrefix,
    warrantyAlertDays: Number.isFinite(days) && days > 0 ? days : DEFAULTS.warrantyAlertDays,
    uiSkin: isSkin(map.uiSkin) ? map.uiSkin : DEFAULTS.uiSkin,
  };
});
