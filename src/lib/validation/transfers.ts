import { z } from "zod";
import { id, optId, optText, text } from "./common";

export const transferRequestSchema = z.object({
  assetId: id("an asset"),
  toEmployeeId: id("who receives it"),
  toLocationId: optId(),
  reason: text("Reason", 500),
});

export const transferReviewSchema = z.object({
  decision: z.enum(["approve", "reject"], { error: "Choose approve or reject" }),
  remarks: optText(500),
});
