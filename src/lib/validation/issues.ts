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
