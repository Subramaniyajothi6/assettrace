"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import type { Role } from "@prisma/client";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { FormDialog } from "@/components/forms/FormDialog";
import { ToggleSwitch } from "@/components/forms/ToggleSwitch";
import { createUserAction, resetPasswordAction, setRoleAction, toggleUserAction } from "@/actions/people";
import { ROLE_LABELS } from "@/lib/labels";

const ROLES = (["EMPLOYEE", "MANAGER", "ADMIN"] as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export function RoleSelect({ id, name, role, self }: { id: string; name: string; role: Role; self: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <label className="sr" htmlFor={`r-${id}`}>
        Role for {name}
      </label>
      <select
        id={`r-${id}`}
        className="inp"
        style={{ height: 36, width: "auto", borderRadius: "var(--at-pill)", fontWeight: 700 }}
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Role;
          if (self && next !== "ADMIN") {
            toast.error("You can't remove your own admin role.");
            e.target.value = role;
            return;
          }
          start(async () => {
            const res = await setRoleAction(id, next);
            if (res.ok) toast.success(`${name} is now ${ROLE_LABELS[next]}`);
            else {
              toast.error(res.error);
              e.target.value = role;
            }
            router.refresh();
          });
        }}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </>
  );
}

export function UserToggle({ id, name, active, self }: { id: string; name: string; active: boolean; self: boolean }) {
  return (
    <ToggleSwitch
      checked={active}
      label={`${name} active`}
      disabled={self}
      action={(next) => toggleUserAction(id, next)}
      onText={`${name} can sign in again`}
      offText={`${name} can no longer sign in`}
    />
  );
}

export function ResetPassword({ id, name, suggested }: { id: string; name: string; suggested: string }) {
  return (
    <FormDialog
      trigger={<KeyRound size={14} aria-label={`Reset password for ${name}`} />}
      triggerClassName="sm"
      title={`Reset password for ${name}`}
      description="They'll be asked to change it on their next sign-in."
      action={resetPasswordAction.bind(null, id)}
      success={`Password reset for ${name}`}
      submitLabel="Reset password"
    >
      <Field name="password" label="Temporary password *" hint="At least 8 characters with a number and a symbol.">
        <input id="password" name="password" className="inp mono" defaultValue={suggested} required autoComplete="off" />
      </Field>
    </FormDialog>
  );
}

export function CreateUserForm({ employees, suggested }: { employees: { value: string; label: string }[]; suggested: string }) {
  return (
    <ActionForm
      action={createUserAction}
      success={(d) => `Login created for ${d.name}`}
      resetOnSuccess
      className="card pad side rise"
      style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <h2 className="h2">Create user</h2>
      {employees.length ? (
        <>
          <Field name="employeeId" label="Link to employee *">
            <Select name="employeeId" options={employees} />
          </Field>
          <Field name="role" label="Role *">
            <Select name="role" options={ROLES} defaultValue="EMPLOYEE" />
          </Field>
          <Field name="password" label="Temporary password *" hint="They must change it on first sign-in.">
            <input id="password" name="password" className="inp mono" defaultValue={suggested} required autoComplete="off" />
          </Field>
          <SubmitButton>Create user</SubmitButton>
        </>
      ) : (
        <>
          <span className="muted">Every employee already has a login. Add an employee first.</span>
          <a className="btn" href="/employees">
            Go to employees
          </a>
        </>
      )}
    </ActionForm>
  );
}
