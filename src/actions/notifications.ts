"use server";

import { run } from "@/server/action";
import { markAllNotificationsRead, markNotificationRead, markNotificationsUnread } from "@/server/services/notifications";

export async function markReadAction(id: string) {
  return run(() => markNotificationRead(id), ["/notifications"]);
}

export async function markAllReadAction() {
  return run(() => markAllNotificationsRead(), ["/notifications"]);
}

export async function markUnreadAction(ids: string[]) {
  return run(() => markNotificationsUnread(ids), ["/notifications"]);
}
