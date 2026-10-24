import type { Role } from "@prisma/client";

/** Keys of the count badges shown on nav pills (see server/queries/shell.ts). */
export type BadgeKey = "assignments" | "transfers" | "requests" | "maintenance" | "returns" | "myAssets";

export type NavItem = { label: string; href: string; badge?: BadgeKey };

/** Top pill nav per role — mirrors docs/prototype (HANDOFF.md "Phase 0 decisions"). */
export const NAV: Record<Role, NavItem[]> = {
  MANAGER: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Assets", href: "/assets" },
    { label: "Assignments", href: "/assignments", badge: "assignments" },
    { label: "Transfers", href: "/transfers", badge: "transfers" },
    { label: "Requests", href: "/requests", badge: "requests" },
    { label: "Maintenance", href: "/maintenance", badge: "maintenance" },
    { label: "Returns", href: "/returns", badge: "returns" },
    { label: "Reports", href: "/reports" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Assets", href: "/assets" },
    { label: "Employees", href: "/employees" },
    { label: "Requests", href: "/requests", badge: "requests" },
    { label: "Reports", href: "/reports" },
    { label: "Users", href: "/admin/users" },
    { label: "Master data", href: "/admin/departments" },
    { label: "Settings", href: "/admin/settings" },
  ],
  EMPLOYEE: [
    { label: "Home", href: "/home" },
    { label: "My assets", href: "/my-assets", badge: "myAssets" },
    { label: "Report issue", href: "/report-issue" },
    { label: "My requests", href: "/my-requests" },
    { label: "History", href: "/my-history" },
  ],
};

export type RailIcon = "search" | "plus" | "qr" | "warn" | "bell";
export type RailItem = { label: string; href: string; icon: RailIcon };

/** Floating quick-action rail (desktop). */
export const RAIL: Record<"STAFF" | "EMPLOYEE", RailItem[]> = {
  STAFF: [
    { label: "Search assets", href: "/assets", icon: "search" },
    { label: "Register asset", href: "/assets/new", icon: "plus" },
    { label: "Scan QR code", href: "/scan", icon: "qr" },
    { label: "Issues", href: "/issues", icon: "warn" },
  ],
  EMPLOYEE: [
    { label: "Scan QR code", href: "/scan", icon: "qr" },
    { label: "Report issue", href: "/report-issue", icon: "warn" },
    { label: "New request", href: "/my-requests?new=1", icon: "plus" },
    { label: "Notifications", href: "/notifications", icon: "bell" },
  ],
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
