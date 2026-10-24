"use client";

import type { MaintenanceStatus } from "@prisma/client";
import { Field, Select } from "@/components/forms/ActionForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { FormDialog } from "@/components/forms/FormDialog";
import { cancelMaintenanceAction, completeMaintenanceAction, startMaintenanceAction } from "@/actions/maintenance";

export function MaintenanceRowActions({ id, no, status, cost, held }: { id: string; no: string; status: MaintenanceStatus; cost: number; held: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
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
            <input name="cost" type="number" min={0} step="0.01" className="inp" defaultValue={cost} />
          </Field>
        </div>
        <Field name="partsReplaced" label="Parts replaced">
          <input name="partsReplaced" className="inp" />
        </Field>
        <Field name="technicianNotes" label="Technician notes">
          <input name="technicianNotes" className="inp" />
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
