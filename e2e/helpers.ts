import { expect, type Page } from "@playwright/test";

export const USERS = {
  admin: { email: "admin@assettrace.dev", password: "Admin@123" },
  manager: { email: "manager@assettrace.dev", password: "Manager@123" },
  employee: { email: "employee@assettrace.dev", password: "Employee@123" },
} as const;

export async function login(page: Page, who: keyof typeof USERS) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(USERS[who].password);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Wait for a sonner toast containing `text`. */
export async function toast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

export const uid = () => Date.now().toString(36).slice(-5).toUpperCase();

import { PrismaClient } from "@prisma/client";
/** Direct DB access for test setup/lookups (tests run against the demo database). */
export const db = new PrismaClient();

/** 1×1 PNG for upload tests. */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
