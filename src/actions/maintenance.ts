"use server";

import { run } from "@/server/action";
import { cancelMaintenance, completeMaintenance, createMaintenance, startMaintenanceWork, updateMaintenance } from "@/server/services/maintenance";
import { formToObject } from "@/lib/validation/common";
import { STATUS_LABELS } from "@/lib/labels";

const PATHS = ["/maintenance", "/assets", "/issues", "/my-assets"];

export async function createMaintenanceAction(fd: FormData) {
  return run(async () => {
    const m = await createMaintenance(formToObject(fd));
    return { no: m.maintenanceNo };
  }, PATHS);
}

export async function startMaintenanceAction(id: string) {
  return run(async () => {
    const m = await startMaintenanceWork(id);
    return { no: m.maintenanceNo };
  }, PATHS);
}

export async function updateMaintenanceAction(id: string, fd: FormData) {
  return run(async () => {
    const m = await updateMaintenance(id, formToObject(fd));
    return { no: m.maintenanceNo };
  }, PATHS);
}

export async function completeMaintenanceAction(id: string, fd: FormData) {
  return run(async () => {
    const r = await completeMaintenance(id, formToObject(fd));
    return { no: r.record.maintenanceNo, tag: r.tag, status: STATUS_LABELS[r.status] };
  }, PATHS);
}

export async function cancelMaintenanceAction(id: string) {
  return run(() => cancelMaintenance(id), PATHS);
}
