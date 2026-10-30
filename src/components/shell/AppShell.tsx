"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import {
  Activity,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  Clock,
  Home,
  Laptop,
  LogOut,
  Menu,
  Moon,
  Plus,
  QrCode,
  Settings,
  Sun,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Initials } from "@/components/Initials";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NAV, RAIL, homeFor, isActive, type BadgeKey, type NavItem, type RailIcon, type RailItem } from "./nav";
import { NotificationBell } from "./NotificationBell";
import { switchTheme } from "@/components/motion/switchTheme";
import { RollingCount } from "@/components/motion/RollingCount";
import { CondenseOnScroll } from "@/components/motion/CondenseOnScroll";

type Props = {
  role: Role;
  name: string;
  scopeLabel: string;
  badges: Partial<Record<BadgeKey, number>>;
  unread: number;
  allowDark: boolean;
  children: React.ReactNode;
};

const RAIL_ICONS: Record<RailIcon, React.ComponentType<{ size?: number }>> = {
  plus: Plus,
  qr: QrCode,
  warn: TriangleAlert,
  users: Users,
  inspect: ClipboardCheck,
  chart: BarChart3,
  activity: Activity,
  settings: Settings,
};

export function AppShell({ role, name, scopeLabel, badges, unread, allowDark, children }: Props) {
  const pathname = usePathname();
  const isEmployee = role === "EMPLOYEE";
  const nav = NAV[role];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const topNav = nav.filter((n) => !n.rail);
  const railPages = nav.filter((n): n is NavItem & { rail: RailIcon } => !!n.rail);

  const navLinks = (items: NavItem[], className?: string) =>
    items.map((n) => {
      const count = n.badge ? badges[n.badge] : 0;
      return (
        <Link key={n.href} href={n.href} className={className} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
          {n.label}
          {count ? (
            <span className="badge">
              <RollingCount value={count} />
            </span>
          ) : null}
        </Link>
      );
    });

  return (
    <div className={cn(isEmployee && "emp")}>
      <Rail
        pages={railPages.map((n) => ({ label: n.label, href: n.href, icon: n.rail, active: isActive(pathname, n.href) }))}
        items={RAIL[isEmployee ? "EMPLOYEE" : "STAFF"]}
        allowDark={allowDark}
      />

      <div className="page">
        <header className="top rise">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="iconbtn menu-btn" aria-label="Open menu">
              <Menu size={19} />
            </SheetTrigger>
            <SheetContent side="left" className="mobile-menu">
              <SheetTitle className="sr">Main menu</SheetTitle>
              <nav aria-label="Main" className="mobile-menu-nav">
                {navLinks(nav)}
              </nav>
            </SheetContent>
          </Sheet>

          <Link className="brand" href={homeFor(role)}>
            <span className="logo">
              <Briefcase size={22} strokeWidth={1.8} />
            </span>
            <span>
              <b>AssetTrace</b>
              <small>{scopeLabel}</small>
            </span>
          </Link>

          <nav className="nav" aria-label="Main">
            {navLinks(topNav)}
            {/* The left rail is hidden below 1100px; its pages then show here (CSS .nav-rail). */}
            {navLinks(railPages, "nav-rail")}
          </nav>

          <div className="tright">
            <NotificationBell initialUnread={unread} />
            <Link className="me" href="/profile" aria-label="Profile">
              <Initials name={name} />
              <span>
                {name}
                <small>{ROLE_LABELS[role]}</small>
              </span>
            </Link>
          </div>
        </header>

        <CondenseOnScroll />
        <main className="view" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </main>
      </div>

      {isEmployee ? <EmployeeTabBar pathname={pathname} /> : null}
    </div>
  );
}

function Rail({ pages, items, allowDark }: { pages: (RailItem & { active: boolean })[]; items: RailItem[]; allowDark: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <nav className="rail" aria-label="More pages and quick actions">
      {pages.map((r) => {
        const Icon = RAIL_ICONS[r.icon];
        return (
          <Link key={r.href} href={r.href} data-tip={r.label} aria-label={r.label} aria-current={r.active ? "page" : undefined}>
            <Icon size={19} />
          </Link>
        );
      })}
      {pages.length ? <hr /> : null}
      {items.map((r) => {
        const Icon = RAIL_ICONS[r.icon];
        return (
          <Link key={r.href} href={r.href} data-tip={r.label} aria-label={r.label}>
            <Icon size={19} />
          </Link>
        );
      })}
      <hr />
      {allowDark ? (
        <button
          type="button"
          data-tip={dark ? "Light theme" : "Dark theme"}
          aria-label={dark ? "Light theme" : "Dark theme"}
          onClick={(e) => switchTheme(e.currentTarget, dark ? "light" : "dark", setTheme)}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      ) : null}
      <form action={logoutAction}>
        <button type="submit" data-tip="Sign out" aria-label="Sign out">
          <LogOut size={19} />
        </button>
      </form>
    </nav>
  );
}

const TABS = [
  { label: "Home", href: "/home", Icon: Home },
  { label: "My assets", href: "/my-assets", Icon: Laptop },
  { label: "Scan QR", href: "/scan", Icon: QrCode },
  { label: "My requests", href: "/my-requests", Icon: Plus },
  { label: "History", href: "/my-history", Icon: Clock },
];

function EmployeeTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="mnav" aria-label="Main">
      {TABS.map(({ label, href, Icon }) => (
        <Link key={href} href={href} aria-label={label} aria-current={isActive(pathname, href) ? "page" : undefined}>
          <Icon size={20} />
        </Link>
      ))}
    </nav>
  );
}
