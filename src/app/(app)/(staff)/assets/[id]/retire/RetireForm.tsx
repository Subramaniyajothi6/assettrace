"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { retireAssetAction } from "@/actions/returns";
import { CONDITION_LABELS, DISPOSAL_LABELS } from "@/lib/labels";
import { isoDayIST } from "@/lib/format";

/** Retirement form with an inline "are you sure" step (prototype `retire`). */
export function RetireForm({ assetId, tag, authorizer, condition }: { assetId: string; tag: string; authorizer: string; condition: string }) {
  const [asking, setAsking] = useState(false);
  const [disposal, setDisposal] = useState("RECYCLED");
  const formRef = useRef<HTMLDivElement>(null);
  const today = isoDayIST();

  return (
    <ActionForm
      action={retireAssetAction.bind(null, assetId)}
      success={(d) => `${d.tag} retired. The record is now read-only.`}
      redirectTo={`/assets/${assetId}`}
      className="card pad main-col rise"
      style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div ref={formRef} className="grid2">
        <Field name="retirementDate" label="Retirement date *">
          <input name="retirementDate" type="date" className="inp" defaultValue={today} max={today} />
        </Field>
        <div className="f">
          <label htmlFor="rt-by">Authorised by</label>
          <input id="rt-by" className="inp" value={authorizer} readOnly />
        </div>
      </div>
      <Field name="reason" label="Reason *">
        <textarea name="reason" className="inp" required placeholder="Why is this asset leaving the company?" />
      </Field>
      <div className="grid2">
        <Field name="finalCondition" label="Final condition *">
          <Select name="finalCondition" options={(["GOOD", "FAIR", "POOR", "DAMAGED"] as const).map((c) => ({ value: c, label: CONDITION_LABELS[c] }))} defaultValue={condition} />
        </Field>
        <Field name="disposalMethod" label="Disposal method *">
          <Select name="disposalMethod" options={Object.entries(DISPOSAL_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="RECYCLED" onChange={setDisposal} />
        </Field>
      </div>
      <Field name="remarks" label="Remarks">
        <textarea name="remarks" className="inp" placeholder="e.g. data wiped, certificate number" />
      </Field>
      {asking ? (
        <div className="card pad-s rise" role="alertdialog" aria-label="Confirm retirement" style={{ border: "2px solid #8E2A12", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <span style={{ flex: "1 1 260px", fontWeight: 600 }}>
            Retire {tag} and mark it {DISPOSAL_LABELS[disposal as keyof typeof DISPOSAL_LABELS].toLowerCase()}? This can&apos;t be undone.
          </span>
          <SubmitButton className="danger" pendingText="Retiring…">
            Yes, retire
          </SubmitButton>
          <button type="button" className="btn" onClick={() => setAsking(false)}>
            Keep asset
          </button>
        </div>
      ) : (
        <div className="gap8" style={{ justifyContent: "flex-end" }}>
          <Link className="btn" href={`/assets/${assetId}`}>
            Cancel
          </Link>
          <button type="button" className="btn danger" onClick={() => setAsking(true)}>
            Retire asset
          </button>
        </div>
      )}
    </ActionForm>
  );
}
