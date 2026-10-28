import { z } from "zod";
import { enumOf, id, optDate, optText, text } from "./common";

export const ISSUE_CATEGORIES = ["HARDWARE", "SOFTWARE", "PHYSICAL_DAMAGE", "PERFORMANCE", "BATTERY", "NETWORK", "OTHER"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const REQUEST_STATUSES = ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "COMPLETED"] as const;
export const MAINTENANCE_TYPES = ["REPAIR", "PREVENTIVE", "UPGRADE", "WARRANTY_CLAIM", "OTHER"] as const;

export const reportIssueSchema = z.object({
  assetId: id("the asset"),
  category: enumOf(ISSUE_CATEGORIES, "a category"),
  title: text("Title", 120),
  description: text("Description", 2000),
  severity: enumOf(SEVERITIES, "how bad it is"),
});

/** Severity → request priority (prototype mapping). */
export const PRIORITY_FOR_SEVERITY = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "URGENT" } as const;

export const resolveIssueSchema = z.object({ resolution: text("Resolution", 500) });

export const sendToMaintenanceSchema = z.object({
  type: enumOf(MAINTENANCE_TYPES, "a type"),
  serviceProvider: optText(120),
  expectedCompletion: optDate(),
});

export const newRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("REPLACEMENT"), assetId: id("the asset"), description: text("Details", 2000), priority: enumOf(PRIORITIES, "a priority") }),
  z.object({ type: z.literal("RETURN"), assetId: id("the asset"), description: text("Details", 2000), priority: enumOf(PRIORITIES, "a priority") }),
  z.object({ type: z.literal("NEW_ASSET"), description: text("Details", 2000), priority: enumOf(PRIORITIES, "a priority") }),
]);

export const updateRequestSchema = z.object({
  status: enumOf(REQUEST_STATUSES, "a status"),
  managerRemarks: optText(1000),
});

const blankToUndef = (v: unknown) => (v === "" ? undefined : v);
const money = () => z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number({ error: "Enter a number" }).min(0, "Can't be negative"));

export const maintenanceSchema = z
  .object({
    assetId: id("an asset"),
    issueId: z.preprocess(blankToUndef, z.string().optional()).transform((v) => v ?? null),
    type: enumOf(MAINTENANCE_TYPES, "a type"),
    problem: text("Problem", 500),
    serviceProvider: optText(120),
    serviceDate: z.preprocess(blankToUndef, z.coerce.date({ error: "Service date is required" })),
    cost: money(),
    expectedCompletion: optDate(),
    partsReplaced: optText(300),
    technicianNotes: optText(1000),
    warrantyCovered: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .superRefine((v, ctx) => {
    if (v.expectedCompletion && v.expectedCompletion < v.serviceDate) {
      ctx.addIssue({ code: "custom", path: ["expectedCompletion"], message: "Expected completion must be after the service date" });
    }
  });

/** Edit an open record: estimate, provider, dates and warranty can change while the asset is in the workshop. */
export const updateMaintenanceSchema = z.object({
  serviceProvider: optText(120),
  cost: money(),
  expectedCompletion: optDate(),
  partsReplaced: optText(300),
  technicianNotes: optText(1000),
  warrantyCovered: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const completeMaintenanceSchema = z.object({
  actualCompletion: z.preprocess(blankToUndef, z.coerce.date({ error: "Completion date is required" })),
  cost: money(),
  partsReplaced: optText(300),
  technicianNotes: optText(1000),
  outcome: z.enum(["FIXED", "NOT_REPAIRABLE"], { error: "Choose the outcome" }),
});
