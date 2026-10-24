import "server-only";
import { prisma } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { recordHistory } from "../history";
import { createNotification, managersOf } from "../notify";
import { assertCan, requestScope, requireUser } from "../permissions";
import { nextNumber } from "../sequence";
import { REQUEST_STATUS_LABELS } from "@/lib/labels";
import { newRequestSchema, updateRequestSchema } from "@/lib/validation/issues";
import { requestReturnTx } from "./returns";

/** Employee self-service request: replacement, return or new asset. Issues go through reportIssue. */
export async function createRequest(input: unknown) {
  const user = await requireUser();
  assertCan(user, "request:create");
  if (!user.employeeId) throw new AppError("Your login isn't linked to an employee record.");
  const data = newRequestSchema.parse(input);

  if (data.type === "RETURN") {
    return prisma.$transaction(async (tx) => {
      const ret = await requestReturnTx(tx, user, data.assetId, { reason: data.description.slice(0, 200), description: data.description, priority: data.priority });
      return tx.employeeRequest.findUniqueOrThrow({ where: { returnId: ret.id } });
    });
  }

  let asset: { id: string; name: string; departmentId: string | null; currentHolderId: string | null } | null = null;
  if (data.type === "REPLACEMENT") {
    asset = await prisma.asset.findUnique({ where: { id: data.assetId }, select: { id: true, name: true, departmentId: true, currentHolderId: true } });
    if (!asset || asset.currentHolderId !== user.employeeId) throw new ForbiddenError("You can only ask to replace assets assigned to you.");
  }
  const emp = await prisma.employee.findUniqueOrThrow({ where: { id: user.employeeId }, select: { departmentId: true } });
  const title = data.type === "NEW_ASSET" ? data.description.split(/[.\n]/)[0].slice(0, 80) : `Replace ${asset!.name}`;

  return prisma.$transaction(async (tx) => {
    const requestNo = await nextNumber(tx, "REQ");
    const r = await tx.employeeRequest.create({
      data: { requestNo, type: data.type, title, description: data.description, priority: data.priority, employeeId: user.employeeId!, assetId: asset?.id ?? null },
    });
    await createNotification(tx, {
      userIds: await managersOf(tx, asset?.departmentId ?? emp.departmentId),
      excludeUserId: user.id,
      type: "REQUEST_UPDATED",
      title: `${data.type === "NEW_ASSET" ? "New asset" : "Replacement"} request`,
      message: `${title} · ${user.name}`,
      link: `/requests?r=${r.id}`,
    });
    return r;
  });
}

/** Manager updates status/remarks; the employee is notified every time. */
export async function updateRequest(requestId: string, input: unknown) {
  const user = await requireUser();
  assertCan(user, "request:handle");
  const data = updateRequestSchema.parse(input);
  const r = await prisma.employeeRequest.findFirst({ where: { AND: [{ id: requestId }, requestScope(user)] }, include: { employee: { select: { userId: true } } } });
  if (!r) throw new NotFoundError("Request");
  if (r.status === "CANCELLED") throw new AppError("The employee cancelled this request.");
  const done = data.status === "COMPLETED" || data.status === "REJECTED";
  return prisma.$transaction(async (tx) => {
    const updated = await tx.employeeRequest.update({
      where: { id: r.id },
      data: { status: data.status, managerRemarks: data.managerRemarks, handledById: user.id, resolvedAt: done ? new Date() : null },
    });
    if (r.type === "RETURN" && r.returnId && data.status === "REJECTED") {
      const ret = await tx.assetReturn.findUnique({ where: { id: r.returnId } });
      if (ret?.status === "REQUESTED") {
        await tx.assetReturn.update({ where: { id: ret.id }, data: { status: "REJECTED", remarks: data.managerRemarks } });
        await recordHistory(tx, { assetId: ret.assetId, actorId: user.id, event: "UPDATED", description: `${ret.returnNo} rejected${data.managerRemarks ? ` · ${data.managerRemarks}` : ""}` });
      }
    }
    await createNotification(tx, {
      userIds: [r.employee.userId],
      type: "REQUEST_UPDATED",
      title: `${r.requestNo} is now ${REQUEST_STATUS_LABELS[data.status].toLowerCase()}`,
      message: data.managerRemarks || r.title,
      link: "/my-requests",
    });
    return updated;
  });
}

/** Employee withdraws a pending request (and the open return / reported issue behind it). */
export async function cancelRequest(requestId: string) {
  const user = await requireUser();
  const r = await prisma.employeeRequest.findUnique({ where: { id: requestId }, include: { asset: { select: { departmentId: true } } } });
  if (!r) throw new NotFoundError("Request");
  if (!user.employeeId || r.employeeId !== user.employeeId) throw new ForbiddenError("You can only cancel your own requests.");
  if (r.status !== "PENDING") throw new AppError("Only pending requests can be cancelled.");
  return prisma.$transaction(async (tx) => {
    await tx.employeeRequest.update({ where: { id: r.id }, data: { status: "CANCELLED", resolvedAt: new Date() } });
    if (r.returnId) {
      const ret = await tx.assetReturn.findUnique({ where: { id: r.returnId } });
      if (ret?.status === "REQUESTED") {
        await tx.assetReturn.update({ where: { id: ret.id }, data: { status: "CANCELLED" } });
        await recordHistory(tx, { assetId: ret.assetId, actorId: user.id, event: "UPDATED", description: `${ret.returnNo} cancelled by ${user.name}` });
      }
    }
    if (r.issueId) {
      const issue = await tx.assetIssue.findUnique({ where: { id: r.issueId } });
      if (issue?.status === "REPORTED") {
        await tx.assetIssue.update({ where: { id: issue.id }, data: { status: "CLOSED", resolution: "Cancelled by the employee" } });
        await recordHistory(tx, { assetId: issue.assetId, actorId: user.id, event: "ISSUE_UPDATED", description: `${issue.issueNo} cancelled by ${user.name}` });
      }
    }
    await createNotification(tx, {
      userIds: await managersOf(tx, r.asset?.departmentId ?? null),
      excludeUserId: user.id,
      type: "REQUEST_UPDATED",
      title: `${r.requestNo} cancelled`,
      message: `${r.title} · ${user.name}`,
      link: `/requests?r=${r.id}`,
    });
  });
}
