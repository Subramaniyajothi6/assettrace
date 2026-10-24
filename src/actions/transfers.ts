"use server";

import { run } from "@/server/action";
import { cancelTransfer, requestTransfer, reviewTransfer } from "@/server/services/transfers";
import { formToObject } from "@/lib/validation/common";

export async function requestTransferAction(fd: FormData) {
  return run(async () => {
    const t = await requestTransfer(formToObject(fd));
    return { no: t.transferNo };
  }, ["/transfers", "/assets", "/my-assets"]);
}

export async function reviewTransferAction(id: string, fd: FormData) {
  return run(async () => {
    const t = await reviewTransfer(id, formToObject(fd));
    return { no: t.transferNo, status: t.status };
  }, ["/transfers", "/assets", "/assignments"]);
}

export async function cancelTransferAction(id: string) {
  return run(() => cancelTransfer(id), ["/transfers", "/assets", "/my-assets"]);
}
