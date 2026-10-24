import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Prisma, Role } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./db";
import { ForbiddenError } from "./errors";

/** The signed-in user, re-read from the DB on every request (role/active changes apply immediately). */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  /** Departments a MANAGER manages. Empty for others; ADMIN is unscoped. */
  managedDepartmentIds: string[];
};

export type Action =
  | "asset:view"
  | "asset:create"
  | "asset:edit"
  | "asset:assign"
  | "asset:transfer"
  | "asset:return"
  | "asset:inspect"
  | "asset:retire"
  | "asset:markLost"
  | "maintenance:manage"
  | "request:handle"
  | "request:create"
  | "issue:report"
  | "handover:confirm"
  | "employee:manage"
  | "employee:changeRole"
  | "location:manage"
  | "masterdata:manage" // departments, categories, vendors
  | "user:manage"
  | "settings:manage"
  | "report:view";

const ALL: Role[] = ["EMPLOYEE", "MANAGER", "ADMIN"];
const STAFF: Role[] = ["MANAGER", "ADMIN"];
const ADMIN: Role[] = ["ADMIN"];

/** Permission matrix (docs/ARCHITECTURE.md §3). Scope is checked separately. */
const MATRIX: Record<Action, Role[]> = {
  "asset:view": ALL,
  "asset:create": STAFF,
  "asset:edit": STAFF,
  "asset:assign": STAFF,
  "asset:transfer": ALL, // employees may *request* a transfer of their own asset
  "asset:return": ALL, // employees may *request* a return of their own asset
  "asset:inspect": STAFF,
  "asset:retire": STAFF,
  "asset:markLost": STAFF,
  "maintenance:manage": STAFF,
  "request:handle": STAFF,
  "request:create": ALL,
  "issue:report": ALL,
  "handover:confirm": ALL,
  "employee:manage": STAFF,
  "employee:changeRole": ADMIN,
  "location:manage": STAFF,
  "masterdata:manage": ADMIN,
  "user:manage": ADMIN,
  "settings:manage": ADMIN,
  "report:view": STAFF,
};

/** Fields used to decide whether a record is inside the user's scope. */
export type ScopeTarget = {
  departmentId?: string | null;
  currentHolderId?: string | null;
};

/**
 * Role check + scope check.
 * - ADMIN: everything.
 * - MANAGER: the record's department must be one they manage.
 * - EMPLOYEE: the record must be held by them.
 * Pass no `target` to check the role only.
 */
export function can(user: CurrentUser, action: Action, target?: ScopeTarget): boolean {
  if (!MATRIX[action].includes(user.role)) return false;
  if (!target || user.role === "ADMIN") return true;
  if (user.role === "MANAGER") {
    // Managers also act on assets they personally hold (confirm handover, report issue).
    if (user.employeeId && target.currentHolderId === user.employeeId) return true;
    return !!target.departmentId && user.managedDepartmentIds.includes(target.departmentId);
  }
  return !!user.employeeId && target.currentHolderId === user.employeeId;
}

export function assertCan(user: CurrentUser, action: Action, target?: ScopeTarget): void {
  if (!can(user, action, target)) throw new ForbiddenError();
}

/** Current user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      employee: { select: { id: true } },
      managedDepartments: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employee?.id ?? null,
    managedDepartmentIds: user.role === "MANAGER" ? user.managedDepartments.map((d) => d.id) : [],
  };
});

/** For pages: redirect to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: signed in with one of `roles`, otherwise throws (rendered as 403). */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError("You don't have access to this page.");
  return user;
}

// ───────────── Read scopes (rule 5: every read is scoped) ─────────────

const NONE = "__none__";

/** Assets the user may see. */
export function assetScope(user: CurrentUser): Prisma.AssetWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") {
    return {
      OR: [
        { departmentId: { in: user.managedDepartmentIds } },
        ...(user.employeeId ? [{ currentHolderId: user.employeeId }] : []),
      ],
    };
  }
  return { currentHolderId: user.employeeId ?? NONE };
}

/** Assets the user may *manage* (excludes a manager's own out-of-scope assets). */
export function managedAssetScope(user: CurrentUser): Prisma.AssetWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") return { departmentId: { in: user.managedDepartmentIds } };
  return { id: NONE };
}

/** Employees the user may see. */
export function employeeScope(user: CurrentUser): Prisma.EmployeeWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") return { departmentId: { in: user.managedDepartmentIds } };
  return { id: user.employeeId ?? NONE };
}

/** Records hanging off an asset (assignments, maintenance, transfers, returns, issues...). */
export function viaAssetScope(user: CurrentUser): { asset: Prisma.AssetWhereInput } {
  return { asset: managedAssetScope(user) };
}

/** Employee requests: managers see requests from their departments' employees or about their assets. */
export function requestScope(user: CurrentUser): Prisma.EmployeeRequestWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") {
    return {
      OR: [
        { employee: { departmentId: { in: user.managedDepartmentIds } } },
        { asset: { departmentId: { in: user.managedDepartmentIds } } },
      ],
    };
  }
  return { employeeId: user.employeeId ?? NONE };
}
