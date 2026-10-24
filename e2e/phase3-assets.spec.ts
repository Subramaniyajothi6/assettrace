import { expect, test } from "@playwright/test";
import { PNG_1PX, db, login, toast, uid } from "./helpers";

test("manager registers a laptop with a photo, then edits it", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/assets/new");
  const serial = `QA${uid()}`;
  await page.getByLabel("Category *").selectOption({ label: "Laptop" });
  await page.getByLabel("Asset name *").fill(`QA Laptop ${serial}`);
  await page.getByLabel("Brand").fill("Dell");
  await page.getByLabel("Serial number *").fill(serial);
  await page.getByLabel("Purchase cost (₹)").fill("55000");
  await page.getByLabel("Location *").selectOption({ label: "Chennai HQ" });
  await page.getByLabel("Department *").selectOption({ label: "Engineering" });
  await page.locator('input[type="file"][name="photo"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG_1PX });
  await page.getByRole("button", { name: "Save asset" }).click();
  await toast(page, /AST-LAP-\d{4} registered/);
  await expect(page).toHaveURL(/\/assets\/c[a-z0-9]{20,}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: `QA Laptop ${serial}` })).toBeVisible();
  await expect(page.getByText("Registered as Available · ₹55,000")).toBeVisible();
  // photo served through the permission-checked route
  const img = page.getByAltText(`Photo of QA Laptop ${serial}`);
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Brand").fill("Dell Inc");
  await page.getByRole("button", { name: "Save changes" }).click();
  await toast(page, "saved");
  await expect(page.getByText("Updated brand")).toBeVisible();
});

test("duplicate serial and bad warranty dates show field errors", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/assets/new");
  await page.getByLabel("Asset name *").fill("Dup laptop");
  await page.getByLabel("Serial number *").fill("5CG3421KX9");
  await page.getByLabel("Location *").selectOption({ label: "Chennai HQ" });
  await page.getByLabel("Department *").selectOption({ label: "Engineering" });
  await page.getByLabel("Warranty start").fill("2026-06-01");
  await page.getByLabel("Warranty end").fill("2026-01-01");
  await page.getByRole("button", { name: "Save asset" }).click();
  await expect(page.getByText(/already belongs to AST-LAP-0001/)).toBeVisible();
  await page.getByLabel("Serial number *").fill(`OK${uid()}`);
  await page.getByRole("button", { name: "Save asset" }).click();
  await expect(page.getByText("Warranty end must be after the start date")).toBeVisible();
});

test("asset list filters and search", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/assets?status=RETIRED");
  await expect(page.locator("table.tbl tbody tr")).toHaveCount(2);
  await page.goto("/assets");
  await page.getByPlaceholder(/Asset ID, serial/).fill("PF3K9ZQ2");
  await expect(page.locator("table.tbl tbody tr")).toHaveCount(1);
  await expect(page.locator("table.tbl tbody")).toContainText("Lenovo ThinkPad T14");
});

test("manager can't see an asset outside their departments", async ({ page }) => {
  const sales = await db.asset.findFirstOrThrow({ where: { department: { code: "SAL" } } });
  await login(page, "manager");
  await page.goto(`/assets/${sales.id}`);
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByText(sales.name)).toHaveCount(0);
});

test("QR scan access: holder sees match, others see no details", async ({ page }) => {
  const mine = await db.asset.findFirstOrThrow({ where: { currentHolder: { employeeCode: "EMP-0001" } } });
  const other = await db.asset.findFirstOrThrow({ where: { currentHolder: { employeeCode: "EMP-0002" } }, include: { currentHolder: true } });
  await login(page, "employee");
  await page.goto(`/scan/${mine.qrToken}`);
  await expect(page.getByText("Match found")).toBeVisible();
  await page.goto(`/scan/${other.qrToken}`);
  await expect(page.getByText("You don't have access to this asset")).toBeVisible();
  await expect(page.getByText(other.currentHolder!.name)).toHaveCount(0);
  // manual entry
  await page.goto("/scan");
  await page.getByLabel("Or type the asset ID").fill(mine.assetTag);
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page).toHaveURL(new RegExp(`/scan/${mine.qrToken}`));
});

test("signed-out QR scan goes to login and comes back", async ({ page }) => {
  const a = await db.asset.findFirstOrThrow({ where: { currentHolder: { employeeCode: "EMP-0001" } } });
  await page.goto(`/scan/${a.qrToken}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Work email").fill("employee@assettrace.dev");
  await page.getByLabel("Password").fill("Employee@123");
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(new RegExp(`/scan/${a.qrToken}`));
  await expect(page.getByText("Match found")).toBeVisible();
});

test("files need a session", async ({ request }) => {
  const res = await request.get("/api/files/assets/00000000-0000-0000-0000-000000000000.png", { maxRedirects: 0 });
  expect(res.status()).toBe(401);
});
