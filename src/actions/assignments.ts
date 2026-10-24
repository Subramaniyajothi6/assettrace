"use server";

import { run } from "@/server/action";
import { assignAsset, confirmHandover, disputeHandover, remindHandover, reopenHandover } from "@/server/services/assignments";
import { formToObject } from "@/lib/validation/common";

export async function assignAction(fd: FormData) {
  return run(async () => {
    const { asset, employee } = await assignAsset(formToObject(fd));
    return { assetId: asset.id, tag: asset.assetTag, name: employee.name };
  }, ["/assignments", "/assets"]);
}

export async function remindAction(assignmentId: string) {
  return run(() => remindHandover(assignmentId), ["/assignments"]);
}

export async function confirmHandoverAction(assignmentId: string, fd: FormData) {
  return run(() => confirmHandover(assignmentId, formToObject(fd)), ["/my-assets", "/home"]);
}

export async function disputeHandoverAction(assignmentId: string, fd: FormData) {
  return run(() => disputeHandover(assignmentId, formToObject(fd)), ["/my-assets", "/home"]);
}

export async function reopenHandoverAction(assignmentId: string) {
  return run(() => reopenHandover(assignmentId), ["/assignments", "/assets"]);
}
