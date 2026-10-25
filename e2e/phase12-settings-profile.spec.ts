import { expect, test } from "@playwright/test";
import { db, login, toast, uid, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("admin saves settings; bad prefix shows a field error", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/settings");
  await page.getByLabel("Organisation name *").fill("Adz4needz Pvt Ltd");
  await page.getByRole("radio", { name: "60 days" }).click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await toast(page, "Settings saved");
  expect((await db.setting.findUniqueOrThrow({ where: { key: "orgName" } })).value).toBe("Adz4needz Pvt Ltd");
  expect((await db.setting.findUniqueOrThrow({ where: { key: "warrantyAlertDays" } })).value).toBe("60");
  await page.getByLabel("Asset ID prefix *").fill("A");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("2–5 letters, e.g. AST")).toBeVisible();
});

test("manager can't open settings", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/admin/settings");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});

test("wrong current password is rejected on the profile page", async ({ page }) => {
  await login(page, "employee");
  await page.goto("/profile");
  await expect(page.getByText("employee@assettrace.dev")).toBeVisible();
  await page.getByLabel("Current password").fill("nope");
  await page.getByLabel("New password", { exact: true }).fill("Better@2026");
  await page.getByLabel("Repeat new password").fill("Better@2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Incorrect password")).toBeVisible();
});

test("a reset password forces a change at next sign-in", async ({ browser }) => {
  const admin = await browser.newPage();
  await login(admin, "admin");
  await admin.goto("/admin/users?q=kavya");
  await admin.getByRole("button", { name: "Reset password for Kavya S" }).click();
  await admin.getByRole("dialog").getByLabel("Temporary password *").fill("Temp@4321");
  await admin.getByRole("dialog").getByRole("button", { name: "Reset password" }).click();
  await toast(admin, "Password reset for Kavya S");

  const kavya = await browser.newPage();
  await kavya.goto("/login");
  await kavya.getByLabel("Work email").fill("kavya@adz4needz.in");
  await kavya.getByLabel("Password").fill("Temp@4321");
  await kavya.getByRole("button", { name: /^Sign in/ }).click();
  await expect(kavya.getByRole("heading", { name: "Set a new password" })).toBeVisible({ timeout: 60_000 });
  await kavya.goto("/my-assets"); // every page is gated
  await expect(kavya.getByRole("heading", { name: "Set a new password" })).toBeVisible();
  await kavya.getByLabel("Current password").fill("Temp@4321");
  await kavya.getByLabel("New password", { exact: true }).fill("Kavya@2026!");
  await kavya.getByLabel("Repeat new password").fill("Kavya@2026!");
  await kavya.getByRole("button", { name: "Update password" }).click();
  await expect(kavya.getByRole("heading", { name: "My assets" })).toBeVisible({ timeout: 60_000 });
  expect((await db.user.findUniqueOrThrow({ where: { email: "kavya@adz4needz.in" } })).mustChangePassword).toBe(false);
});

test("reserve and release an available asset", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-MOU-0001" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}`);
  await page.getByRole("button", { name: "Reserve", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Reserved for").fill("Divya, joining Monday");
  await page.getByRole("dialog").getByRole("button", { name: "Reserve" }).click();
  await toast(page, "AST-MOU-0001 reserved");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("RESERVED");
  await page.getByRole("button", { name: "Release reservation" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Release" }).click();
  await toast(page, "available again");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("AVAILABLE");
});

test("activity page lists transactions, filterable and scoped", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/activity?event=RETIRED");
  await expect(page.getByRole("heading", { name: "All activity" })).toBeVisible();
  await expect(page.locator("table.tbl tbody tr")).toHaveCount(1); // only the IT laptop; the Ops one is out of scope
  await page.goto("/activity?q=TRF-0007");
  await expect(page.getByText("TRF-0007 · Rahul V → Priya Sundaram")).toBeVisible();
});

test("asset type is editable", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0004" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}/edit`);
  const type = `Ultrabook ${uid()}`;
  await page.getByLabel("Asset type").fill(type);
  await page.getByRole("button", { name: "Save changes" }).click();
  await toast(page, "saved");
  await expect(page.getByText(type)).toBeVisible();
  // Only the field that changed is recorded (dates untouched by the form must not show up).
  const h = await db.assetHistory.findFirstOrThrow({ where: { assetId: a.id, event: "UPDATED" }, orderBy: { createdAt: "desc" } });
  expect(h.description).toBe("Updated type");
});
