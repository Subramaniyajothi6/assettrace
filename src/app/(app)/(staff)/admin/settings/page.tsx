import { requireUser } from "@/server/permissions";
import { ComingSoon } from "@/components/ComingSoon";
import { Denied } from "@/components/Denied";
import { homeFor } from "@/components/shell/nav";

export const metadata = { title: "Settings" };

export default async function Page() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Denied home={homeFor(user.role)} />;
  return <ComingSoon title="Settings" phase={12} />;
}
