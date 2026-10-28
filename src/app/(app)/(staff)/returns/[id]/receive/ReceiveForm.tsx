"use client";

import { useState } from "react";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { receiveReturnAction } from "@/actions/returns";
import { CONDITION_LABELS } from "@/lib/labels";
import { isoDayIST } from "@/lib/format";

export function ReceiveForm({ id, accessories, receiver, holderFirstName }: { id: string; accessories: string[]; receiver: string; holderFirstName: string }) {
  const [got, setGot] = useState(accessories);
  const [condition, setCondition] = useState("GOOD");
  const [photos, setPhotos] = useState<string[]>([]);
  const missing = accessories.filter((x) => !got.includes(x));
  const today = isoDayIST();

  return (
    <ActionForm
      action={receiveReturnAction.bind(null, id)}
      success={(d) => `${d.no} received. Inspection required before reassignment.`}
      redirectTo={(d) => (d.next === "inspect" ? `/returns/${d.id}/inspect` : "/returns")}
      className="row"
    >
      {missing.map((m) => (
        <input key={m} type="hidden" name="missingAccessories[]" value={m} />
      ))}
      <section className="card pad main-col rise" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 className="h2">Check-in details</h2>
        <div className="grid2">
          <Field name="receivedAt" label="Return date *">
            <input name="receivedAt" type="date" className="inp" defaultValue={today} max={today} />
          </Field>
          <div className="f">
            <label htmlFor="rv-by">Received by</label>
            <input id="rv-by" className="inp" value={receiver} readOnly />
          </div>
          <Field name="condition" label="Condition on return *">
            <Select name="condition" options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="GOOD" onChange={setCondition} />
          </Field>
        </div>
        <div className="f">
          <span className="lbl">Accessories handed over at assignment</span>
          <small className="muted">Untick anything that didn&apos;t come back</small>
          <div className="gap8">
            {accessories.length ? (
              accessories.map((x) => {
                const on = got.includes(x);
                return (
                  <button key={x} type="button" className="check" role="checkbox" aria-checked={on} onClick={() => setGot((l) => (on ? l.filter((y) => y !== x) : [...l, x]))}>
                    <i>{on ? "✓" : ""}</i>
                    {x}
                  </button>
                );
              })
            ) : (
              <span className="muted">No accessories were given</span>
            )}
          </div>
          {missing.length ? (
            <span className="err" role="status">
              Missing: {missing.join(", ")}. This is noted on the return and in the asset history.
            </span>
          ) : null}
        </div>
        <div className="grid2">
          <Field name="damage" label="Damage noted">
            <textarea name="damage" className="inp" placeholder="Scratches, dents, broken parts" />
          </Field>
          <Field name="remarks" label="Remarks">
            <textarea name="remarks" className="inp" />
          </Field>
        </div>
        <Field name="photos" label="Photos (up to 3)">
          <label style={{ minHeight: 70, border: "2px dashed var(--at-outline)", borderRadius: "var(--at-r2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--at-muted)", cursor: "pointer", padding: 12, textAlign: "center" }}>
            <span>
              <b style={{ color: "var(--at-ink)" }}>{photos.length ? photos.join(", ") : "Add photos of the condition"}</b>
              <br />
              JPG, PNG or WebP · up to 5 MB each
            </span>
            <input
              type="file"
              name="photos"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []).map((f) => f.name))}
            />
          </label>
        </Field>
      </section>
      <aside className="hero-dark pad side rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>
        <small>When you confirm</small>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 12, fontSize: 15, lineHeight: 1.45 }}>
          <li>
            Status becomes <b>Returned</b> and {holderFirstName}&apos;s assignment closes.
          </li>
          <li>
            Condition <b>{CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS]}</b>
            {missing.length ? ` with ${missing.join(", ")} missing` : ""} is saved.
          </li>
          <li>
            The asset is <b style={{ color: "var(--at-hd-warn)" }}>blocked from assignment</b> until it is inspected.
          </li>
        </ol>
        <SubmitButton name="next" value="inspect" pendingText="Saving…">
          Confirm and inspect now
        </SubmitButton>
        <button type="submit" name="next" value="later" className="btn" style={{ background: "transparent", color: "var(--at-hd-ink)", borderColor: "var(--at-hd-sub)" }}>
          Confirm, inspect later
        </button>
      </aside>
    </ActionForm>
  );
}
