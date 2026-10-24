import type { AssetStatus } from "@prisma/client";
import { AppError } from "./errors";
import { STATUS_LABELS } from "@/lib/labels";

/** Single source of truth for allowed asset status changes (docs/ARCHITECTURE.md §4). */
export const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE: ["ASSIGNED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "DAMAGED", "RETIRED"],
  RESERVED: ["ASSIGNED", "AVAILABLE"],
  ASSIGNED: ["ASSIGNED", "UNDER_MAINTENANCE", "RETURNED", "LOST", "DAMAGED"],
  UNDER_MAINTENANCE: ["AVAILABLE", "ASSIGNED", "DAMAGED", "RETIRED"],
  RETURNED: ["AVAILABLE", "UNDER_MAINTENANCE", "DAMAGED", "RETIRED"], // only via inspection
  DAMAGED: ["UNDER_MAINTENANCE", "RETIRED"],
  LOST: ["AVAILABLE", "RETIRED"],
  RETIRED: [],
};

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Throws a user-facing error if `from → to` is not allowed. */
export function assertTransition(from: AssetStatus, to: AssetStatus, reason?: string): void {
  if (canTransition(from, to)) return;
  const base = `Can't change ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`;
  throw new AppError(reason ? `${base}: ${reason}` : `${base}.`);
}

/** Business rule 1: only these statuses can receive a new assignment. */
export const ASSIGNABLE: AssetStatus[] = ["AVAILABLE", "RESERVED"];

export function assertAssignable(status: AssetStatus): void {
  if (ASSIGNABLE.includes(status)) return;
  if (status === "RETURNED") {
    throw new AppError("This asset was returned and must be inspected before it can be assigned again.");
  }
  throw new AppError(`Only Available or Reserved assets can be assigned (this one is ${STATUS_LABELS[status]}).`);
}

/** Retired assets are read-only forever. */
export function assertEditable(status: AssetStatus): void {
  if (status === "RETIRED") throw new AppError("Retired assets are read-only.");
}
