import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { PageHeader } from "@/components/PageHeader";
import { Denied } from "@/components/Denied";
import { homeFor } from "@/components/shell/nav";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

const WINDOWS = [15, 30, 60, 90];

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Denied home={homeFor(user.role)} />;
  const settings = await getSettings();
  const now = new Date();
  const [lapSeq, ...flagged] = await Promise.all([
    prisma.sequence.findUnique({ where: { name: "AST-LAP" } }),
    ...WINDOWS.map((days) =>
      prisma.asset.count({ where: { status: { not: "RETIRED" }, warrantyEnd: { gte: now, lte: new Date(now.getTime() + days * 864e5) } } }),
    ),
  ]);
  return (
    <>
      <PageHeader crumbs={[{ label: "Admin", href: "/dashboard" }, { label: "Settings" }]} title="System settings" />
      <SettingsForm
        settings={settings}
        nextLaptopNumber={(lapSeq?.value ?? 0) + 1}
        flagged={Object.fromEntries(WINDOWS.map((d, i) => [d, flagged[i]]))}
      />
    </>
  );
}
