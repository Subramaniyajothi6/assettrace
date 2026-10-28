import { expect, test } from "@playwright/test";
import { login, toast, uid, resetDemoData } from "./helpers";

test.beforeAll(() => resetDemoData());

test("admin manages departments: add, duplicate error, edit, deactivate", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/departments");
  await expect(page.getByRole("heading", { name: "Master data" })).toBeVisible();
  const code = `Q${uid().slice(0, 4)}`;
  const form = page.locator("form").filter({ hasText: "Add department" });
  await form.getByLabel("Department name *").fill(`QA Dept ${code}`);
  await form.getByLabel("Code *").fill(code);
  await form.getByRole("button", { name: "Save department" }).click();
  await toast(page, `QA Dept ${code} added`);
  await expect(page.getByRole("cell", { name: `QA Dept ${code}`, exact: true })).toBeVisible();

  // duplicate name → field error, not a 500
  await form.getByLabel("Department name *").fill("Engineering");
  await form.getByLabel("Code *").fill("ZZZ1");
  await form.getByRole("button", { name: "Save department" }).click();
  await expect(form.getByText("Name already exists")).toBeVisible();

  // edit: rename and give it a manager
  const row = page.getByRole("row").filter({ hasText: `QA Dept ${code}` });
  await row.getByRole("button", { name: `Edit QA Dept ${code}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Department name *").fill(`QA Dept ${code} renamed`);
  await dialog.getByLabel("Lakshmi Iyer").check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await toast(page, `QA Dept ${code} renamed saved`);
  await expect(page.getByRole("row").filter({ hasText: `QA Dept ${code} renamed` })).toContainText("Lakshmi Iyer");

  // deactivate
  await row.getByRole("switch").click();
  await toast(page, "deactivated");
});

test("admin adds a category with a bad code and gets a field error", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/categories");
  const form = page.locator("form").filter({ hasText: "Add category" });
  await form.getByLabel("Name *").fill(`Webcam ${uid()}`);
  await form.getByLabel("Code (3 letters) *").fill("WEBCAM");
  await form.getByRole("button", { name: "Save category" }).click();
  await expect(form.getByText("Code must be 3 letters")).toBeVisible();
});

test("admin adds an employee with a login, then the user appears", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/employees");
  const id = uid();
  // "Add employee" opens a dialog (the form no longer sits beside the table).
  await page.getByRole("button", { name: "Add employee" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Full name *").fill(`Test Person ${id}`);
  await form.getByLabel("Work email *").fill(`test.${id.toLowerCase()}@adz4needz.in`);
  await form.getByLabel("Department *").selectOption({ label: "Engineering" });
  await form.getByRole("button", { name: "Add employee" }).click();
  await toast(page, /added as EMP-/);
  await page.goto(`/admin/users?q=${id}`);
  await expect(page.getByText(`Test Person ${id}`, { exact: true })).toBeVisible();
});

test("manager: locations allowed, departments and users denied, employees scoped", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/admin/locations");
  await expect(page.getByRole("heading", { name: "Master data" })).toBeVisible();
  await page.goto("/admin/departments");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
  await page.goto("/employees");
  await expect(page.getByText("Arun Kumar")).toBeVisible();
  await expect(page.getByText("Vignesh R")).toHaveCount(0); // Sales is not his department
});

test("employee can't open employees or admin pages", async ({ page }) => {
  await login(page, "employee");
  for (const p of ["/employees", "/admin/users", "/admin/locations"]) {
    await page.goto(p);
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
  }
});
