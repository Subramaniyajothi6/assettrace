import "server-only";
import { z } from "zod";
import { prisma } from "../db";
import { assertCan, requireUser } from "../permissions";
import { text } from "@/lib/validation/common";

const settingsSchema = z.object({
  orgName: text("Organisation name", 80),
  assetTagPrefix: z
    .string({ error: "Prefix is required" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "2–5 letters, e.g. AST"),
  warrantyAlertDays: z.coerce.number({ error: "Enter a number of days" }).int("Whole days only").min(1, "At least 1 day").max(365, "At most 365 days"),
});

/** Admin → Settings. Values live in the Setting key/value table. */
export async function updateSettings(input: unknown) {
  const user = await requireUser();
  assertCan(user, "settings:manage");
  const data = settingsSchema.parse(input);
  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }),
    ),
  );
  return data;
}
