"use server";

import { run } from "@/server/action";
import { changeOwnPassword } from "@/server/services/profile";
import { updateSettings } from "@/server/services/settings";
import { formToObject } from "@/lib/validation/common";

export async function changePasswordAction(fd: FormData) {
  return run(() => changeOwnPassword(formToObject(fd)), ["/profile"]);
}

export async function updateSettingsAction(fd: FormData) {
  return run(() => updateSettings(formToObject(fd)), ["/admin/settings"]);
}
