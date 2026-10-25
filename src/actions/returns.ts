"use server";

import { redirect } from "next/navigation";
import { run } from "@/server/action";
import { inspectReturn, receiveReturn } from "@/server/services/returns";
import { markFound, markLost, retireAsset } from "@/server/services/retirement";
import { filesFrom } from "@/server/storage";
import { formToObject } from "@/lib/validation/common";
import { STATUS_LABELS } from "@/lib/labels";

const PATHS = ["/returns", "/inspections", "/assets", "/assignments", "/my-assets", "/maintenance"];

export async function receiveReturnAction(returnId: string, fd: FormData) {
  const res = await run(async () => {
    const { ret, next } = await receiveReturn(returnId, formToObject(fd), filesFrom(fd, "photos", 3));
    return { no: ret.returnNo, next, id: ret.id };
  }, PATHS);
  return res;
}

export async function inspectReturnAction(returnId: string, fd: FormData) {
  const res = await run(async () => {
    const r = await inspectReturn(returnId, formToObject(fd));
    return { tag: r.tag, assetId: r.assetId, status: r.to ? STATUS_LABELS[r.to] : null };
  }, PATHS);
  // Result "Retire" continues on the retirement form.
  if (res.ok && !res.data.status) redirect(`/assets/${res.data.assetId}/retire?from=inspection`);
  return res;
}

export async function retireAssetAction(assetId: string, fd: FormData) {
  return run(() => retireAsset(assetId, formToObject(fd)), PATHS);
}

export async function markLostAction(assetId: string, fd: FormData) {
  return run(() => markLost(assetId, formToObject(fd)), PATHS);
}

export async function markFoundAction(assetId: string) {
  return run(() => markFound(assetId), PATHS);
}
