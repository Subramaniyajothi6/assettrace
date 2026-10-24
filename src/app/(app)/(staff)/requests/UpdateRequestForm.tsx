"use client";

import Link from "next/link";
import type { RequestStatus } from "@prisma/client";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { updateRequestAction } from "@/actions/requests";
import { REQUEST_STATUS_LABELS } from "@/lib/labels";

const STATUSES = (["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "COMPLETED"] as const).map((s) => ({ value: s, label: REQUEST_STATUS_LABELS[s] }));

export function UpdateRequestForm({ id, status, remarks, next }: { id: string; status: RequestStatus; remarks: string; next: { label: string; href: string } | null }) {
  return (
    <ActionForm
      key={id}
      action={updateRequestAction.bind(null, id)}
      success={(d) => `${d.no} updated. The employee has been notified.`}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <Field name="managerRemarks" label="Remarks to employee">
        <textarea name="managerRemarks" className="inp" defaultValue={remarks} />
      </Field>
      <Field name="status" label="Status">
        <Select name="status" options={STATUSES} defaultValue={status} />
      </Field>
      <div className="gap8">
        <SubmitButton>Update request</SubmitButton>
        {next ? (
          <Link className="btn" href={next.href}>
            {next.label}
          </Link>
        ) : null}
      </div>
      <small className="muted">The employee is notified every time the status or your remarks change.</small>
    </ActionForm>
  );
}
