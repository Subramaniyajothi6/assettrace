import { z } from "zod";
import { enumOf, id, optDate, optText, reqDate, stringList } from "./common";

export const assignSchema = z
  .object({
    assetId: id("an asset"),
    employeeId: id("an employee"),
    locationId: id("a location"),
    assignedAt: reqDate("Assignment date"),
    expectedReturnDate: optDate(),
    condition: enumOf(["NEW", "GOOD", "FAIR", "POOR"] as const, "a condition"),
    accessories: stringList(),
    remarks: optText(500),
  })
  .superRefine((v, ctx) => {
    if (v.expectedReturnDate && v.expectedReturnDate < v.assignedAt) {
      ctx.addIssue({ code: "custom", path: ["expectedReturnDate"], message: "Expected return must be after the assignment date" });
    }
  });

export const confirmHandoverSchema = z.object({
  signature: z.string({ error: "Please sign before confirming" }).startsWith("data:image/png;base64,", "Please sign before confirming"),
  agree: z.literal("on", { error: "Tick the confirmation box" }),
});

export const disputeSchema = z.object({
  note: optText(500),
  missing: stringList(),
});
