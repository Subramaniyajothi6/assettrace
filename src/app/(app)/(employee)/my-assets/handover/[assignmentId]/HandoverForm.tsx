"use client";

import { useEffect, useRef, useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { confirmHandoverAction, disputeHandoverAction } from "@/actions/assignments";

/** Checklist + signature pad (prototype handover page). Unticked items → report a problem instead. */
export function HandoverForm({ assignmentId, items, signerName, today }: { assignmentId: string; items: string[]; signerName: string; today: string }) {
  const [got, setGot] = useState<string[]>(items);
  const [disputing, setDisputing] = useState(false);
  const pad = useSignaturePad();
  const missing = items.filter((x) => !got.includes(x));

  return (
    <div className="card pad main-col rise" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 18 }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <legend style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, padding: 0 }}>1 · Check what you received</legend>
        <div className="gap8">
          {items.map((x) => {
            const on = got.includes(x);
            return (
              <button
                key={x}
                type="button"
                className="check"
                role="checkbox"
                aria-checked={on}
                onClick={() => setGot((l) => (on ? l.filter((y) => y !== x) : [...l, x]))}
              >
                <i>{on ? "✓" : ""}</i>
                {x}
              </button>
            );
          })}
        </div>
      </fieldset>

      {!disputing ? (
        <ActionForm
          action={confirmHandoverAction.bind(null, assignmentId)}
          success={(d) => `Signed. ${d.name} is now in your assets.`}
          redirectTo="/my-assets"
          beforeSubmit={(fd) => {
            if (missing.length) return "Some items are unticked. Use “Report a problem instead”.";
            const sig = pad.dataUrl();
            if (!sig) return "Please sign before confirming";
            fd.set("signature", sig);
            return null;
          }}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <b style={{ fontSize: 18 }}>2 · Sign here</b>
              <button type="button" className="btn sm" onClick={pad.clear}>
                Clear
              </button>
            </div>
            <canvas
              ref={pad.ref}
              className={pad.signed ? "sigpad ok" : "sigpad"}
              role="img"
              aria-label="Signature pad: draw your signature with a mouse, pen or finger"
            />
            <small className="muted">
              {signerName} · {today}
            </small>
          </div>
          <Field name="agree" label="Confirmation">
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--at-soft)" }}>
              <input type="checkbox" name="agree" defaultChecked style={{ width: 20, height: 20, marginTop: 1 }} />
              I received this asset in the condition shown and will look after it under the company asset policy.
            </label>
          </Field>
          <div className="gap8">
            <SubmitButton pendingText="Signing…">Confirm and sign</SubmitButton>
            <button type="button" className="btn ghost-danger" onClick={() => setDisputing(true)}>
              Report a problem instead
            </button>
          </div>
        </ActionForm>
      ) : (
        <ActionForm
          action={disputeHandoverAction.bind(null, assignmentId)}
          success="Problem reported. Your asset manager will follow up."
          redirectTo="/my-assets"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {missing.map((m) => (
            <input key={m} type="hidden" name="missing[]" value={m} />
          ))}
          <b style={{ fontSize: 18 }}>2 · What&apos;s wrong?</b>
          {missing.length ? <span className="muted">Missing: {missing.join(", ")}</span> : null}
          <Field name="note" label="Describe the problem">
            <textarea name="note" className="inp" placeholder="e.g. the charger is missing, or the screen is cracked" />
          </Field>
          <div className="gap8">
            <SubmitButton pendingText="Sending…">Report problem</SubmitButton>
            <button type="button" className="btn" onClick={() => setDisputing(false)}>
              Back to signing
            </button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}

/** Minimal canvas signature pad (pointer events: mouse, pen, touch). */
function useSignaturePad() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [signed, setSigned] = useState(false);
  const drawn = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const x = c.getContext("2d")!;
    x.scale(dpr, dpr);
    const hint = () => {
      x.clearRect(0, 0, r.width, r.height);
      x.fillStyle = "#A8A29A";
      x.font = "16px sans-serif";
      x.textAlign = "center";
      x.fillText("Draw your signature", r.width / 2, r.height / 2 + 6);
      baseline();
    };
    const baseline = () => {
      x.strokeStyle = "#D9D5CE";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(30, r.height - 36);
      x.lineTo(r.width - 30, r.height - 36);
      x.stroke();
      x.strokeStyle = "#141414";
      x.lineWidth = 2.6;
      x.lineCap = "round";
      x.lineJoin = "round";
    };
    hint();
    let down = false;
    const pos = (ev: PointerEvent) => {
      const b = c.getBoundingClientRect();
      return [ev.clientX - b.left, ev.clientY - b.top] as const;
    };
    const onDown = (ev: PointerEvent) => {
      if (!drawn.current) {
        x.clearRect(0, 0, r.width, r.height);
        baseline();
      }
      down = true;
      c.setPointerCapture(ev.pointerId);
      const [px, py] = pos(ev);
      x.beginPath();
      x.moveTo(px, py);
    };
    const onMove = (ev: PointerEvent) => {
      if (!down) return;
      const [px, py] = pos(ev);
      x.lineTo(px, py);
      x.stroke();
      if (!drawn.current) {
        drawn.current = true;
        setSigned(true);
      }
    };
    const onUp = () => (down = false);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    (c as HTMLCanvasElement & { resetPad?: () => void }).resetPad = () => {
      drawn.current = false;
      setSigned(false);
      hint();
    };
    return () => {
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
    };
  }, []);

  return {
    ref,
    signed,
    clear: () => (ref.current as (HTMLCanvasElement & { resetPad?: () => void }) | null)?.resetPad?.(),
    dataUrl: () => (drawn.current && ref.current ? ref.current.toDataURL("image/png") : null),
  };
}
