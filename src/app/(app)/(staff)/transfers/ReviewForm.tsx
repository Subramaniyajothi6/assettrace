"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { cancelTransferAction, reviewTransferAction } from "@/actions/transfers";

export function ReviewForm({ id, fromName, toName, canCancel }: { id: string; fromName: string; toName: string; canCancel: boolean }) {
  return (
    <ActionForm
      action={reviewTransferAction.bind(null, id)}
      success={(d) => (d.status === "APPROVED" ? `Approved. ${toName} has been asked to sign the handover.` : `${d.no} rejected`)}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <Field name="remarks" label="Your remarks">
        <textarea name="remarks" className="inp" placeholder="Shown to both employees" />
      </Field>
      <div className="gap8">
        <SubmitButton name="decision" value="approve" pendingText="Saving…">
          Approve transfer
        </SubmitButton>
        <button type="submit" name="decision" value="reject" className="btn ghost-danger">
          Reject
        </button>
        {canCancel ? <CancelTransfer id={id} /> : null}
      </div>
      <small className="muted">
        Approving closes {fromName.split(" ")[0]}&apos;s assignment, creates a new one for {toName.split(" ")[0]} and asks them to sign the handover.
      </small>
    </ActionForm>
  );
}

export function CancelTransfer({ id }: { id: string }) {
  return (
    <ConfirmButton
      action={cancelTransferAction.bind(null, id)}
      title="Cancel this transfer?"
      description="The request is withdrawn. Nothing about the asset changes."
      confirmLabel="Cancel transfer"
      success="Transfer cancelled"
      danger
      className="sm"
    >
      Withdraw
    </ConfirmButton>
  );
}
