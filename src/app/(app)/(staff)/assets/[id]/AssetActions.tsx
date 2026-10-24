import Link from "next/link";
import type { CurrentUser } from "@/server/permissions";
import type { AssetDetail } from "@/server/queries/assets";

type Props = {
  asset: AssetDetail;
  user: CurrentUser;
  openReturn: AssetDetail["returns"][number] | null;
  pendingTransfer: AssetDetail["transfers"][number] | null;
};

/** Lifecycle buttons for the asset page; each shows only when the state machine allows it. */
export function AssetActions({ asset: a, user }: Props) {
  if (a.status === "RETIRED") return null;
  const manages = user.role === "ADMIN" || (!!a.departmentId && user.managedDepartmentIds.includes(a.departmentId));
  if (!manages) return null;
  return (
    <>
      <Link className="btn" href={`/assets/${a.id}/edit`}>
        Edit
      </Link>
    </>
  );
}
