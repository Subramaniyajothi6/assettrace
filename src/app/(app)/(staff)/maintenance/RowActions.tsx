"use client";

import { useState } from "react";
import type { MaintenanceStatus } from "@prisma/client";
import { Field, Select } from "@/components/forms/ActionForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { FormDialog } from "@/components/forms/FormDialog";
import { cancelMaintenanceAction, completeMaintenanceAction, startMaintenanceAction, updateMaintenanceAction } from "@/actions/maintenance";
import { isoDayIST } from "@/lib/format";

/** Current values of an open record, used to pre-fill Edit and Complete. */
export type MaintenanceDraft = {
  provider: string | null;
  cost: number;
  /** YYYY-MM-DD */
  expected: string;
  parts: string | null;
  notes: string | null;
  warranty: boolean;
};

export function MaintenanceRowActions({ id, no, status, held, record }: { id: string; no: string; status: MaintenanceStatus; held: boolean; record: MaintenanceDraft }) {
  const today = isoDayIST();
  const [warranty, setWarranty] = useState(record.warranty);
  return (
    <div className="gap8" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
      {status === "SCHEDULED" ? (
        <ConfirmButton
          action={startMaintenanceAction.bind(null, id)}
          title={`Start ${no}?`}
          description="Marks the work as in progress."
          confirmLabel="Start work"
          success={`${no} in progress`}
          className="sm"
        >
          Start
        </ConfirmButton>
      ) : null}
      <FormDialog
        trigger="Edit"
        triggerClassName="sm"
        title={`Edit ${no}`}
        description="Update the estimate or details while the asset is in the workshop. Changes are recorded in the asset history."
        action={updateMaintenanceAction.bind(null, id)}
        success={(d) => `${d.no} updated`}
        submitLabel="Save changes"
      >
        <div className="form-grid">
          <Field name="cost" label="Cost so far / estimate (₹)">
            <input name="cost" type="number" min={0} step="0.01" className="inp" defaultValue={record.cost} />
          </Field>
          <Field name="expectedCompletion" label="Expected completion">
            <input name="expectedCompletion" type="date" className="inp" defaultValue={record.expected} />
          </Field>
        </div>
        <Field name="serviceProvider" label="Service provider">
          <input name="serviceProvider" className="inp" defaultValue={record.provider ?? ""} />
        </Field>
        <Field name="partsReplaced" label="Parts replaced">
          <input name="partsReplaced" className="inp" defaultValue={record.parts ?? ""} />
        </Field>
        <Field name="technicianNotes" label="Technician notes">
          <input name="technicianNotes" className="inp" defaultValue={record.notes ?? ""} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: "var(--at-r2)", background: "var(--at-chip)" }}>
          <b>Covered by warranty</b>
          <input type="hidden" name="warrantyCovered" value={warranty ? "on" : ""} />
          <button type="button" className="tgl" role="switch" aria-checked={warranty} aria-label="Covered by warranty" onClick={() => setWarranty((w) => !w)} />
        </div>
      </FormDialog>
      <FormDialog
        trigger="Mark complete"
        triggerClassName="sm pri"
        title={`Complete ${no}`}
        description={held ? "The asset goes back to its holder." : "The asset becomes available again (or damaged, if it can't be repaired)."}
        action={completeMaintenanceAction.bind(null, id)}
        success={(d) => `${d.no} completed. ${d.tag} is ${d.status.toLowerCase()} again.`}
        submitLabel="Complete"
      >
        <div className="form-grid">
          <Field name="actualCompletion" label="Completed on *">
            <input name="actualCompletion" type="date" className="inp" defaultValue={today} max={today} />
          </Field>
          <Field name="cost" label="Final cost (₹)">
            <input name="cost" type="number" min={0} step="0.01" className="inp" defaultValue={record.cost} />
          </Field>
        </div>
        <Field name="partsReplaced" label="Parts replaced">
          <input name="partsReplaced" className="inp" defaultValue={record.parts ?? ""} />
        </Field>
        <Field name="technicianNotes" label="Technician notes">
          <input name="technicianNotes" className="inp" defaultValue={record.notes ?? ""} />
        </Field>
        <Field name="outcome" label="Outcome *">
          <Select
            name="outcome"
            options={[
              { value: "FIXED", label: "Fixed" },
              ...(held ? [] : [{ value: "NOT_REPAIRABLE", label: "Not repairable (mark damaged)" }]),
            ]}
            defaultValue="FIXED"
          />
        </Field>
      </FormDialog>
      <ConfirmButton
        action={cancelMaintenanceAction.bind(null, id)}
        title={`Cancel ${no}?`}
        description="The asset goes back to how it was before, and a linked issue goes back to review."
        confirmLabel="Cancel record"
        success={`${no} cancelled`}
        danger
        className="sm ghost-danger"
      >
        Cancel
      </ConfirmButton>
    </div>
  );
}
