import { expect, test } from "@playwright/test";
import { db, login, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("manager dashboard is scoped; admin sees everything", async ({ page, browser }) => {
  const mgr = await db.user.findUniqueOrThrow({ where: { email: "manager@assettrace.dev" }, include: { managedDepartments: true } });
  const scoped = await db.asset.count({ where: { departmentId: { in: mgr.managedDepartments.map((d) => d.id) } } });
  const all = await db.asset.count();
  await login(page, "manager");
  await page.goto("/dashboard");
  const total = page.getByRole("link", { name: /Total assets/ });
  await expect(total).toContainText(String(scoped));
  for (const t of ["All assets by status", "Maintenance cost by month", "Warranty expiry", "Monthly asset transactions", "Where your assets are", "Needs your action"]) {
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
  }
  // Breakdown card: one tab per dimension, the heading follows the tab
  for (const [tab, heading] of [["Category", "Active assets by category"], ["Department", "Active assets by department"], ["Location", "Active assets by location"]]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  // Every chart has a table view
  await page.getByText("Show as table").first().click();
  await expect(page.locator("details[open] table")).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, "admin");
  await admin.goto("/dashboard");
  await expect(admin.getByRole("link", { name: /Total assets/ })).toContainText(String(all));
});

test("employee home shows their own numbers", async ({ page }) => {
  await login(page, "employee");
  await page.goto("/home");
  await expect(page.getByRole("link", { name: /My assets/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest updates" })).toBeVisible();
  await expect(page.getByText("Confirm you received the Dell P2422H")).toBeVisible();
});
