import { expect, type Page } from "@playwright/test";

export const USERS = {
  admin: { email: "admin@assettrace.dev", password: "Admin@123" },
  manager: { email: "manager@assettrace.dev", password: "Manager@123" },
  employee: { email: "employee@assettrace.dev", password: "Employee@123" },
  priya: { email: "priya@adz4needz.in", password: "Password@123" },
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

/** Draw a squiggle on the handover signature pad. */
export async function sign(page: Page) {
  const pad = page.getByRole("img", { name: /Signature pad/ });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 60);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 40 + i * 25, box.y + 60 + (i % 2) * 30);
  await page.mouse.up();
}
