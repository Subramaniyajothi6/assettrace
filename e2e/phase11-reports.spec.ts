import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { db, login, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

async function managerScope() {
  const mgr = await db.user.findUniqueOrThrow({ where: { email: "manager@assettrace.dev" }, include: { managedDepartments: true } });
  return mgr.managedDepartments.map((d) => d.id);
}

test("manager sees a scoped inventory and can export CSV and Excel", async ({ page }) => {
  const depts = await managerScope();
  const scoped = await db.asset.count({ where: { departmentId: { in: depts } } });
  await login(page, "manager");
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Asset inventory" })).toBeVisible();
  await expect(page.getByText(new RegExp(`^${scoped} rows ·`))).toBeVisible();

  const csv = await page.request.get("/api/export/inventory?format=csv", { timeout: 90_000 });
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = (await csv.text()).replace(/^﻿/, "");
  const lines = text.trim().split(/\r?\n/);
  expect(lines[0]).toContain("Asset ID,Name,Category");
  expect(lines.length - 1).toBe(scoped);
  expect(text).not.toContain("Samsung Galaxy A54"); // Sales asset, outside his departments

  const xlsx = await page.request.get("/api/export/inventory?format=xlsx", { timeout: 90_000 });
  expect(xlsx.status()).toBe(200);
  const wb = XLSX.read(await xlsx.body(), { type: "buffer", cellDates: true });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
  expect(rows).toHaveLength(scoped);
  expect(typeof rows.find((r) => r["Cost (₹)"] !== undefined)?.["Cost (₹)"]).toBe("number");
});

test("filters carry into the export", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/reports?r=inventory&status=RETIRED");
  await expect(page.getByText(/^2 rows ·/)).toBeVisible();
  const href = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
  expect(href).toContain("status=RETIRED");
  const lines = (await (await page.request.get(href!, { timeout: 90_000 })).text()).trim().split(/\r?\n/);
  expect(lines).toHaveLength(3);
});

test("every report renders and exports", async ({ page }) => {
  await login(page, "admin");
  for (const key of ["inventory", "employees", "maintenance", "transfers", "returns", "retired", "warranty", "issues"]) {
    await page.goto(`/reports?r=${key}`);
    await expect(page.locator("table.tbl, .empty").first()).toBeVisible();
    const res = await page.request.get(`/api/export/${key}?format=xlsx`, { timeout: 90_000 });
    expect(res.status(), key).toBe(200);
  }
});

test("employees can't export", async ({ page }) => {
  await login(page, "employee");
  const res = await page.request.get("/api/export/inventory?format=csv", { timeout: 90_000 });
  expect(res.status()).toBe(403);
  await page.goto("/reports");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});
