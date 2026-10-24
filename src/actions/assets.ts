"use server";

import { redirect } from "next/navigation";
import { run } from "@/server/action";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { requireUser } from "@/server/permissions";
import { createAsset, updateAsset } from "@/server/services/assets";
import { fileFrom } from "@/server/storage";
import { formToObject } from "@/lib/validation/common";

export async function createAssetAction(fd: FormData) {
  return run(async () => {
    const a = await createAsset(formToObject(fd), fileFrom(fd, "photo"));
    return { id: a.id, tag: a.assetTag };
  }, ["/assets"]);
}

export async function updateAssetAction(id: string, fd: FormData) {
  return run(async () => {
    const a = await updateAsset(id, formToObject(fd), fileFrom(fd, "photo"));
    return { id: a.id, tag: a.assetTag };
  }, ["/assets", `/assets/${id}`]);
}

/** Manual entry on the scan page: asset tag → its QR route (access is checked there). */
export async function scanTagAction(fd: FormData) {
  const result = await run(async () => {
    await requireUser();
    const tag = String(fd.get("tag") ?? "").trim();
    if (!tag) throw new AppError("Enter an asset ID.", { tag: "Enter an asset ID" });
    const a = await prisma.asset.findFirst({ where: { assetTag: { equals: tag, mode: "insensitive" } }, select: { qrToken: true } });
    if (!a) throw new AppError(`No asset with ID ${tag}.`, { tag: "Not found" });
    return a.qrToken;
  });
  if (result.ok) redirect(`/scan/${result.data}`);
  return result;
}
