import Link from "next/link";
import type { CurrentUser } from "@/server/permissions";
import type { AssetDetail } from "@/server/queries/assets";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { reopenHandoverAction } from "@/actions/assignments";
import { requestReturnAction } from "@/actions/requests";
import { TransferDialog } from "@/components/TransferDialog";
import { employeeOptions, locationOptions } from "@/server/queries/people";

type Props = {
  asset: AssetDetail;
  user: CurrentUser;
  openReturn: AssetDetail["returns"][number] | null;
  pendingTransfer: AssetDetail["transfers"][number] | null;
};

/** Lifecycle buttons for the asset page; each shows only when the state machine allows it. */
export async function AssetActions({ asset: a, user, pendingTransfer, openReturn }: Props) {
  if (a.status === "RETIRED") return null;
  const manages = user.role === "ADMIN" || (!!a.departmentId && user.managedDepartmentIds.includes(a.departmentId));
  if (!manages) return null;
  const g = a.assignments.find((x) => x.isActive);
  const canTransfer = a.status === "ASSIGNED" && !pendingTransfer && g?.handoverStatus === "CONFIRMED";
  const [employees, locations] = canTransfer ? await Promise.all([employeeOptions(a.currentHolderId), locationOptions()]) : [[], []];
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
      {canTransfer ? <TransferDialog assetId={a.id} employees={employees} locations={locations} currentLocationId={a.locationId} /> : null}
      {pendingTransfer ? (
        <Link className="btn" href={`/transfers?t=${pendingTransfer.id}`}>
          Review transfer
        </Link>
      ) : null}
      {g && !openReturn && (a.status === "ASSIGNED" || a.status === "UNDER_MAINTENANCE") ? (
        <ConfirmButton
          action={requestReturnAction.bind(null, a.id)}
          title="Request this asset back?"
          description={`${g.employee.name} is asked to return it. The asset stays assigned until you receive it.`}
          confirmLabel="Request return"
          success="Return requested"
        >
          Request return
        </ConfirmButton>
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
