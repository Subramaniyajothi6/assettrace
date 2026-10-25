"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { updateSettingsAction } from "@/actions/account";
import { SKINS } from "@/lib/skins";
import type { AppSettings } from "@/server/settings";

export function SettingsForm({ settings, nextLaptopNumber, flagged }: { settings: AppSettings; nextLaptopNumber: number; flagged: Record<number, number> }) {
  const [prefix, setPrefix] = useState(settings.assetTagPrefix);
  const [days, setDays] = useState(settings.warrantyAlertDays);
  const [skin, setSkin] = useState<string>(settings.uiSkin);
  const windows = Object.keys(flagged).map(Number);
  const preview = `${(prefix || "AST").toUpperCase()}-LAP-${String(nextLaptopNumber).padStart(4, "0")}`;

  return (
    <ActionForm
      action={updateSettingsAction}
      success="Settings saved"
      onSuccess={() => {
        // The skin is applied by the root layout; reload so every page picks it up.
        if (skin !== settings.uiSkin) window.location.reload();
      }}
      className="row"
    >
      <input type="hidden" name="warrantyAlertDays" value={days} />
      <input type="hidden" name="uiSkin" value={skin} />
      <div className="main-col stack">
        <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h2">Organisation</h2>
          <div className="grid2">
            <Field name="orgName" label="Organisation name *">
              <input name="orgName" className="inp" defaultValue={settings.orgName} required />
            </Field>
            <div className="f">
              <label htmlFor="st-tz">Time zone</label>
              <select id="st-tz" className="inp" disabled>
                <option>Asia/Kolkata (IST)</option>
              </select>
            </div>
            <div className="f">
              <label htmlFor="st-cur">Currency</label>
              <select id="st-cur" className="inp" disabled>
                <option>Indian rupee (₹)</option>
              </select>
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
      </div>

      <section className="card pad side rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="h2">Look &amp; feel</h2>
        <small className="muted">Applies to everyone. Warm pill, Corporate and Nordic calm also have a dark mode.</small>
        <div role="radiogroup" aria-label="Visual style" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SKINS.map((k) => (
            <button key={k.id} type="button" role="radio" className="pick" aria-checked={skin === k.id} onClick={() => setSkin(k.id)}>
              <span style={{ display: "flex", gap: 3 }} aria-hidden="true">
                {k.swatch.map((c) => (
                  <i key={c} style={{ width: 16, height: 32, borderRadius: 5, background: c, border: "1px solid #0001", display: "block" }} />
                ))}
              </span>
              <b>{k.name}</b>
            </button>
          ))}
        </div>
        <SubmitButton className="">Save settings</SubmitButton>
      </section>
    </ActionForm>
  );
}
