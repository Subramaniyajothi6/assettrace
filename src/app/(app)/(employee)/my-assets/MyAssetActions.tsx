import Link from "next/link";
import { TransferDialog } from "@/components/TransferDialog";

type Opt = { value: string; label: string };

/** Self-service actions on a held asset. */
export function MyAssetActions({
  assetId,
  canMove,
  pendingTransferNo,
  employees,
  locations,
  locationId,
}: {
  assetId: string;
  canMove: boolean;
  pendingTransferNo: string | null;
  employees: Opt[];
  locations: Opt[];
  locationId: string | null;
}) {
  return (
    <>
      <Link className="btn" href={`/report-issue?asset=${assetId}`}>
        Report issue
      </Link>
      {pendingTransferNo ? (
        <span className="pill s-wait" style={{ alignSelf: "center" }}>
          {pendingTransferNo} waiting for approval
        </span>
      ) : canMove ? (
        <TransferDialog assetId={assetId} employees={employees} locations={locations} currentLocationId={locationId} />
      ) : null}
    </>
  );
}
