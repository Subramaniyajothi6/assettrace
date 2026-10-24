import { requireUser } from "@/server/permissions";
import { Denied } from "@/components/Denied";
import { homeFor } from "@/components/shell/nav";

/** Layer 2 (page guard): Admin-only pages. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Denied home={homeFor(user.role)} />;
  return children;
}
