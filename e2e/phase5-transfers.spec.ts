import { expect, test } from "@playwright/test";
import { db, login, sign, toast } from "./helpers";

test("employee requests a transfer → manager approves → new holder signs → completed", async ({ browser }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-HEA-0001" } });
  const emp = await browser.newPage();
  await login(emp, "employee");
  await emp.goto("/my-assets");
  const card = emp.locator("article").filter({ hasText: "AST-HEA-0001" });
  await card.getByRole("button", { name: "Transfer" }).click();
  const dlg = emp.getByRole("dialog");
  await dlg.getByLabel("Transfer to *").selectOption({ label: "Priya Sundaram · Engineering" });
  await dlg.getByLabel("Reason *").fill("Priya needs it for client calls");
  await dlg.getByRole("button", { name: "Send for approval" }).click();
  await toast(emp, /TRF-\d{4} sent for approval/);
  await expect(card.getByText(/waiting for approval/)).toBeVisible();
  const t = await db.assetTransfer.findFirstOrThrow({ where: { assetId: a.id, status: "REQUESTED" } });

  const mgr = await browser.newPage();
  await login(mgr, "manager");
  await mgr.goto(`/transfers?t=${t.id}`);
  await expect(mgr.getByText("Priya needs it for client calls")).toBeVisible();
  await mgr.getByLabel("Your remarks").fill("OK, hand it over today");
  await mgr.getByRole("button", { name: "Approve transfer" }).click();
  await toast(mgr, "Priya Sundaram has been asked to sign");
  const after = await db.assetTransfer.findUniqueOrThrow({ where: { id: t.id } });
  expect(after.status).toBe("APPROVED");
  const old = await db.assignment.findFirstOrThrow({ where: { assetId: a.id, employee: { name: "Arun Kumar" } }, orderBy: { assignedAt: "desc" } });
  expect(old.isActive).toBe(false);
  expect(old.endReason).toBe("TRANSFERRED");
  expect((await db.asset.findUniqueOrThrow({ where: { id: a.id }, include: { currentHolder: true } })).currentHolder?.name).toBe("Priya Sundaram");

  const priya = await browser.newPage();
  await login(priya, "priya");
  await priya.goto(`/my-assets/handover/${after.newAssignmentId}`);
  await sign(priya);
  await priya.getByRole("button", { name: "Confirm and sign" }).click();
  await toast(priya, /is now in your assets/);
  expect((await db.assetTransfer.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("COMPLETED");
  await mgr.goto(`/assets/${a.id}?tab=transfers`);
  await expect(mgr.getByText("Completed").first()).toBeVisible();
});

test("manager rejects a transfer with remarks", async ({ page }) => {
  const t = await db.assetTransfer.findUniqueOrThrow({ where: { transferNo: "TRF-0010" } });
  await login(page, "manager");
  await page.goto(`/transfers?t=${t.id}`);
  await page.getByLabel("Your remarks").fill("Kavya still needs it this month");
  await page.getByRole("button", { name: "Reject" }).click();
  await toast(page, "TRF-0010 rejected");
  await page.goto("/transfers?tab=rejected");
  await expect(page.getByText("Remarks: Kavya still needs it this month", { exact: false })).toBeVisible();
  const h = await db.assetHistory.findFirst({ where: { assetId: t.assetId, event: "TRANSFER_REJECTED" }, orderBy: { createdAt: "desc" } });
  expect(h?.description).toContain("Kavya still needs it");
});

test("an asset with a pending transfer can't get a second one", async ({ page }) => {
  const t = await db.assetTransfer.findUniqueOrThrow({ where: { transferNo: "TRF-0009" } });
  await login(page, "manager");
  await page.goto(`/assets/${t.assetId}`);
  await expect(page.getByRole("link", { name: "Review transfer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Transfer" })).toHaveCount(0);
});
