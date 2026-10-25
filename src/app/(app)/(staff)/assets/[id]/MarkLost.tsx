"use client";

import { Field } from "@/components/forms/ActionForm";
import { FormDialog } from "@/components/forms/FormDialog";
import { markLostAction } from "@/actions/returns";

export function MarkLost({ assetId, tag, holder }: { assetId: string; tag: string; holder: string | null }) {
  return (
    <FormDialog
      trigger="Mark lost"
      triggerClassName="ghost-danger"
      title={`Mark ${tag} lost?`}
      description={holder ? `${holder}'s assignment ends and any open return or transfer is cancelled.` : "It stays in history and reports. Mark it found if it turns up."}
      action={markLostAction.bind(null, assetId)}
      success={`${tag} marked lost`}
      submitLabel="Mark lost"
    >
      <Field name="note" label="What happened?">
        <textarea name="note" className="inp" placeholder="e.g. left in a cab after the client visit" />
      </Field>
    </FormDialog>
  );
}
