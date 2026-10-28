import type { Role } from "@prisma/client";

/** Keys of the count badges shown on nav pills (see server/queries/shell.ts). */
export type BadgeKey = "assignments" | "transfers" | "requests" | "maintenance" | "returns" | "myAssets";

/** `rail` moves a page out of the top nav into the left black bar (as that icon) so the top nav fits on
 * one line with the bell and profile. The mobile menu still lists every item. */
export type NavItem = { label: string; href: string; badge?: BadgeKey; rail?: RailIcon };

/** Pages per role — mirrors docs/prototype (HANDOFF.md "Phase 0 decisions"). Everyday pages (with count
 * badges) stay in the top nav; less frequent ones sit in the rail. */
export const NAV: Record<Role, NavItem[]> = {
  MANAGER: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Assets", href: "/assets" },
    { label: "Assignments", href: "/assignments", badge: "assignments" },
    { label: "Transfers", href: "/transfers", badge: "transfers" },
    { label: "Requests", href: "/requests", badge: "requests" },
    { label: "Maintenance", href: "/maintenance", badge: "maintenance" },
    { label: "Returns", href: "/returns", badge: "returns" },
    { label: "Employees", href: "/employees", rail: "users" },
    { label: "Inspections", href: "/inspections", rail: "inspect" },
    { label: "Reports", href: "/reports", rail: "chart" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Assets", href: "/assets" },
    { label: "Employees", href: "/employees" },
    { label: "Requests", href: "/requests", badge: "requests" },
    { label: "Reports", href: "/reports" },
    { label: "Users", href: "/admin/users" },
    { label: "Master data", href: "/admin/departments" },
    { label: "Activity", href: "/activity", rail: "activity" },
    { label: "Settings", href: "/admin/settings", rail: "settings" },
  ],
  EMPLOYEE: [
    { label: "Home", href: "/home" },
    { label: "My assets", href: "/my-assets", badge: "myAssets" },
    { label: "Report issue", href: "/report-issue" },
    { label: "My requests", href: "/my-requests" },
    { label: "History", href: "/my-history" },
  ],
};

export type RailIcon = "plus" | "qr" | "warn" | "users" | "inspect" | "chart" | "activity" | "settings";
export type RailItem = { label: string; href: string; icon: RailIcon };

/** Floating quick-action rail (desktop), below the rail pages from NAV. */
export const RAIL: Record<"STAFF" | "EMPLOYEE", RailItem[]> = {
  // Register asset is a button on the Dashboard greeting card and the Assets page.
  STAFF: [
    { label: "Scan QR code", href: "/scan", icon: "qr" },
    { label: "Issues", href: "/issues", icon: "warn" },
  ],
  // Only actions with no other entry point: Report issue is in the nav, New request is on Home and
  // My requests, and Notifications is the bell in the header.
  EMPLOYEE: [{ label: "Scan QR code", href: "/scan", icon: "qr" }],
};

/** Pages that belong under a nav pill without being its exact href. */
const SECTION_ALIASES: Record<string, string> = {
  "/admin/locations": "/admin/departments",
  "/admin/categories": "/admin/departments",
  "/admin/vendors": "/admin/departments",
  "/issues": "/requests",
};

export function isActive(pathname: string, href: string): boolean {
  const path = SECTION_ALIASES[pathname] ?? pathname;
  return path === href || path.startsWith(href + "/");
}

export function homeFor(role: Role): string {
  return role === "EMPLOYEE" ? "/home" : "/dashboard";
}
