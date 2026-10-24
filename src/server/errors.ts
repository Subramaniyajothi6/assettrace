import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/** Expected, user-facing failure. Its message is safe to show in a toast. */
export class AppError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Record") {
    super(`${what} not found.`);
    this.name = "NotFoundError";
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Friendly field errors for unique constraints, keyed by the Prisma field name. */
const UNIQUE_MESSAGES: Record<string, string> = {
  serialNumber: "Serial number already exists",
  assetTag: "Asset tag already exists",
  email: "Email already exists",
  employeeCode: "Employee code already exists",
  name: "Name already exists",
  code: "Code already exists",
};

/** Zod issues as { field: first message }. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Convert anything thrown by a service into an ActionResult. Never leaks internals. */
export function toActionError(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (err instanceof AppError) {
    return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
  }
  if (err instanceof ZodError) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(err) };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | string | undefined) ?? [];
      const fields = Array.isArray(target) ? target : [target];
      const fieldErrors: Record<string, string> = {};
      for (const f of fields) fieldErrors[f] = UNIQUE_MESSAGES[f] ?? "Already exists";
      if (fields.includes("assetId")) {
        return { ok: false, error: "This asset already has an active assignment." };
      }
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "Duplicate value.", fieldErrors };
    }
    if (err.code === "P2025") return { ok: false, error: "Record not found." };
  }
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}
