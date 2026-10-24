"use server";

import { run } from "@/server/action";
import { closeIssue, reportIssue, resolveIssue, sendIssueToMaintenance, startIssueReview } from "@/server/services/issues";
import { cancelRequest, createRequest, updateRequest } from "@/server/services/requests";
import { requestReturn } from "@/server/services/returns";
import { fileFrom } from "@/server/storage";
import { formToObject } from "@/lib/validation/common";

const ISSUE_PATHS = ["/issues", "/requests", "/my-requests", "/assets"];

export async function reportIssueAction(fd: FormData) {
  return run(async () => {
    const i = await reportIssue(formToObject(fd), fileFrom(fd, "photo"));
    return { no: i.issueNo };
  }, ISSUE_PATHS);
}

export async function startReviewAction(issueId: string) {
  return run(() => startIssueReview(issueId), ISSUE_PATHS);
}

export async function sendToMaintenanceAction(issueId: string, fd: FormData) {
  return run(async () => {
    const m = await sendIssueToMaintenance(issueId, formToObject(fd));
    return { no: m.maintenanceNo };
  }, [...ISSUE_PATHS, "/maintenance"]);
}

export async function resolveIssueAction(issueId: string, fd: FormData) {
  return run(() => resolveIssue(issueId, formToObject(fd)), ISSUE_PATHS);
}

export async function closeIssueAction(issueId: string) {
  return run(() => closeIssue(issueId), ISSUE_PATHS);
}

export async function createRequestAction(fd: FormData) {
  return run(async () => {
    const r = await createRequest(formToObject(fd));
    return { no: r.requestNo };
  }, ["/my-requests", "/requests", "/my-assets", "/returns"]);
}

export async function updateRequestAction(requestId: string, fd: FormData) {
  return run(async () => {
    const r = await updateRequest(requestId, formToObject(fd));
    return { no: r.requestNo };
  }, ["/requests", "/my-requests", "/returns"]);
}

export async function cancelRequestAction(requestId: string) {
  return run(() => cancelRequest(requestId), ["/my-requests", "/requests", "/returns", "/issues"]);
}

/** Manager-initiated return from the asset page or assignments list. */
export async function requestReturnAction(assetId: string) {
  return run(async () => {
    const r = await requestReturn(assetId);
    return { no: r.returnNo };
  }, ["/returns", "/assets", "/assignments", "/my-assets"]);
}
