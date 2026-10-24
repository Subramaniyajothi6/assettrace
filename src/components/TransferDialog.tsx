"use client";

import { Field, Select } from "@/components/forms/ActionForm";
import { FormDialog } from "@/components/forms/FormDialog";
import { requestTransferAction } from "@/actions/transfers";

type Opt = { value: string; label: string };

/** "Transfer" button → request form (asset page for managers, My assets for employees). */
export function TransferDialog({ assetId, employees, locations, currentLocationId }: { assetId: string; employees: Opt[]; locations: Opt[]; currentLocationId: string | null }) {
  return (
    <FormDialog
      trigger="Transfer"
      title="Request a transfer"
      description="A manager approves it, then the new holder signs the handover."
      action={requestTransferAction}
      success={(d) => `${d.no} sent for approval`}
      submitLabel="Send for approval"
    >
      <input type="hidden" name="assetId" value={assetId} />
      <Field name="toEmployeeId" label="Transfer to *">
        <Select name="toEmployeeId" options={employees} placeholder="Choose…" />
      </Field>
      <Field name="toLocationId" label="New location" hint="Leave as is to use the new holder's location.">
        <Select name="toLocationId" options={locations} defaultValue={currentLocationId} placeholder="New holder's location" />
      </Field>
      <Field name="reason" label="Reason *">
        <textarea name="reason" className="inp" placeholder="Why is this asset moving?" required />
      </Field>
    </FormDialog>
  );
}
