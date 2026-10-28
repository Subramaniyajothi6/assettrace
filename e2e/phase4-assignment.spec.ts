import { expect, test, type Page } from "@playwright/test";
import { db, login, toast, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

async function assign(page: Page, assetTag: string, employee: string) {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag } });
  await page.goto(`/assignments/new?asset=${a.id}`);
  await page.getByPlaceholder("Name, employee code or department").fill(employee);
  await page.getByRole("radio", { name: new RegExp(employee) }).click();
  await page.getByRole("button", { name: "Assign asset" }).click();
  return a;
}

async function sign(page: Page) {
  const pad = page.getByRole("img", { name: /Signature pad/ });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 60);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 40 + i * 25, box.y + 60 + (i % 2) * 30);
  await page.mouse.up();
}

test("assign → employee signs the handover", async ({ browser }) => {
  const mgr = await browser.newPage();
  await login(mgr, "manager");
  const a = await assign(mgr, "AST-LAP-0004", "Arun Kumar");
  await toast(mgr, /Assigned to Arun Kumar.*AST-LAP-0004/);
  await expect(mgr).toHaveURL(/\/assignments$/);
  const row = await db.asset.findUniqueOrThrow({ where: { id: a.id }, include: { currentHolder: true } });
  expect(row.status).toBe("ASSIGNED");
  expect(row.currentHolder?.name).toBe("Arun Kumar");
  const note = await db.notification.findFirst({ where: { user: { email: "employee@assettrace.dev" }, title: { contains: a.name } }, orderBy: { createdAt: "desc" } });
  expect(note?.type).toBe("ASSET_ASSIGNED");

  const emp = await browser.newPage();
  await login(emp, "employee");
  await emp.goto("/my-assets");
  const card = emp.locator("article").filter({ hasText: "AST-LAP-0004" });
  await expect(card.getByText("Waiting for your signature")).toBeVisible();
  await card.getByRole("link", { name: "Review and sign" }).click();
  await emp.getByRole("button", { name: "Confirm and sign" }).click();
  await toast(emp, "Please sign before confirming");
  await sign(emp);
  await emp.getByRole("button", { name: "Confirm and sign" }).click();
  await toast(emp, /is now in your assets/);
  const g = await db.assignment.findFirstOrThrow({ where: { assetId: a.id, isActive: true } });
  expect(g.handoverStatus).toBe("CONFIRMED");
  expect(g.handoverSignaturePath).toMatch(/^signatures\/.+\.png$/);
  // manager sees it on the asset timeline
  await mgr.goto(`/assets/${a.id}`);
  await expect(mgr.getByText("Handover signed").first()).toBeVisible();
});

test("two managers assigning the same asset at once: only one wins", async ({ browser }) => {
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-LAP-0014" } });
  const p1 = await browser.newPage();
  const p2 = await browser.newPage();
  await login(p1, "manager");
  await login(p2, "admin");
  for (const [p, who] of [[p1, "Priya Sundaram"], [p2, "Divya Natarajan"]] as const) {
    await p.goto(`/assignments/new?asset=${a.id}`);
    await p.getByPlaceholder("Name, employee code or department").fill(who);
    await p.getByRole("radio", { name: new RegExp(who) }).click();
  }
  await Promise.all([p1.getByRole("button", { name: "Assign asset" }).click(), p2.getByRole("button", { name: "Assign asset" }).click()]);
  await expect.poll(async () => db.assignment.count({ where: { assetId: a.id, isActive: true } }), { timeout: 30_000 }).toBe(1);
  const errors = await Promise.all(
    [p1, p2].map((p) =>
      p
        .locator("[data-sonner-toast]")
        .filter({ hasText: /Only Available or Reserved|already has an active assignment/ })
        .first()
        // isVisible() checks once; waitFor() actually waits for the losing side's error toast.
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => true)
        .catch(() => false),
    ),
  );
  expect(errors.filter(Boolean)).toHaveLength(1);
});

test("employee disputes a handover, manager reopens it", async ({ browser }) => {
  const mgr = await browser.newPage();
  await login(mgr, "manager");
  const a = await assign(mgr, "AST-MOU-0001", "Arun Kumar");
  await toast(mgr, "assigned to Arun Kumar");
  const g = await db.assignment.findFirstOrThrow({ where: { assetId: a.id, isActive: true } });

  const emp = await browser.newPage();
  await login(emp, "employee");
  await emp.goto(`/my-assets/handover/${g.id}`);
  await emp.getByRole("checkbox", { name: "Mouse" }).click(); // untick the item itself
  await emp.getByRole("button", { name: "Confirm and sign" }).click();
  await toast(emp, "Some items are unticked");
  await emp.getByRole("button", { name: "Report a problem instead" }).click();
  await emp.getByLabel("Describe the problem").fill("Box was empty");
  await emp.getByRole("button", { name: "Report problem" }).click();
  await toast(emp, "Problem reported");
  expect((await db.assignment.findUniqueOrThrow({ where: { id: g.id } })).handoverStatus).toBe("DISPUTED");

  await mgr.goto(`/assets/${a.id}`);
  await expect(mgr.getByText(/Handover disputed:.*Missing: Mouse.*Box was empty/)).toBeVisible();
  await mgr.getByRole("button", { name: "Resolve dispute" }).click();
  await mgr.getByRole("button", { name: "Ask to sign again" }).click();
  await toast(mgr, "Handover reopened");
  expect((await db.assignment.findUniqueOrThrow({ where: { id: g.id } })).handoverStatus).toBe("PENDING");
});

test("employee history shows only their own holding period", async ({ page }) => {
  await login(page, "priya");
  await page.goto("/my-history");
  await expect(page.getByText("TRF-0007 · Rahul V → Priya Sundaram")).toBeVisible();
  // Rahul's earlier issue on the same laptop is private
  await expect(page.getByText(/ISS-0021/)).toHaveCount(0);
});

test("manager can't assign to an employee outside their departments", async ({ page }) => {
  await login(page, "manager");
  const a = await db.asset.findUniqueOrThrow({ where: { assetTag: "AST-DES-0002" } });
  await page.goto(`/assignments/new?asset=${a.id}`);
  await page.getByPlaceholder("Name, employee code or department").fill("Vignesh");
  await expect(page.getByText("No employees match.")).toBeVisible();
});
