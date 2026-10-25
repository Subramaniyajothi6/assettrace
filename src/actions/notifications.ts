"use server";

import { run } from "@/server/action";
import { bellData, markAllNotificationsRead, markNotificationRead } from "@/server/services/notifications";

/** Read-only, polled by the bell; no revalidation needed. */
export async function bellDataAction() {
  return bellData();
}

export async function markReadAction(id: string) {
  return run(() => markNotificationRead(id), ["/notifications"]);
}

export async function markAllReadAction() {
  return run(() => markAllNotificationsRead(), ["/notifications"]);
}
