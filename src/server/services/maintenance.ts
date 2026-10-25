import "server-only";
import type { Asset, AssetStatus, MaintenanceType } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { assertTransition, canTransition } from "../lifecycle";
import { createNotification, userIdOfEmployee } from "../notify";
import { assertCan, requireUser } from "../permissions";
import { nextNumber } from "../sequence";
import { STATUS_LABELS } from "@/lib/labels";
import { completeMaintenanceSchema, maintenanceSchema } from "@/lib/validation/issues";
import { lockAsset } from "./assignments";
import { markIssueInMaintenanceTx, reopenIssueReviewTx, resolveIssueFromMaintenanceTx } from "./issues";

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
  /** Only the return inspection may send a RETURNED asset to repair (ARCHITECTURE.md §4 rule 3). */
  fromInspection?: boolean;
};

/**
 * Open a maintenance record inside the caller's transaction and move the asset to
 * UNDER_MAINTENANCE, remembering the status to restore (ARCHITECTURE.md §4 rule 5).
 * A RETURNED asset must be inspected first; an asset already in maintenance keeps its original statusBefore.
 */
export async function startMaintenanceTx(tx: Tx, asset: Asset, actorId: string, input: StartMaintenanceInput) {
  if (asset.status === "RETURNED" && !input.fromInspection) {
    throw new AppError("Inspect the returned asset first. The inspection decides whether it needs repair.");
  }
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

// ───────────── Maintenance page actions ─────────────

const OPEN = ["SCHEDULED", "IN_PROGRESS"] as const;

async function loadRecord(id: string) {
  const user = await requireUser();
  const m = await prisma.maintenanceRecord.findUnique({ where: { id }, include: { asset: true } });
  if (!m) throw new NotFoundError("Maintenance record");
  if (user.role === "EMPLOYEE") throw new ForbiddenError();
  assertCan(user, "maintenance:manage", { departmentId: m.asset.departmentId });
  return { user, m };
}

async function notifyHolder(tx: Tx, asset: Asset, title: string, message: string, type: "MAINTENANCE_COMPLETED" | "GENERAL") {
  if (!asset.currentHolderId) return;
  await createNotification(tx, { userIds: [await userIdOfEmployee(tx, asset.currentHolderId)], type, title, message, link: "/my-assets" });
}

/** Where the asset goes when its last open maintenance ends (ARCHITECTURE.md §4 rule 5). */
async function restoreTarget(tx: Tx, assetId: string): Promise<AssetStatus> {
  const active = await tx.assignment.findFirst({ where: { assetId, isActive: true }, select: { id: true } });
  return active ? "ASSIGNED" : "AVAILABLE";
}

/** Record maintenance from the Maintenance page (optionally linked to an open issue). */
export async function createMaintenance(input: unknown) {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") throw new ForbiddenError();
  const data = maintenanceSchema.parse(input);
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
  if (!asset) throw new NotFoundError("Asset");
  assertCan(user, "maintenance:manage", { departmentId: asset.departmentId });
  if (data.issueId) {
    const issue = await prisma.assetIssue.findUnique({ where: { id: data.issueId } });
    if (!issue || issue.assetId !== asset.id || issue.status === "RESOLVED" || issue.status === "CLOSED") {
      throw new AppError("Pick an open issue for this asset.", { issueId: "Pick an open issue for this asset" });
    }
  }
  return prisma.$transaction(async (tx) => {
    const fresh = await lockAsset(tx, asset.id);
    const m = await startMaintenanceTx(tx, fresh, user.id, data);
    if (data.issueId) await markIssueInMaintenanceTx(tx, user.id, data.issueId);
    await notifyHolder(tx, fresh, `Your ${fresh.name} is in for maintenance`, data.serviceProvider ?? data.problem, "GENERAL");
    return m;
  });
}

export async function startMaintenanceWork(id: string) {
  const { user, m } = await loadRecord(id);
  if (m.status !== "SCHEDULED") throw new AppError("Only scheduled maintenance can be started.");
  return prisma.$transaction(async (tx) => {
    const r = await tx.maintenanceRecord.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    await recordHistory(tx, { assetId: m.assetId, actorId: user.id, event: "UPDATED", description: `${m.maintenanceNo} in progress` });
    return r;
  });
}

/** Complete: back to ASSIGNED/AVAILABLE (or DAMAGED if not repairable), resolve the issue, tell the holder. */
export async function completeMaintenance(id: string, input: unknown) {
  const { user, m } = await loadRecord(id);
  if (!(OPEN as readonly string[]).includes(m.status)) throw new AppError("This maintenance is already closed.");
  const data = completeMaintenanceSchema.parse(input);
  const serviceDay = new Date(m.serviceDate);
  serviceDay.setHours(0, 0, 0, 0);
  if (data.actualCompletion < serviceDay) throw new AppError("Completion can't be before the service date.", { actualCompletion: "Before the service date" });

  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, m.assetId);
    const othersOpen = await tx.maintenanceRecord.count({ where: { assetId: asset.id, id: { not: id }, status: { in: [...OPEN] } } });
    let to: AssetStatus = asset.status;
    if (asset.status === "UNDER_MAINTENANCE" && !othersOpen) {
      if (data.outcome === "NOT_REPAIRABLE") {
        if (asset.currentHolderId) throw new AppError("It's still assigned. Request it back before marking it not repairable.");
        to = "DAMAGED";
      } else {
        to = await restoreTarget(tx, asset.id);
      }
      assertTransition(asset.status, to);
      await tx.asset.update({ where: { id: asset.id }, data: { status: to, ...(to === "DAMAGED" ? { condition: "DAMAGED" as const } : {}) } });
    }
    const r = await tx.maintenanceRecord.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualCompletion: data.actualCompletion,
        cost: data.cost,
        partsReplaced: data.partsReplaced ?? m.partsReplaced,
        technicianNotes: data.technicianNotes ?? m.technicianNotes,
      },
    });
    await recordHistory(tx, {
      assetId: asset.id,
      actorId: user.id,
      event: "MAINTENANCE_COMPLETED",
      fromStatus: asset.status,
      toStatus: to,
      description: `${m.maintenanceNo} · ${m.problem} · ₹${Math.round(data.cost).toLocaleString("en-IN")}${m.warrantyCovered ? " (warranty)" : ""}${data.outcome === "NOT_REPAIRABLE" ? " · not repairable" : ""}${to !== asset.status ? ` · back to ${STATUS_LABELS[to]}` : ""}`,
      metadata: { maintenanceId: m.id },
    });
    if (m.issueId) {
      await resolveIssueFromMaintenanceTx(tx, user.id, m.issueId, data.outcome === "NOT_REPAIRABLE" ? "Not repairable" : `Fixed: ${data.partsReplaced ?? m.problem}`);
    }
    await notifyHolder(tx, asset, `${asset.name} is ready`, `Maintenance ${m.maintenanceNo} is complete`, "MAINTENANCE_COMPLETED");
    return { record: r, status: to, tag: asset.assetTag };
  });
}

