import { z } from "zod";
import { email, id, optId, optText, password, stringList, text } from "./common";

const code = (len?: number) =>
  z
    .string({ error: "Code is required" })
    .trim()
    .toUpperCase()
    .regex(len ? new RegExp(`^[A-Z]{${len}}$`) : /^[A-Z0-9]{2,6}$/, len ? `Code must be ${len} letters` : "2–6 letters or digits");

export const departmentSchema = z.object({
  name: text("Name", 80),
  code: code(),
  managerIds: stringList(),
});

export const locationSchema = z.object({
  name: text("Name", 80),
  code: code(),
  address: optText(200),
});

export const categorySchema = z.object({
  name: text("Name", 80),
  code: code(3),
  description: optText(300),
});

export const vendorSchema = z.object({
  name: text("Vendor name", 120),
  contactName: optText(80),
  email: z.preprocess((v) => (v === "" ? undefined : v), email().optional()).transform((v) => v ?? null),
  phone: optText(30),
});

export const employeeSchema = z.object({
  name: text("Full name", 80),
  email: email(),
  phone: optText(30),
  designation: optText(80),
  departmentId: id("a department"),
  locationId: optId(),
});

export const userCreateSchema = z.object({
  employeeId: id("an employee"),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"], { error: "Choose a role" }),
  password: password(),
});

export const roleSchema = z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]);

export const resetPasswordSchema = z.object({ password: password() });

export const MASTER_KINDS = ["departments", "locations", "categories", "vendors"] as const;
export type MasterKind = (typeof MASTER_KINDS)[number];
