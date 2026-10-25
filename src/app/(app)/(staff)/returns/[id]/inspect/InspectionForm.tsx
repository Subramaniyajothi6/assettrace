"use client";

import { useState } from "react";
import type { AssetCondition, InspectionResult } from "@prisma/client";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { inspectReturnAction } from "@/actions/returns";
import { CONDITION_LABELS } from "@/lib/labels";

const RESULTS: [InspectionResult, string, string][] = [
  ["GOOD", "Good", "Available"],
  ["MINOR_REPAIR_REQUIRED", "Minor repair", "Under maintenance"],
  ["MAJOR_REPAIR_REQUIRED", "Major repair", "Under maintenance"],
  ["DAMAGED", "Damaged", "Damaged"],
  ["RETIRE", "Retire", "Retired (opens form)"],
];

type Group = { name: string; label: string; options: string[] };

/** Chip group backed by a hidden input. */
function Chips({ g, value, onChange }: { g: Group; value: string; onChange: (v: string) => void }) {
  return (
    <div className="f">
      <span className="lbl" id={`lbl-${g.name}`}>
        {g.label}
      </span>
      <input type="hidden" name={g.name} value={value} />
      <div className="gap8" role="radiogroup" aria-labelledby={`lbl-${g.name}`}>
        {g.options.map((o) => (
          <button key={o} type="button" className="chip" role="radio" aria-checked={value === o} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InspectionForm({
  id,
  isLaptop,
  defaults,
  present,
}: {
  id: string;
  isLaptop: boolean;
  defaults: { condition: AssetCondition; charger: boolean; damage: string; missing: string };
  present: string[];
}) {
  const [condition, setCondition] = useState<string>(defaults.condition);
  const [screen, setScreen] = useState("Good");
  const [keyboard, setKeyboard] = useState("Good");
  const [battery, setBattery] = useState("Good");
  const [functional, setFunctional] = useState("Working");
  const [charger, setCharger] = useState(defaults.charger ? "Yes" : "No");
  const [result, setResult] = useState<InspectionResult>("GOOD");
  const target = RESULTS.find((r) => r[0] === result)!;

  return (
    <ActionForm
      action={inspectReturnAction.bind(null, id)}
      success={(d) => (d.status ? `${d.tag} is now ${d.status.toLowerCase()}` : "Inspection saved. Complete the retirement form.")}
      redirectTo={(d) => `/assets/${d.assetId}`}
      className="card pad main-col rise"
      style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 20 }}
    >
      {present.map((p) => (
        <input key={p} type="hidden" name="accessoriesPresent[]" value={p} />
      ))}
      <input type="hidden" name="physicalCondition" value={condition} />
      <input type="hidden" name="isFunctional" value={functional === "Not working" ? "" : "on"} />
      <input type="hidden" name="chargerAvailable" value={charger === "Yes" ? "on" : ""} />
      <input type="hidden" name="result" value={result} />
      <div className="f">
        <span className="lbl" id="lbl-phys">
          Physical condition
        </span>
        <div className="gap8" role="radiogroup" aria-labelledby="lbl-phys">
          {(["GOOD", "FAIR", "POOR", "DAMAGED"] as const).map((c) => (
            <button key={c} type="button" className="chip" role="radio" aria-checked={condition === c} onClick={() => setCondition(c)}>
              {CONDITION_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      {isLaptop ? (
        <>
          <Chips g={{ name: "screenCondition", label: "Screen", options: ["Good", "Scratches", "Dead pixels", "Cracked"] }} value={screen} onChange={setScreen} />
          <Chips g={{ name: "keyboardCondition", label: "Keyboard", options: ["Good", "Some keys faulty", "Not working"] }} value={keyboard} onChange={setKeyboard} />
          <Chips g={{ name: "batteryCondition", label: "Battery", options: ["Good", "Fair", "Poor", "Won't hold charge"] }} value={battery} onChange={setBattery} />
        </>
      ) : null}
      <Chips g={{ name: "functional", label: "Functional status", options: ["Working", "Partly working", "Not working"] }} value={functional} onChange={setFunctional} />
      <Chips g={{ name: "charger", label: "Charger present", options: ["Yes", "No"] }} value={charger} onChange={setCharger} />
      <div className="grid2">
        <Field name="visibleDamage" label="Visible damage">
          <textarea name="visibleDamage" className="inp" defaultValue={defaults.damage} />
        </Field>
        <Field name="missingComponents" label="Missing components">
          <textarea name="missingComponents" className="inp" defaultValue={defaults.missing} />
        </Field>
      </div>
      <Field name="result" label="Result *">
        <div role="radiogroup" aria-label="Inspection result" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          {RESULTS.map(([k, label, becomes]) => (
            <button key={k} type="button" role="radio" className="pick" aria-checked={result === k} onClick={() => setResult(k)} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <b>{label}</b>
              <small className="muted">
                Asset becomes <b style={{ color: "var(--at-ink)" }}>{becomes}</b>
              </small>
            </button>
          ))}
        </div>
      </Field>
      <Field name="remarks" label="Inspection remarks">
        <textarea name="remarks" className="inp" placeholder="Notes for the next holder or technician" />
      </Field>
      <div className="gap8" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--at-line)", paddingTop: 16 }}>
        <SubmitButton pendingText="Saving…">Complete · set {target[2].split(" (")[0]}</SubmitButton>
      </div>
    </ActionForm>
  );
}
