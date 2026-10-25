import { z } from "zod";
import { checkbox, endOfToday, enumOf, optText, stringList, text } from "./common";

const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;
const blank = (v: unknown) => (v === "" ? undefined : v);
const pastDate = (label: string) =>
  z
    .preprocess(blank, z.coerce.date({ error: `${label} is required` }))
    .refine((d) => d <= endOfToday(), `${label} can't be in the future`);

export const receiveReturnSchema = z.object({
  receivedAt: pastDate("Return date"),
  condition: enumOf(CONDITIONS, "the condition"),
  missingAccessories: stringList(),
  damage: optText(1000),
  remarks: optText(1000),
  next: z.enum(["inspect", "later"]).default("later"),
});

export const INSPECTION_RESULTS = ["GOOD", "MINOR_REPAIR_REQUIRED", "MAJOR_REPAIR_REQUIRED", "DAMAGED", "RETIRE"] as const;

export const inspectionSchema = z.object({
  physicalCondition: enumOf(CONDITIONS, "the physical condition"),
  screenCondition: optText(80),
  keyboardCondition: optText(80),
  batteryCondition: optText(80),
  chargerAvailable: checkbox(),
  isFunctional: checkbox(),
  accessoriesPresent: stringList(),
  visibleDamage: optText(1000),
  missingComponents: optText(500),
  remarks: optText(1000),
  result: enumOf(INSPECTION_RESULTS, "the result"),
});

export const retireSchema = z.object({
  retirementDate: pastDate("Retirement date"),
  reason: text("Reason", 500),
  finalCondition: enumOf(CONDITIONS, "the final condition"),
  disposalMethod: enumOf(["RECYCLED", "SOLD", "DONATED", "DESTROYED", "RETURNED_TO_VENDOR", "OTHER"] as const, "a disposal method"),
  remarks: optText(1000),
});

export const lostSchema = z.object({ note: optText(500) });
