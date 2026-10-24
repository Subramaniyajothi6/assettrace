import { expect, test } from "@playwright/test";
import { PNG_1PX, db, login, toast } from "./helpers";

test("employee reports an issue → manager reviews and sends it to maintenance", async ({ browser }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-HEA-0001" } });
  const emp = await browser.newPage();
  await login(emp, "employee");
  await emp.goto(`/report-issue?asset=${a.id}`);
  await expect(emp.getByRole("radio", { name: /Jabra Evolve2 50/ })).toHaveAttribute("aria-checked", "true");
  await emp.getByLabel("What kind of problem? *").selectOption("HARDWARE");
  await emp.getByLabel("Short title *").fill("Left ear cup crackles");
  await emp.getByLabel("What's happening? *").fill("Crackling sound on the left side during calls.");
  await emp.getByRole("radio", { name: /High/ }).click();
  await emp.locator('input[name="photo"]').setInputFiles({ name: "x.png", mimeType: "image/png", buffer: PNG_1PX });
  await emp.getByRole("button", { name: "Report issue" }).click();
  await toast(emp, /ISS-\d{4} reported/);
  await expect(emp).toHaveURL(/\/my-requests/);
  await expect(emp.getByText("Left ear cup crackles").first()).toBeVisible();
  const issue = await db.assetIssue.findFirstOrThrow({ where: { title: "Left ear cup crackles" }, include: { request: true } });
  expect(issue.photoPath).toMatch(/^issues\//);
  expect(issue.request?.priority).toBe("HIGH");

  const mgr = await browser.newPage();
  await login(mgr, "manager");
  await mgr.goto("/issues");
  const card = mgr.locator("article.icard").filter({ hasText: issue.issueNo });
  await card.getByRole("button", { name: "Start review" }).click();
  await mgr.getByRole("alertdialog").getByRole("button", { name: "Start review" }).click();
  await toast(mgr, `${issue.issueNo} moved to Under review`);
  await card.getByRole("button", { name: "Send to maintenance" }).click();
  const dlg = mgr.getByRole("dialog");
  await dlg.getByLabel("Service provider").fill("Jabra Care, Chennai");
  await dlg.getByRole("button", { name: "Send to maintenance" }).click();
  await toast(mgr, /sent to maintenance as MNT-\d{4}/);
  const after = await db.asset.findUniqueOrThrow({ where: { id: a.id } });
  expect(after.status).toBe("UNDER_MAINTENANCE");
  const m = await db.maintenanceRecord.findFirstOrThrow({ where: { issueId: issue.id } });
  expect(m.statusBefore).toBe("ASSIGNED");
  expect((await db.assetIssue.findUniqueOrThrow({ where: { id: issue.id } })).status).toBe("MAINTENANCE");
  const n = await db.notification.findFirst({ where: { user: { email: "employee@assettrace.dev" }, title: "Your issue is now maintenance" } });
  expect(n).not.toBeNull();
});

test("manager resolves an issue directly and closes it; the request follows", async ({ page }) => {
  const issue = await db.assetIssue.findUniqueOrThrow({ where: { issueNo: "ISS-0035" } });
  await login(page, "manager");
  await page.goto("/issues");
  const card = page.locator("article.icard").filter({ hasText: "ISS-0035" });
  await card.getByRole("button", { name: "Mark resolved" }).click();
  await page.getByRole("dialog").getByLabel("What fixed it? *").fill("Updated the Wi-Fi driver");
  await page.getByRole("dialog").getByRole("button", { name: "Mark resolved" }).click();
  await toast(page, "ISS-0035 resolved");
  expect((await db.employeeRequest.findUniqueOrThrow({ where: { issueId: issue.id } })).status).toBe("COMPLETED");
  await card.getByRole("button", { name: "Close issue" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Close issue" }).click();
  await toast(page, "ISS-0035 closed");
});

test("new-asset request → manager approves with remarks → employee sees them", async ({ browser }) => {
  const emp = await browser.newPage();
  await login(emp, "employee");
  await emp.goto("/my-requests?new=1&type=NEW_ASSET");
  await emp.getByLabel("Details *").fill("Need a docking station for the second monitor. It keeps disconnecting.");
  await emp.getByRole("button", { name: "Send request" }).click();
  await toast(emp, /REQ-\d{4} sent/);
  const r = await db.employeeRequest.findFirstOrThrow({ where: { title: "Need a docking station for the second monitor" } });

  const mgr = await browser.newPage();
  await login(mgr, "manager");
  await mgr.goto(`/requests?r=${r.id}`);
  await mgr.getByLabel("Remarks to employee").fill("Ordered, arriving Friday");
  await mgr.locator("aside").getByLabel("Status").selectOption("APPROVED");
  await mgr.getByRole("button", { name: "Update request" }).click();
  await toast(mgr, "updated. The employee has been notified");

  await emp.reload();
  const card = emp.locator("article").filter({ hasText: r.requestNo });
  await expect(card.getByText("Ordered, arriving Friday")).toBeVisible();
  await expect(card.getByText("Approved")).toBeVisible();
});

test("employee requests a return then cancels it", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-MON-0001" } });
  await db.assignment.updateMany({ where: { assetId: a.id, isActive: true }, data: { handoverStatus: "CONFIRMED" } });
  await login(page, "employee");
  await page.goto(`/my-requests?new=1&type=RETURN&asset=${a.id}`);
  await page.getByLabel("Details *").fill("Moving to a hot desk, don't need the second screen");
  await page.getByRole("button", { name: "Send request" }).click();
  await toast(page, /REQ-\d{4} sent/);
  const ret = await db.assetReturn.findFirstOrThrow({ where: { assetId: a.id, status: "REQUESTED" }, include: { request: true } });
  expect(ret.request?.type).toBe("RETURN");
  const card = page.locator("article").filter({ hasText: ret.request!.requestNo });
  await card.getByRole("button", { name: "Cancel request" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel request" }).click();
  await toast(page, "cancelled");
  expect((await db.assetReturn.findUniqueOrThrow({ where: { id: ret.id } })).status).toBe("CANCELLED");
});

test("manager requests a return from the asset page", async ({ page }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0011" } });
  await login(page, "manager");
  await page.goto(`/assets/${a.id}`);
  await page.getByRole("button", { name: "Request return" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Request return" }).click();
  await toast(page, "Return requested");
  await expect(page.getByText(/asked to return this asset/)).toBeVisible();
});
