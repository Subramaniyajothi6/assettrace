import "server-only";
import type { Asset, MaintenanceType } from "@prisma/client";
import type { Tx } from "../db";
import { AppError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition } from "../lifecycle";
import { nextNumber } from "../sequence";
import { STATUS_LABELS } from "@/lib/labels";

export type StartMaintenanceInput = {
  problem: string;
  type: MaintenanceType;
  serviceProvider?: string | null;
  serviceDate?: Date;
  cost?: number | null;
  partsReplaced?: string | null;
  technicianNotes?: string | null;
  warrantyCovered?: boolean;
  expectedCompletion?: Date | null;
  issueId?: string | null;
};

/**
 * Open a maintenance record inside the caller's transaction and move the asset to
 * UNDER_MAINTENANCE, remembering the status to restore (ARCHITECTURE.md §4 rule 5).
 * A RETURNED asset must be inspected first; an asset already in maintenance keeps its original statusBefore.
 */
export async function startMaintenanceTx(tx: Tx, asset: Asset, actorId: string, input: StartMaintenanceInput) {
  if (asset.status === "RETURNED") throw new AppError("Inspect the returned asset first. The inspection decides whether it needs repair.");
  if (asset.status === "RETIRED") throw new AppError("Retired assets are read-only.");
  const already = asset.status === "UNDER_MAINTENANCE";
  if (!already) assertTransition(asset.status, "UNDER_MAINTENANCE");
  const statusBefore = already
    ? ((await tx.maintenanceRecord.findFirst({ where: { assetId: asset.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, orderBy: { createdAt: "asc" } }))?.statusBefore ?? "AVAILABLE")
    : asset.status;

  const maintenanceNo = await nextNumber(tx, "MNT");
  const record = await tx.maintenanceRecord.create({
    data: {
      maintenanceNo,
      assetId: asset.id,
      issueId: input.issueId ?? null,
      problem: input.problem,
      type: input.type,
      serviceProvider: input.serviceProvider ?? null,
      serviceDate: input.serviceDate ?? new Date(),
      cost: input.cost ?? 0,
      partsReplaced: input.partsReplaced ?? null,
      technicianNotes: input.technicianNotes ?? null,
      warrantyCovered: input.warrantyCovered ?? (asset.warrantyEnd ? asset.warrantyEnd >= new Date() : false),
      expectedCompletion: input.expectedCompletion ?? null,
      status: "SCHEDULED",
      statusBefore,
      createdById: actorId,
    },
  });
  if (!already) await tx.asset.update({ where: { id: asset.id }, data: { status: "UNDER_MAINTENANCE" } });
  await recordHistory(tx, {
    assetId: asset.id,
    actorId,
    event: "MAINTENANCE_STARTED",
    fromStatus: asset.status,
    toStatus: "UNDER_MAINTENANCE",
    description: `${maintenanceNo} · ${input.problem}${input.serviceProvider ? ` · ${input.serviceProvider}` : ""}${already ? "" : ` · was ${STATUS_LABELS[asset.status]}`}`,
    metadata: { maintenanceId: record.id },
  });
  return record;
}
