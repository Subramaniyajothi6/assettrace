import "server-only";
import type { IssueStatus, RequestStatus } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { createNotification, managersOf, userIdOfEmployee } from "../notify";
import { assertCan, can, requireUser } from "../permissions";
import { nextNumber } from "../sequence";
import { uploadImage } from "../storage";
import { ISSUE_STATUS_LABELS } from "@/lib/labels";
import { PRIORITY_FOR_SEVERITY, reportIssueSchema, resolveIssueSchema, sendToMaintenanceSchema } from "@/lib/validation/issues";
import { startMaintenanceTx } from "./maintenance";

/** Employee reports a problem with an asset they hold (creates the issue + an ISSUE request). */
export async function reportIssue(input: unknown, photo: File | null) {
  const user = await requireUser();
  assertCan(user, "issue:report");
  const data = reportIssueSchema.parse(input);
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
  if (!asset) throw new NotFoundError("Asset");
  if (!user.employeeId || asset.currentHolderId !== user.employeeId) {
    throw new ForbiddenError("You can only report issues for assets assigned to you.");
  }
  const photoPath = photo ? await uploadImage(photo, "issues") : null;

  return prisma.$transaction(async (tx) => {
    const issueNo = await nextNumber(tx, "ISS");
    const issue = await tx.assetIssue.create({
      data: { issueNo, assetId: asset.id, reportedById: user.employeeId!, category: data.category, title: data.title, description: data.description, severity: data.severity, photoPath },
    });
    const requestNo = await nextNumber(tx, "REQ");
    await tx.employeeRequest.create({
      data: {
        requestNo,
        type: "ISSUE",
        title: data.title,
        description: data.description,
        priority: PRIORITY_FOR_SEVERITY[data.severity],
        employeeId: user.employeeId!,
        assetId: asset.id,
        issueId: issue.id,
      },
    });
    await recordHistory(tx, { assetId: asset.id, actorId: user.id, event: "ISSUE_REPORTED", description: `${issueNo} · ${data.title} · ${data.severity.charAt(0)}${data.severity.slice(1).toLowerCase()}`, metadata: { issueId: issue.id } });
    await createNotification(tx, {
      userIds: await managersOf(tx, asset.departmentId),
      excludeUserId: user.id,
      type: "ISSUE_STATUS_UPDATED",
      title: data.severity === "CRITICAL" ? "Critical issue reported" : "Issue reported",
      message: `${data.title} · ${user.name}`,
      link: "/issues",
    });
    return issue;
  });
}

async function loadIssue(issueId: string) {
  const user = await requireUser();
  const issue = await prisma.assetIssue.findUnique({ where: { id: issueId }, include: { asset: true, reportedBy: { select: { name: true } } } });
  if (!issue) throw new NotFoundError("Issue");
  if (user.role === "EMPLOYEE" || !can(user, "request:handle", { departmentId: issue.asset.departmentId })) throw new ForbiddenError();
  return { user, issue };
}

/** Status change + linked request sync + history + employee notification. */
async function setIssueStatus(tx: Tx, actorId: string, issue: { id: string; issueNo: string; title: string; assetId: string; reportedById: string }, to: IssueStatus, extra: { resolution?: string } = {}) {
  const done = to === "RESOLVED" || to === "CLOSED";
  await tx.assetIssue.update({
    where: { id: issue.id },
    data: { status: to, handledById: actorId, ...(to === "RESOLVED" ? { resolvedAt: new Date() } : {}), ...(extra.resolution ? { resolution: extra.resolution } : {}) },
  });
  const reqStatus: RequestStatus = done ? "COMPLETED" : "IN_PROGRESS";
  await tx.employeeRequest.updateMany({
    where: { issueId: issue.id, status: { notIn: ["CANCELLED", "REJECTED"] } },
    data: { status: reqStatus, handledById: actorId, ...(done ? { resolvedAt: new Date() } : {}), ...(extra.resolution ? { managerRemarks: extra.resolution } : {}) },
  });
  await recordHistory(tx, { assetId: issue.assetId, actorId, event: "ISSUE_UPDATED", description: `${issue.issueNo} → ${ISSUE_STATUS_LABELS[to]}${extra.resolution ? ` · ${extra.resolution}` : ""}` });
  await createNotification(tx, {
    userIds: [await userIdOfEmployee(tx, issue.reportedById)],
    type: "ISSUE_STATUS_UPDATED",
    title: `Your issue is now ${ISSUE_STATUS_LABELS[to].toLowerCase()}`,
    message: issue.title,
    link: "/my-requests",
  });
}

export async function startIssueReview(issueId: string) {
  const { user, issue } = await loadIssue(issueId);
  if (issue.status !== "REPORTED") throw new AppError("Only newly reported issues can move to review.");
  return prisma.$transaction((tx) => setIssueStatus(tx, user.id, issue, "UNDER_REVIEW"));
}

/** "Send to maintenance": opens a maintenance record and puts the asset under maintenance. */
export async function sendIssueToMaintenance(issueId: string, input: unknown) {
  const { user, issue } = await loadIssue(issueId);
  if (issue.status !== "REPORTED" && issue.status !== "UNDER_REVIEW") throw new AppError("This issue is already past review.");
  assertCan(user, "maintenance:manage", { departmentId: issue.asset.departmentId });
  const data = sendToMaintenanceSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.asset.findUniqueOrThrow({ where: { id: issue.assetId } });
    const m = await startMaintenanceTx(tx, fresh, user.id, {
      problem: issue.title,
      type: data.type,
      serviceProvider: data.serviceProvider,
      expectedCompletion: data.expectedCompletion,
      issueId: issue.id,
    });
    await setIssueStatus(tx, user.id, issue, "MAINTENANCE");
    return m;
  });
}

/** Fixed without a maintenance record (e.g. a software fix during review). */
export async function resolveIssue(issueId: string, input: unknown) {
  const { user, issue } = await loadIssue(issueId);
  if (issue.status === "MAINTENANCE") throw new AppError("This issue resolves when its maintenance is completed.");
  if (issue.status !== "REPORTED" && issue.status !== "UNDER_REVIEW") throw new AppError("This issue is already resolved.");
  const { resolution } = resolveIssueSchema.parse(input);
  return prisma.$transaction((tx) => setIssueStatus(tx, user.id, issue, "RESOLVED", { resolution }));
}

export async function closeIssue(issueId: string) {
  const { user, issue } = await loadIssue(issueId);
  if (issue.status !== "RESOLVED") throw new AppError("Only resolved issues can be closed.");
  return prisma.$transaction((tx) => setIssueStatus(tx, user.id, issue, "CLOSED"));
}

/** Used by maintenance completion: resolve the linked issue. */
export async function resolveIssueFromMaintenanceTx(tx: Tx, actorId: string, issueId: string, resolution: string) {
  const issue = await tx.assetIssue.findUnique({ where: { id: issueId } });
  if (!issue || issue.status === "RESOLVED" || issue.status === "CLOSED") return;
  await setIssueStatus(tx, actorId, issue, "RESOLVED", { resolution });
}
