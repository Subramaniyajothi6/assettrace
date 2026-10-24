import { expect, test } from "@playwright/test";
import { db, login, toast } from "./helpers";

test("completing a repair returns the asset to its holder and resolves the issue", async ({ page }) => {
  const m = await db.maintenanceRecord.findUniqueOrThrow({ where: { maintenanceNo: "MNT-0015" } });
  await login(page, "manager");
  await page.goto("/maintenance?status=open");
  const row = page.getByRole("row").filter({ hasText: "MNT-0015" });
  await row.getByRole("button", { name: "Mark complete" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Final cost (₹)").fill("7200");
  await dlg.getByLabel("Parts replaced").fill("Battery 57 Wh");
  await dlg.getByRole("button", { name: "Complete" }).click();
  await toast(page, /MNT-0015 completed\. AST-LAP-0002 is assigned again/);
  const a = await db.asset.findUniqueOrThrow({ where: { id: m.assetId } });
  expect(a.status).toBe("ASSIGNED");
  const issue = await db.assetIssue.findUniqueOrThrow({ where: { id: m.issueId! }, include: { request: true } });
  expect(issue.status).toBe("RESOLVED");
  expect(issue.request?.status).toBe("COMPLETED");
  expect(Number((await db.maintenanceRecord.findUniqueOrThrow({ where: { id: m.id } })).cost)).toBe(7200);
  const n = await db.notification.findFirst({ where: { user: { email: "employee@assettrace.dev" }, type: "MAINTENANCE_COMPLETED" } });
  expect(n?.title).toContain("is ready");
});

test("record maintenance on an available asset, then cancel it", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-DES-0002" } });
  await login(page, "manager");
  await page.goto(`/maintenance?asset=${a.id}`);
  const form = page.locator("form").filter({ hasText: "Record maintenance" });
  await expect(form.getByLabel("Asset *")).toHaveValue(a.id);
  await form.getByLabel("Problem *").fill("Annual dust cleaning and thermal paste");
  await form.getByLabel("Type *").selectOption("PREVENTIVE");
  await form.getByRole("button", { name: "Save record" }).click();
  await toast(page, /MNT-\d{4} saved/);
  const rec = await db.maintenanceRecord.findFirstOrThrow({ where: { assetId: a.id, status: "SCHEDULED" } });
  expect(rec.statusBefore).toBe("AVAILABLE");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("UNDER_MAINTENANCE");

  await page.goto(`/maintenance?m=${rec.id}`);
  await page.getByRole("row").filter({ hasText: rec.maintenanceNo }).getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel record" }).click();
  await toast(page, `${rec.maintenanceNo} cancelled`);
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("AVAILABLE");
});

test("not repairable marks an unassigned asset damaged", async ({ page }) => {
  const m = await db.maintenanceRecord.findUniqueOrThrow({ where: { maintenanceNo: "MNT-0016" } });
  await login(page, "manager");
  await page.goto(`/maintenance?m=${m.id}`);
  await page.getByRole("row").filter({ hasText: "MNT-0016" }).getByRole("button", { name: "Mark complete" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Outcome *").selectOption("NOT_REPAIRABLE");
  await dlg.getByRole("button", { name: "Complete" }).click();
  await toast(page, /MNT-0016 completed\. .* is damaged again/);
  expect((await db.asset.findUniqueOrThrow({ where: { id: m.assetId } })).status).toBe("DAMAGED");
});

test("a returned asset can't go to maintenance before inspection", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0005" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}`);
  await expect(page.getByText("Returned and waiting for inspection.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Record maintenance" })).toHaveCount(0);
});
