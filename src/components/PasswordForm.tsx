"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { changePasswordAction } from "@/actions/account";

const COLORS = ["#D2643E", "#D08A1E", "#3E8E5E", "#2E7D4F"];

/** Change-password form with a strength meter (prototype profile page). */
export function PasswordForm({ title = "Change password", onDone }: { title?: string; onDone?: "reload" }) {
  const [pw, setPw] = useState("");
  const score = (pw.length >= 8 ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0) + (pw.length >= 12 ? 1 : 0);
  const color = COLORS[Math.max(0, score - 1)];
  return (
    <ActionForm
      action={changePasswordAction}
      success="Password updated"
      resetOnSuccess
      onSuccess={() => {
        setPw("");
        if (onDone === "reload") window.location.reload();
      }}
      className="card pad rise"
      style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <h2 className="h2">{title}</h2>
      <div className="grid2">
        <Field name="current" label="Current password">
          <input name="current" type="password" className="inp" autoComplete="current-password" required />
        </Field>
        <Field name="next" label="New password">
          <input name="next" type="password" className="inp" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field name="repeat" label="Repeat new password">
          <input name="repeat" type="password" className="inp" autoComplete="new-password" required />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < score ? color : "var(--at-line)", transition: "background .2s" }} />
        ))}
      </div>
      <small className="muted">At least 8 characters with a number and a symbol.</small>
      <SubmitButton className="" pendingText="Updating…">
        Update password
      </SubmitButton>
    </ActionForm>
  );
}
