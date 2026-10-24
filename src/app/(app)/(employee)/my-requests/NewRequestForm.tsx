"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { cancelRequestAction, createRequestAction } from "@/actions/requests";
import { PRIORITY_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";

const TYPES = ["ISSUE", "REPLACEMENT", "RETURN", "NEW_ASSET"] as const;
type T = (typeof TYPES)[number];
const HINT: Record<T, string> = {
  ISSUE: "Something broken or not working on an asset you hold.",
  REPLACEMENT: "Swap a faulty asset for a working one.",
  RETURN: "Hand an asset back, e.g. when changing teams.",
  NEW_ASSET: "Ask for equipment you don't have yet.",
};

export function NewRequestForm({ assets, initialType, initialAssetId, focus }: { assets: { value: string; label: string }[]; initialType?: string; initialAssetId?: string; focus: boolean }) {
  const [type, setType] = useState<T>((TYPES as readonly string[]).includes(initialType ?? "") ? (initialType as T) : "REPLACEMENT");
  const needsAsset = type !== "NEW_ASSET";

  return (
    <ActionForm
      action={createRequestAction}
      success={(d) => `${d.no} sent. You'll be notified of every update.`}
      resetOnSuccess
      className="card pad side rise"
      style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 16 }}
    >
      <h2 className="h2" style={{ fontSize: 20 }}>
        New request
      </h2>
      <input type="hidden" name="type" value={type} />
      <div className="f">
        <span className="lbl">Type *</span>
        <div className="gap8" role="radiogroup" aria-label="Request type">
          {TYPES.map((t) => (
            <button key={t} type="button" className="chip" role="radio" aria-checked={t === type} onClick={() => setType(t)}>
              {REQUEST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <small className="muted">{HINT[type]}</small>
      </div>
      {type === "ISSUE" ? (
        <Link className="btn pri" href="/report-issue" style={{ height: 50 }}>
          Report an issue
        </Link>
      ) : (
        <>
          {needsAsset ? (
            assets.length ? (
              <Field name="assetId" label="Asset *">
                <Select name="assetId" options={assets} defaultValue={initialAssetId} />
              </Field>
            ) : (
              <small className="err">You have no assets for this type of request.</small>
            )
          ) : null}
          <Field name="description" label="Details *">
            <textarea
              name="description"
              className="inp"
              required
              autoFocus={focus}
              placeholder={type === "NEW_ASSET" ? "What do you need and why?" : "Tell your asset manager what's going on"}
            />
          </Field>
          <Field name="priority" label="Priority">
            <Select name="priority" options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="MEDIUM" />
          </Field>
          <SubmitButton className="" pendingText="Sending…">
            Send request
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CancelRequest({ id, no }: { id: string; no: string }) {
  return (
    <ConfirmButton
      action={cancelRequestAction.bind(null, id)}
      title={`Cancel ${no}?`}
      description="Your asset manager will see it as cancelled. You can always send a new one."
      confirmLabel="Cancel request"
      success={`${no} cancelled`}
      danger
      className="sm"
    >
      Cancel request
    </ConfirmButton>
  );
}
