import { z } from "zod";
import { endOfToday, enumOf, id, optDate, optId, optMoney, optText, text } from "./common";

export const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;

const base = z.object({
  name: text("Asset name", 120),
  assetType: optText(60),
  brand: optText(60),
  model: optText(80),
  serialNumber: text("Serial number", 80),
  purchaseDate: optDate(),
  purchaseCost: optMoney(),
  vendorId: optId(),
  warrantyStart: optDate(),
  warrantyEnd: optDate(),
  locationId: id("a location"),
  departmentId: id("a department"),
  condition: enumOf(CONDITIONS, "a condition"),
  notes: optText(1000),
});

/** Date rules from ARCHITECTURE.md §4 rule 8. */
function dateRules<T extends z.infer<typeof base>>(v: T, ctx: z.RefinementCtx) {
  if (v.purchaseDate && v.purchaseDate > endOfToday()) {
    ctx.addIssue({ code: "custom", path: ["purchaseDate"], message: "Purchase date can't be in the future" });
  }
  if (v.warrantyStart && v.warrantyEnd && v.warrantyEnd < v.warrantyStart) {
    ctx.addIssue({ code: "custom", path: ["warrantyEnd"], message: "Warranty end must be after the start date" });
  }
}

export const assetCreateSchema = base.extend({ categoryId: id("a category") }).superRefine(dateRules);
export const assetUpdateSchema = base.superRefine(dateRules);

export const WARRANTY_FILTERS = ["active", "soon", "expired", "none"] as const;
