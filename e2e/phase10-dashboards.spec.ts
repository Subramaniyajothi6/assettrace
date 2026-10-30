import { expect, test } from "@playwright/test";
import { db, login, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("manager dashboard is scoped; admin sees everything", async ({ page, browser }) => {
  const mgr = await db.user.findUniqueOrThrow({ where: { email: "manager@assettrace.dev" }, include: { managedDepartments: true } });
  const scoped = await db.asset.count({ where: { departmentId: { in: mgr.managedDepartments.map((d) => d.id) } } });
  const active = await db.asset.count({ where: { status: { not: "RETIRED" } } });
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

  // Admins have their own layout: the Assets tile counts every active asset in all departments
  const admin = await browser.newPage();
  await login(admin, "admin");
  await admin.goto("/dashboard");
  await expect(admin.getByRole("link", { name: /^Assets.*in use/ })).toContainText(String(active));
});

test("admin gets the organisation layout; managers keep theirs", async ({ page, browser }) => {
  const unmanaged = await db.department.findMany({ where: { isActive: true, managers: { none: {} } }, select: { name: true } });
  await login(page, "admin");
  await page.goto("/dashboard");
  for (const t of ["Departments", "Needs an admin", "Open work", "Users", "Spend per month", "Value going out of warranty", "Asset age by department", "In use per month"]) {
    await expect(page.getByRole("heading", { name: t, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Without a manager/ })).toContainText(String(unmanaged.length));
  await expect(page.getByRole("heading", { name: "Needs your action" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Monthly asset transactions" })).toHaveCount(0);
  for (const d of unmanaged) await expect(page.getByText(`${d.name} has no manager`)).toBeVisible();

  const mgr = await browser.newPage();
  await login(mgr, "manager");
  await mgr.goto("/dashboard");
  await expect(mgr.getByRole("heading", { name: "Needs your action" })).toBeVisible();
  await expect(mgr.getByRole("heading", { name: "Needs an admin" })).toHaveCount(0);
});

test("employee home shows their own numbers", async ({ page }) => {
  await login(page, "employee");
  await page.goto("/home");
  await expect(page.getByRole("link", { name: /My assets/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest updates" })).toBeVisible();
  await expect(page.getByText("Confirm you received the Dell P2422H")).toBeVisible();
});
