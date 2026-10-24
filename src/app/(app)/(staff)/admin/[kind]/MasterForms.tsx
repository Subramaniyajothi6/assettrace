"use client";

import { Pencil } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { FormDialog } from "@/components/forms/FormDialog";
import { saveMasterAction, toggleMasterAction } from "@/actions/people";
import { ToggleSwitch } from "@/components/forms/ToggleSwitch";
import type { MasterKind } from "@/lib/validation/masterdata";

export type MasterValues = {
  id?: string;
  name?: string;
  code?: string | null;
  address?: string | null;
  description?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  managerIds?: string[];
};

type Manager = { id: string; name: string };

const NOUN: Record<MasterKind, string> = {
  departments: "department",
  locations: "location",
  categories: "category",
  vendors: "vendor",
};

const HINT: Record<MasterKind, string> = {
  departments: "Managers see and manage only their departments' assets.",
  locations: "Codes appear in reports and on QR labels.",
  categories: "The code builds asset IDs. It can't change once assets use it.",
  vendors: "Vendors appear on asset registration and in maintenance records.",
};

function Fields({ kind, v, managers }: { kind: MasterKind; v: MasterValues; managers: Manager[] }) {
  return (
    <>
      <Field name="name" label={kind === "vendors" ? "Vendor name *" : "Name *"}>
        <input id="name" name="name" className="inp" defaultValue={v.name ?? ""} required />
      </Field>
      {kind !== "vendors" ? (
        <Field name="code" label={kind === "categories" ? "Code (3 letters) *" : "Code *"}>
          <input id="code" name="code" className="inp mono" defaultValue={v.code ?? ""} required style={{ textTransform: "uppercase" }} />
        </Field>
      ) : null}
      {kind === "locations" ? (
        <Field name="address" label="Address">
          <input id="address" name="address" className="inp" defaultValue={v.address ?? ""} />
        </Field>
      ) : null}
      {kind === "categories" ? (
        <Field name="description" label="Description">
          <input id="description" name="description" className="inp" defaultValue={v.description ?? ""} />
        </Field>
      ) : null}
      {kind === "vendors" ? (
        <>
          <Field name="contactName" label="Contact person">
            <input id="contactName" name="contactName" className="inp" defaultValue={v.contactName ?? ""} />
          </Field>
          <div className="form-grid">
            <Field name="email" label="Email">
              <input id="email" name="email" type="email" className="inp" defaultValue={v.email ?? ""} />
            </Field>
            <Field name="phone" label="Phone">
              <input id="phone" name="phone" className="inp" defaultValue={v.phone ?? ""} />
            </Field>
          </div>
        </>
      ) : null}
      {kind === "departments" ? (
        <Field name="managerIds" label="Managers" hint="Only users with the Manager role are listed.">
          <div className="gap8" id="managerIds">
            {managers.length ? (
              managers.map((m) => (
                <label key={m.id} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="managerIds[]" value={m.id} defaultChecked={v.managerIds?.includes(m.id)} />
                  {m.name}
                </label>
              ))
            ) : (
              <small className="muted">No managers yet. Give a user the Manager role first.</small>
            )}
          </div>
        </Field>
      ) : null}
    </>
  );
}

export function AddMasterForm({ kind, managers }: { kind: MasterKind; managers: Manager[] }) {
  return (
    <ActionForm
      action={saveMasterAction.bind(null, kind, null)}
      success={(d) => `${d.name} added`}
      resetOnSuccess
      className="card pad side rise"
      style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <h2 className="h2">Add {NOUN[kind]}</h2>
      <Fields kind={kind} v={{}} managers={managers} />
      <small className="muted">{HINT[kind]}</small>
      <SubmitButton>Save {NOUN[kind]}</SubmitButton>
    </ActionForm>
  );
}

export function EditMaster({ kind, v, managers }: { kind: MasterKind; v: MasterValues; managers: Manager[] }) {
  return (
    <FormDialog
      trigger={<Pencil size={14} aria-label={`Edit ${v.name}`} />}
      triggerClassName="sm"
      title={`Edit ${NOUN[kind]}`}
      action={saveMasterAction.bind(null, kind, v.id!)}
      success={(d) => `${d.name} saved`}
    >
      <Fields kind={kind} v={v} managers={managers} />
    </FormDialog>
  );
}

export function MasterToggle({ kind, id, name, active }: { kind: MasterKind; id: string; name: string; active: boolean }) {
  return (
    <ToggleSwitch
      checked={active}
      label={`${name} active`}
      action={(next) => toggleMasterAction(kind, id, next)}
      onText={`${name} reactivated`}
      offText={`${name} deactivated`}
    />
  );
}
