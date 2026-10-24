import { requireUser } from "@/server/permissions";
import { Denied } from "@/components/Denied";
import { homeFor } from "@/components/shell/nav";

/** Layer 2 (page guard): employee self-service pages. */
export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "EMPLOYEE") return <Denied home={homeFor(user.role)} />;
  return children;
}
