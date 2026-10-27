"use client";

import Link from "next/link";
import type { IssueStatus } from "@prisma/client";
import { Field, Select } from "@/components/forms/ActionForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { FormDialog } from "@/components/forms/FormDialog";
import { closeIssueAction, resolveIssueAction, sendToMaintenanceAction, startReviewAction } from "@/actions/requests";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/labels";

/** The next step(s) for an issue card on the board. */
export function IssueCardActions({
  id,
  no,
  status,
  maintenance,
  assetReturned,
}: {
  id: string;
  no: string;
  status: IssueStatus;
  maintenance: { id: string; maintenanceNo: string } | null;
  assetReturned: boolean;
}) {
  if (status === "REPORTED") {
    return (
      <ConfirmButton
        action={startReviewAction.bind(null, id)}
        title={`Start reviewing ${no}?`}
        description="The employee is told their issue is under review."
        confirmLabel="Start review"
        success={`${no} moved to Under review`}
        className="sm"
      >
        Start review
      </ConfirmButton>
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <div className="gap8" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
        {assetReturned ? (
          <small className="muted">Inspect the returned asset first.</small>
        ) : (
          <FormDialog
            trigger="Send to maintenance"
            triggerClassName="sm pri"
            title={`Send ${no} to maintenance`}
            description="Opens a maintenance record and marks the asset Under maintenance."
            action={sendToMaintenanceAction.bind(null, id)}
            success={(d) => `${no} sent to maintenance as ${d.no}`}
            submitLabel="Send to maintenance"
          >
            <Field name="type" label="Type *">
              <Select name="type" options={Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="REPAIR" />
            </Field>
            <Field name="serviceProvider" label="Service provider">
              <input name="serviceProvider" className="inp" placeholder="e.g. Lenovo Service Centre, Guindy" />
            </Field>
            <Field name="expectedCompletion" label="Expected back">
              <input name="expectedCompletion" type="date" className="inp" />
            </Field>
          </FormDialog>
        )}
        <FormDialog
          trigger="Mark resolved"
          triggerClassName="sm"
          title={`Resolve ${no}`}
          description="Use this when it was fixed without a repair (e.g. a software fix)."
          action={resolveIssueAction.bind(null, id)}
          success={`${no} resolved`}
          submitLabel="Mark resolved"
        >
          <Field name="resolution" label="What fixed it? *">
            <textarea name="resolution" className="inp" required />
          </Field>
        </FormDialog>
      </div>
    );
  }
  if (status === "MAINTENANCE") {
    return maintenance ? (
      <Link className="btn sm" href={`/maintenance?m=${maintenance.id}`} title="Completing the maintenance resolves this issue">
        Complete {maintenance.maintenanceNo}
      </Link>
    ) : null;
  }
  if (status === "RESOLVED") {
    return (
      <ConfirmButton
        action={closeIssueAction.bind(null, id)}
        title={`Close ${no}?`}
        description="Closed issues stay in the asset's history."
        confirmLabel="Close issue"
        success={`${no} closed`}
        className="sm"
      >
        Close issue
      </ConfirmButton>
    );
  }
  return null;
}
