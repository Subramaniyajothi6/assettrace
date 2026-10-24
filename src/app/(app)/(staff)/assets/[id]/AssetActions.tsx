import Link from "next/link";
import type { CurrentUser } from "@/server/permissions";
import type { AssetDetail } from "@/server/queries/assets";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { reopenHandoverAction } from "@/actions/assignments";

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
  const g = a.assignments.find((x) => x.isActive);
  return (
    <>
      <Link className="btn" href={`/assets/${a.id}/edit`}>
        Edit
      </Link>
      {a.status === "AVAILABLE" || a.status === "RESERVED" ? (
        <Link className="btn pri" href={`/assignments/new?asset=${a.id}`}>
          Assign
        </Link>
      ) : null}
      {g?.handoverStatus === "DISPUTED" ? (
        <ConfirmButton
          action={reopenHandoverAction.bind(null, g.id)}
          title="Ask them to sign again?"
          description={`Use this once the problem is sorted out. ${g.employee.name} will be asked to confirm the handover again.`}
          confirmLabel="Ask to sign again"
          success="Handover reopened"
        >
          Resolve dispute
        </ConfirmButton>
      ) : null}
    </>
  );
}
