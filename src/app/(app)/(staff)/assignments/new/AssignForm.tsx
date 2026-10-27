"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AssetCondition, AssetStatus } from "@prisma/client";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { Initials } from "@/components/Initials";
import { assignAction } from "@/actions/assignments";
import { CONDITION_LABELS, STATUS_LABELS } from "@/lib/labels";

type PoolAsset = { id: string; tag: string; name: string; status: AssetStatus; condition: AssetCondition; locationId: string | null; code: string };
type Emp = { id: string; name: string; code: string; dept: string; locationId: string | null; holds: number };

const DEFAULT_ACCESSORIES: Record<string, string[]> = {
  LAP: ["Charger", "Laptop bag"],
  MON: ["HDMI cable", "Power cable"],
  MOB: ["Charger", "Case"],
  HEA: ["USB dongle"],
  DES: ["Keyboard", "Mouse"],
  TAB: ["Charger"],
};
const EXTRA = ["Mouse", "Docking station", "Headset"];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function AssignForm({
  pool,
  employees,
  locations,
  initialAssetId,
  initialEmployeeId,
}: {
  pool: PoolAsset[];
  employees: Emp[];
  locations: { value: string; label: string }[];
  initialAssetId?: string;
  initialEmployeeId?: string;
}) {
  const [assetId, setAssetId] = useState(pool.some((a) => a.id === initialAssetId) ? initialAssetId! : pool[0].id);
  const asset = pool.find((a) => a.id === assetId)!;
  const [q, setQ] = useState("");
  const [empId, setEmpId] = useState<string | null>(employees.some((e) => e.id === initialEmployeeId) ? initialEmployeeId! : null);
  const emp = employees.find((e) => e.id === empId) ?? null;
  const [accessories, setAccessories] = useState<string[]>(DEFAULT_ACCESSORIES[asset.code] ?? []);
  const [custom, setCustom] = useState("");
  const allAcc = useMemo(() => [...new Set([...(DEFAULT_ACCESSORIES[asset.code] ?? []), ...EXTRA, ...accessories])], [asset.code, accessories]);
  const people = useMemo(() => {
    const s = q.trim().toLowerCase();
    return employees.filter((e) => !s || `${e.name} ${e.code} ${e.dept}`.toLowerCase().includes(s)).slice(0, 12);
  }, [employees, q]);
  const today = new Date();
  const inAYear = new Date(today.getTime() + 365 * 864e5);
  const conditions = (["NEW", "GOOD", "FAIR", "POOR"] as const).map((c) => ({ value: c, label: CONDITION_LABELS[c] }));

  const toggle = (x: string) => setAccessories((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]));

  return (
    <ActionForm
      action={assignAction}
      success={(d) => ({ title: `Assigned to ${d.name}`, description: `${d.tag} · waiting for their signature on the handover` })}
      redirectTo="/assignments"
      className="row"
    >
      <input type="hidden" name="employeeId" value={empId ?? ""} />
      {accessories.map((a) => (
        <input key={a} type="hidden" name="accessories[]" value={a} />
      ))}
      <div className="main-col stack">
        <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <h2 className="h2">1 · Asset</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Only Available or Reserved assets can be assigned
            </span>
          </div>
          <Field name="assetId" label="Asset">
            <Select
              name="assetId"
              defaultValue={assetId}
              options={pool.map((a) => ({ value: a.id, label: `${a.tag} · ${a.name} · ${STATUS_LABELS[a.status]}` }))}
              onChange={(v) => {
                setAssetId(v);
                setAccessories(DEFAULT_ACCESSORIES[pool.find((a) => a.id === v)!.code] ?? []);
              }}
            />
          </Field>
        </section>

        <section className="card pad rise" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="h2">2 · Employee</h2>
          {/* .search is sized for toolbar rows (flex: 1 1 260px); in this column it would grow 260px tall. */}
          <label className="search" style={{ flex: "none" }}>
            <Search size={17} aria-hidden="true" />
            <span className="sr">Search employees</span>
            <input type="search" placeholder="Name, employee code or department" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Field name="employeeId" label="Assign to *">
            <div role="radiogroup" aria-label="Employee" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
              {people.map((x) => (
                <button key={x.id} type="button" role="radio" className="pick" aria-checked={x.id === empId} onClick={() => setEmpId(x.id)}>
                  <Initials name={x.name} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <b>{x.name}</b>
                    <small className="muted">
                      {x.code} · {x.dept} · holds {x.holds}
                    </small>
                  </span>
                </button>
              ))}
              {!people.length ? <span className="muted">No employees match.</span> : null}
            </div>
          </Field>
        </section>

        <section className="card pad rise" style={{ animationDelay: "120ms", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h2">3 · Handover details</h2>
          <div className="grid2">
            <Field name="locationId" label="Location *">
              <Select key={emp?.id ?? "none"} name="locationId" options={locations} defaultValue={emp?.locationId ?? asset.locationId} placeholder="Choose…" />
            </Field>
            <Field name="assignedAt" label="Assignment date *">
              <input name="assignedAt" type="date" className="inp" defaultValue={isoDay(today)} max={isoDay(today)} />
            </Field>
            <Field name="expectedReturnDate" label="Expected return">
              <input name="expectedReturnDate" type="date" className="inp" defaultValue={isoDay(inAYear)} />
            </Field>
            <Field name="condition" label="Condition at handover *">
              <Select key={asset.id} name="condition" options={conditions} defaultValue={asset.condition === "DAMAGED" ? "POOR" : asset.condition} />
            </Field>
          </div>
          <div className="f">
            <span className="lbl">Accessories given</span>
            <div className="gap8">
              {allAcc.map((x) => (
                <button key={x} type="button" className="chip" aria-pressed={accessories.includes(x)} onClick={() => toggle(x)}>
                  {accessories.includes(x) ? "✓ " : "+ "}
                  {x}
                </button>
              ))}
              <input
                className="inp"
                style={{ width: 180, height: 40, borderRadius: "var(--at-pill)" }}
                placeholder="Add another…"
                aria-label="Add another accessory"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = custom.trim();
                    if (v && !accessories.includes(v)) setAccessories((l) => [...l, v]);
                    setCustom("");
                  }
                }}
              />
            </div>
          </div>
          <Field name="remarks" label="Remarks">
            <textarea name="remarks" className="inp" placeholder="Anything the employee should know" />
          </Field>
        </section>
      </div>

      <aside className="hero-dark pad side rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>
        <small>Summary</small>
        <b style={{ fontSize: 22, lineHeight: 1.25 }}>
          {asset.name} → {emp?.name ?? "—"}
        </b>
        <small>
          {asset.tag}
          {emp ? ` · ${emp.dept}` : ""}
        </small>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.45 }}>
          <li>
            Status changes <b>{STATUS_LABELS[asset.status]} → Assigned</b> and the history records it.
          </li>
          <li>
            {emp ? emp.name.split(" ")[0] : "They"} {emp ? "is" : "are"} asked to <b>confirm and sign</b> the handover.
          </li>
          <li>Overdue returns show up on the Assignments page.</li>
        </ol>
        <SubmitButton pendingText="Assigning…">Assign asset</SubmitButton>
        <Link className="btn" href="/assignments" style={{ background: "transparent", color: "var(--at-hd-ink)", borderColor: "var(--at-hd-sub)" }}>
          Cancel
        </Link>
      </aside>
    </ActionForm>
  );
}
