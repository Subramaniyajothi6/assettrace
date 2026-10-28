"use client";

import { Pencil, Plus } from "lucide-react";
import { Field, Select } from "@/components/forms/ActionForm";
import { FormDialog } from "@/components/forms/FormDialog";
import { ToggleSwitch } from "@/components/forms/ToggleSwitch";
import { saveEmployeeAction, toggleEmployeeAction } from "@/actions/people";

type Opt = { value: string; label: string };
export type EmployeeValues = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  departmentId: string;
  locationId: string | null;
};

function Fields({ v, departments, locations }: { v?: EmployeeValues; departments: Opt[]; locations: Opt[] }) {
  return (
    <>
      <Field name="name" label="Full name *">
        <input id="name" name="name" className="inp" defaultValue={v?.name} required autoComplete="off" />
      </Field>
      <Field name="email" label="Work email *">
        <input id="email" name="email" type="email" className="inp" defaultValue={v?.email} required autoComplete="off" />
      </Field>
      <div className="form-grid">
        <Field name="departmentId" label="Department *">
          <Select name="departmentId" options={departments} defaultValue={v?.departmentId} placeholder="Choose…" />
        </Field>
        <Field name="locationId" label="Location">
          <Select name="locationId" options={locations} defaultValue={v?.locationId} placeholder="—" />
        </Field>
      </div>
      <div className="form-grid">
        <Field name="designation" label="Designation">
          <input id="designation" name="designation" className="inp" defaultValue={v?.designation ?? ""} />
        </Field>
        <Field name="phone" label="Phone">
          <input id="phone" name="phone" className="inp" defaultValue={v?.phone ?? ""} />
        </Field>
      </div>
    </>
  );
}

/**
 * "Add employee" header button + dialog. The form used to sit beside the table and squeezed it until
 * names and codes wrapped over several lines; in a dialog the table gets the full width.
 */
export function AddEmployeeForm({ departments, locations, nextCode, tempPassword }: { departments: Opt[]; locations: Opt[]; nextCode: string; tempPassword: string }) {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={17} /> Add employee
        </>
      }
      triggerClassName="pri"
      title="Add employee"
      action={saveEmployeeAction.bind(null, null)}
      success={(d) => `${d.name} added as ${d.code}`}
      submitLabel="Add employee"
    >
      <Fields departments={departments} locations={locations} />
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
        <input type="checkbox" name="createLogin" defaultChecked style={{ width: 20, height: 20 }} />
        Create a login with the Employee role
      </label>
      <small className="muted">
        Employee code {nextCode} is assigned automatically. New logins get the temporary password{" "}
        <span className="mono">{tempPassword}</span> and must change it on first sign-in.
      </small>
    </FormDialog>
  );
}

export function EditEmployee({ v, departments, locations }: { v: EmployeeValues; departments: Opt[]; locations: Opt[] }) {
  return (
    <FormDialog
      trigger={<Pencil size={14} aria-label={`Edit ${v.name}`} />}
      triggerClassName="sm"
      title="Edit employee"
      action={saveEmployeeAction.bind(null, v.id)}
      success={(d) => `${d.name} saved`}
    >
      <Fields v={v} departments={departments} locations={locations} />
    </FormDialog>
  );
}

export function EmployeeToggle({ id, name, active }: { id: string; name: string; active: boolean }) {
  return (
    <ToggleSwitch
      checked={active}
      label={`${name} active`}
      action={(next) => toggleEmployeeAction(id, next)}
      onText={`${name} reactivated`}
      offText={`${name} deactivated`}
    />
  );
}
