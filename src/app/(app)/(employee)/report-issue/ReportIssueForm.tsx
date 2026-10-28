"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { reportIssueAction } from "@/actions/requests";
import { ISSUE_CATEGORY_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import { PHOTO_HINT, photoError } from "@/lib/photos";

const SEV = {
  LOW: ["#DCEFE2", "#1F5C3A", "minor annoyance"],
  MEDIUM: ["#FBEBD2", "#7A4505", "slows me down"],
  HIGH: ["#F8DDD2", "#8E2A12", "hard to work"],
  CRITICAL: ["#F6D9DC", "#8E1B26", "can't work"],
} as const;

export function ReportIssueForm({ assets, initialAssetId }: { assets: { id: string; name: string; assetTag: string }[]; initialAssetId?: string }) {
  const [assetId, setAssetId] = useState(assets.some((a) => a.id === initialAssetId) ? initialAssetId! : assets[0].id);
  const [severity, setSeverity] = useState<keyof typeof SEV>("MEDIUM");
  const [photo, setPhoto] = useState<string | null>(null);

  return (
    <ActionForm action={reportIssueAction} success={(d) => `${d.no} reported. You'll be notified of every update.`} redirectTo="/my-requests" className="row">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="severity" value={severity} />
      <section className="card pad main-col rise" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Field name="assetId" label="Which asset? *">
          <div role="radiogroup" aria-label="Asset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {assets.map((a) => (
              <button key={a.id} type="button" role="radio" className="pick" aria-checked={a.id === assetId} onClick={() => setAssetId(a.id)} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <b>{a.name}</b>
                <span className="tag">{a.assetTag}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field name="category" label="What kind of problem? *">
          <Select name="category" options={Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} defaultValue="HARDWARE" />
        </Field>
        <Field name="title" label="Short title *">
          <input name="title" className="inp" required placeholder="e.g. Battery drains within an hour" />
        </Field>
        <Field name="description" label="What's happening? *">
          <textarea name="description" className="inp" required placeholder="When did it start? What have you tried?" />
        </Field>
        <Field name="severity" label="How bad is it? *">
          <div role="radiogroup" aria-label="Severity" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            {(Object.keys(SEV) as (keyof typeof SEV)[]).map((k) => {
              const on = k === severity;
              const [bg, fg, hint] = SEV[k];
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSeverity(k)}
                  style={{
                    minHeight: 64,
                    borderRadius: "var(--at-r2)",
                    border: `2px solid ${on ? fg : "var(--at-line)"}`,
                    background: on ? bg : "var(--at-card)",
                    color: on ? fg : "var(--at-ink)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <b>{SEVERITY_LABELS[k]}</b>
                  <small>{hint}</small>
                </button>
              );
            })}
          </div>
        </Field>
        <Field name="photo" label="Photo (optional)">
          <label style={{ minHeight: 90, border: "2px dashed var(--at-outline)", borderRadius: "var(--at-r2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--at-muted)", cursor: "pointer" }}>
            <Camera size={22} />
            <span>
              <b style={{ color: "var(--at-ink)" }}>{photo ? `Attached: ${photo}` : "Add a photo"}</b>
              <br />
              {PHOTO_HINT}
            </span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr"
              onChange={(e) => {
                const err = photoError(e.target.files);
                if (err) {
                  toast.error(err);
                  e.target.value = "";
                }
                setPhoto(e.target.files?.[0]?.name ?? null);
              }}
            />
          </label>
        </Field>
        <SubmitButton pendingText="Sending…">Report issue</SubmitButton>
      </section>
      <aside className="hero-blue pad side rise" style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 14 }}>
        <b style={{ fontSize: 18 }}>What happens next</b>
        <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
          <li>Your asset manager sees it straight away.</li>
          <li>You&apos;ll see each step: Reported → Under review → Maintenance → Resolved.</li>
          <li>If it needs repair, you&apos;ll be told when it&apos;s back.</li>
        </ol>
        <small className="muted">Critical issues are flagged red for your manager.</small>
      </aside>
    </ActionForm>
  );
}
