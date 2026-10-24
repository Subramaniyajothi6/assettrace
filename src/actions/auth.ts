"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/server/auth";

export type LoginState = { error?: string };

/** Only allow same-site relative paths as the post-login destination. */
function safeNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") ? v : "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeNext(formData.get("next")),
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email or password is incorrect, or the account is deactivated." };
    }
    throw err; // Next.js redirect on success
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
