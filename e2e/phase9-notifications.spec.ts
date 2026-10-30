import { expect, test } from "@playwright/test";
import { db, login, toast, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("bell shows unread, opening an item marks it read and follows the link", async ({ page }) => {
  await login(page, "employee");
  const bell = page.getByRole("button", { name: /Notifications, \d+ unread/ });
  await expect(bell).toHaveAccessibleName(/Notifications, [1-9]\d* unread/);
  await bell.click();
  const item = page.getByRole("button", { name: /Dell P2422H assigned to you/ });
  await item.click();
  await expect(page).toHaveURL(/\/my-assets\/handover\//);
  const n = await db.notification.findFirstOrThrow({ where: { user: { email: "employee@assettrace.dev" }, title: "Dell P2422H assigned to you" } });
  expect(n.isRead).toBe(true);
});

test("mark all as read on the notifications page", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/notifications?tab=unread");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  // The toast now names the count and offers Undo
  await toast(page, /\d+ notifications? marked as read/);
  await expect(page.locator("[data-sonner-toast]").getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  expect(await db.notification.count({ where: { user: { email: "manager@assettrace.dev" }, isRead: false } })).toBe(0);
});

test("dashboard load creates warranty alerts once (idempotent)", async ({ page }) => {
  const where = { user: { email: "manager@assettrace.dev" }, type: "WARRANTY_EXPIRING" as const };
  // Earlier tests already loaded the dashboard; start from a clean slate for this check.
  await db.notification.deleteMany({ where: { type: "WARRANTY_EXPIRING" } });
  const before = 0;
  await login(page, "manager");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const after = await db.notification.count({ where });
  expect(after).toBeGreaterThan(before);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await db.notification.count({ where })).toBe(after);
});

test("cron route needs the secret", async ({ request }) => {
  const res = await request.get("/api/cron/warranty");
  expect(res.status()).toBe(401);
  const ok = await request.get("/api/cron/warranty", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("created");
});
