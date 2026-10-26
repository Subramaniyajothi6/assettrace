"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { updateSettingsAction } from "@/actions/account";
import type { AppSettings } from "@/server/settings";

export function SettingsForm({ settings, nextLaptopNumber, flagged }: { settings: AppSettings; nextLaptopNumber: number; flagged: Record<number, number> }) {
  const [prefix, setPrefix] = useState(settings.assetTagPrefix);
  const [days, setDays] = useState(settings.warrantyAlertDays);
  const windows = Object.keys(flagged).map(Number);
  const preview = `${(prefix || "AST").toUpperCase()}-LAP-${String(nextLaptopNumber).padStart(4, "0")}`;

  return (
    <ActionForm action={updateSettingsAction} success="Settings saved" className="row">
      <input type="hidden" name="warrantyAlertDays" value={days} />
      <div className="main-col stack">
        <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h2">Organisation</h2>
          <div className="grid2">
            <Field name="orgName" label="Organisation name *">
              <input name="orgName" className="inp" defaultValue={settings.orgName} required />
            </Field>
            <div className="f">
              <label htmlFor="st-tz">Time zone</label>
              <input id="st-tz" className="inp" value="Asia/Kolkata (IST)" readOnly style={{ background: "var(--at-chip)", cursor: "default" }} />
              <small className="muted">Fixed: all dates are shown in IST.</small>
            </div>
            <div className="f">
              <label htmlFor="st-cur">Currency</label>
              <input id="st-cur" className="inp" value="Indian rupee (₹)" readOnly style={{ background: "var(--at-chip)", cursor: "default" }} />
              <small className="muted">Fixed: all amounts are in ₹.</small>
            </div>
          </div>
        </section>

        <section className="card pad rise" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="h2">Asset IDs &amp; alerts</h2>
          <div className="grid2" style={{ alignItems: "end" }}>
            <Field name="assetTagPrefix" label="Asset ID prefix *" hint="Applies to assets registered from now on.">
              <input
                name="assetTagPrefix"
                className="inp mono"
                maxLength={5}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
                style={{ textTransform: "uppercase" }}
              />
            </Field>
            <div className="card pad-s" style={{ background: "var(--at-chip)", boxShadow: "none" }}>
              <small className="muted">Next laptop will be</small>
              <br />
              <b className="mono" style={{ fontSize: 18 }}>
                {preview}
              </b>
            </div>
          </div>
          <Field name="warrantyAlertDays" label="Warn about warranty expiry">
            <div className="gap8" role="radiogroup" aria-label="Warranty alert window">
              {windows.map((d) => (
                <button key={d} type="button" className="chip" role="radio" aria-checked={days === d} onClick={() => setDays(d)}>
                  {d} days
                </button>
              ))}
            </div>
          </Field>
          <small className="muted">
            {flagged[days] ?? 0} asset{flagged[days] === 1 ? "" : "s"} would be flagged today with this setting.
          </small>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SubmitButton className="">Save settings</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
