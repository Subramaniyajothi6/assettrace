"use client";

import { useState } from "react";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { createMaintenanceAction } from "@/actions/maintenance";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/labels";
import { isoDayIST } from "@/lib/format";

type PoolAsset = { id: string; label: string; warranty: string; warrantyActive: boolean; issues: { value: string; label: string }[] };

/** `heading` replaces the plain title (the dialog passes its DialogTitle); `onDone` runs after a successful save. */
export function MaintenanceForm({ pool, initialAssetId, heading, onDone }: { pool: PoolAsset[]; initialAssetId?: string; heading?: React.ReactNode; onDone?: () => void }) {
  const [assetId, setAssetId] = useState(pool.some((a) => a.id === initialAssetId) ? initialAssetId! : (pool[0]?.id ?? ""));
  const asset = pool.find((a) => a.id === assetId);
  const [warranty, setWarranty] = useState(asset?.warrantyActive ?? false);
  const today = isoDayIST();

  if (!pool.length) {
    return (
      <div className="empty">
        <b>Nothing to service</b>
        <span>No available, assigned or damaged assets in your departments.</span>
      </div>
    );
  }

  return (
    <ActionForm
      action={createMaintenanceAction}
      success={(d) => `${d.no} saved. The asset is under maintenance.`}
      resetOnSuccess
      onSuccess={onDone}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {heading ?? <h2 className="h2">Record maintenance</h2>}
      <Field name="assetId" label="Asset *">
        <Select
          name="assetId"
          options={pool.map((a) => ({ value: a.id, label: a.label }))}
          defaultValue={assetId}
          onChange={(v) => {
            setAssetId(v);
            setWarranty(pool.find((a) => a.id === v)?.warrantyActive ?? false);
          }}
        />
      </Field>
      <Field name="issueId" label="Linked issue">
        <Select key={assetId} name="issueId" options={asset?.issues ?? []} placeholder="None" />
      </Field>
      <Field name="type" label="Type *">
        <Select name="type" options={Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="REPAIR" />
      </Field>
      <Field name="problem" label="Problem *">
        <textarea name="problem" className="inp" required placeholder="What needs fixing?" />
      </Field>
      <div className="grid2" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <Field name="serviceProvider" label="Service provider">
          <input name="serviceProvider" className="inp" placeholder="e.g. Dell Service, Guindy" />
        </Field>
        <Field name="serviceDate" label="Service date *">
          <input name="serviceDate" type="date" className="inp" defaultValue={today} />
        </Field>
        <Field name="cost" label="Cost (₹)">
          <input name="cost" type="number" min={0} step="0.01" className="inp" defaultValue={0} />
        </Field>
        <Field name="expectedCompletion" label="Expected completion">
          <input name="expectedCompletion" type="date" className="inp" />
        </Field>
      </div>
      <Field name="partsReplaced" label="Parts replaced">
        <input name="partsReplaced" className="inp" />
      </Field>
      <Field name="technicianNotes" label="Technician notes">
        <input name="technicianNotes" className="inp" />
      </Field>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: "var(--at-r2)", background: "var(--at-chip)" }}>
        <span>
          <b>Covered by warranty</b>
          <br />
          <small className="muted">{asset?.warranty}</small>
        </span>
        <input type="hidden" name="warrantyCovered" value={warranty ? "on" : ""} />
        <button type="button" className="tgl" role="switch" aria-checked={warranty} aria-label="Covered by warranty" onClick={() => setWarranty((w) => !w)} />
      </div>
      <SubmitButton>Save record</SubmitButton>
    </ActionForm>
  );
}