/** Cancel an open record: the asset goes back to how it was and the issue back to review. */
export async function cancelMaintenance(id: string) {
  const { user, m } = await loadRecord(id);
  if (!(OPEN as readonly string[]).includes(m.status)) throw new AppError("This maintenance is already closed.");
  return prisma.$transaction(async (tx) => {
    const asset = await lockAsset(tx, m.assetId);
    await tx.maintenanceRecord.update({ where: { id }, data: { status: "CANCELLED" } });
    const othersOpen = await tx.maintenanceRecord.count({ where: { assetId: asset.id, id: { not: id }, status: { in: [...OPEN] } } });
    let to: AssetStatus = asset.status;
    if (asset.status === "UNDER_MAINTENANCE" && !othersOpen) {
      const before = m.statusBefore;
      to = asset.currentHolderId ? "ASSIGNED" : before && before !== "ASSIGNED" && canTransition("UNDER_MAINTENANCE", before) ? before : "AVAILABLE";
      await tx.asset.update({ where: { id: asset.id }, data: { status: to } });
    }
    await recordHistory(tx, { assetId: asset.id, actorId: user.id, event: "STATUS_CHANGED", fromStatus: asset.status, toStatus: to, description: `${m.maintenanceNo} cancelled` });
    if (m.issueId) await reopenIssueReviewTx(tx, user.id, m.issueId);
    return { status: to };
  });
}
