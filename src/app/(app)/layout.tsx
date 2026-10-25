import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { getNavBadges, getScopeLabel, getUnreadCount } from "@/server/queries/shell";
import { AppShell } from "@/components/shell/AppShell";
import { ForcePasswordChange } from "@/components/shell/ForcePasswordChange";
import { skinHasDark } from "@/lib/skins";

// Every page inside reads per-user data.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Accounts created or reset with a temporary password must set their own first.
  if (user.mustChangePassword) return <ForcePasswordChange name={user.name} />;
  const settings = await getSettings();
  const [badges, unread, scopeLabel] = await Promise.all([
    getNavBadges(user),
    getUnreadCount(user.id),
    getScopeLabel(user, settings.orgName),
  ]);
  return (
    <AppShell
      role={user.role}
      name={user.name}
      scopeLabel={scopeLabel}
      badges={badges}
      unread={unread}
      allowDark={skinHasDark(settings.uiSkin)}
    >
      {children}
    </AppShell>
  );
}
