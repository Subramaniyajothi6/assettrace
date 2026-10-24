import { redirect } from "next/navigation";
import { requireUser } from "@/server/permissions";
import { homeFor } from "@/components/shell/nav";

export default async function Root() {
  const user = await requireUser();
  redirect(homeFor(user.role));
}
