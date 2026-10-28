import { expect, test } from "@playwright/test";
import { PNG_1PX, db, login, toast, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("receive a return, blocked from assignment until inspected, inspect → available", async ({ page }) => {
  const r = await db.assetReturn.findUniqueOrThrow({ where: { returnNo: "RET-0014" }, include: { request: true } });
  await login(page, "manager");
  await page.goto(`/returns/${r.id}/receive`);
  await page.getByRole("checkbox", { name: "Laptop bag" }).click();
  await expect(page.getByText("Missing: Laptop bag.")).toBeVisible();
  await page.getByLabel("Condition on return *").selectOption("FAIR");
  await page.getByLabel("Damage noted").fill("Small dent on the lid");
  await page.locator('input[name="photos"]').setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: PNG_1PX }]);
  await page.getByRole("button", { name: "Confirm, inspect later" }).click();
  await toast(page, "RET-0014 received");
  await expect(page).toHaveURL(/\/returns$/);

  const a = await db.asset.findUniqueOrThrow({ where: { id: r.assetId } });
  expect(a.status).toBe("RETURNED");
  expect(a.currentHolderId).toBeNull();
  const ret = await db.assetReturn.findUniqueOrThrow({ where: { id: r.id }, include: { request: true, assignment: true } });
  expect(ret.missingAccessories).toEqual(["Laptop bag"]);
  expect(ret.photoPaths).toHaveLength(1);
  expect(ret.assignment.endReason).toBe("RETURNED");
  expect(ret.request?.status).toBe("COMPLETED");

  // Blocked from reassignment until inspected
  await page.goto(`/assets/${a.id}`);
  await expect(page.getByText("Returned and waiting for inspection.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Assign", exact: true })).toHaveCount(0);
  await page.goto(`/assignments/new?asset=${a.id}`);
  await expect(page.locator(`select[name="assetId"] option[value="${a.id}"]`)).toHaveCount(0);

  await page.goto(`/returns/${r.id}/inspect`);
  await page.getByRole("radio", { name: /^Good/ }).first().click();
  await page.getByLabel("Inspection remarks").fill("Cleaned, ready to reissue");
  await page.getByRole("button", { name: /Complete · set Available/ }).click();
  await toast(page, `${a.assetTag} is now available`);
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("AVAILABLE");
  const insp = await db.assetInspection.findUniqueOrThrow({ where: { returnId: r.id } });
  expect(insp.result).toBe("GOOD");
});

test("inspection that needs repair sends the asset to maintenance", async ({ page }) => {
  const r = await db.assetReturn.findUniqueOrThrow({ where: { returnNo: "RET-0013" } });
  await login(page, "manager");
  await page.goto(`/returns/${r.id}/inspect`);
  await page.getByRole("radio", { name: /^Minor repair/ }).click();
  await page.getByRole("button", { name: /Complete · set Under maintenance/ }).click();
  await toast(page, /is now under maintenance/);
  expect((await db.asset.findUniqueOrThrow({ where: { id: r.assetId } })).status).toBe("UNDER_MAINTENANCE");
  const m = await db.maintenanceRecord.findFirstOrThrow({ where: { assetId: r.assetId, status: "SCHEDULED" } });
  expect(m.problem).toContain("Minor repair after return RET-0013");
});

test("retire a damaged asset; it becomes read-only", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0008" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}`);
  await page.getByRole("link", { name: "Retire" }).click();
  await page.getByLabel("Reason *").fill("Hinge broken, beyond economical repair");
  await page.getByLabel("Disposal method *").selectOption("RECYCLED");
  await page.getByRole("button", { name: "Retire asset" }).click();
  await page.getByRole("button", { name: "Yes, retire" }).click();
  await toast(page, "AST-LAP-0008 retired");
  // Redirect + asset page render; slow from a machine far from the database.
  await expect(page.getByText(/This record is read-only/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await page.goto(`/assets/${a.id}/edit`);
  await expect(page.getByText("Retired assets are read-only")).toBeVisible();
  expect(await db.assetRetirement.count({ where: { assetId: a.id } })).toBe(1);
});

test("an assigned asset can't be retired", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0003" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}/retire`);
  await expect(page.getByText(/Can't retire yet/)).toBeVisible();
  await expect(page.getByText(/Request and receive the return first/)).toBeVisible();
});

test("mark lost, then found", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0004" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}`);
  await page.getByRole("button", { name: "Mark lost" }).click();
  await page.getByRole("dialog").getByLabel("What happened?").fill("Not found during stock check");
  await page.getByRole("dialog").getByRole("button", { name: "Mark lost" }).click();
  await toast(page, "AST-LAP-0004 marked lost");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("LOST");
  await page.getByRole("button", { name: "Mark found" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark found" }).click();
  await toast(page, "back and available");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("AVAILABLE");
});
