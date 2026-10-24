"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms/ActionForm";
import { createAssetAction, updateAssetAction } from "@/actions/assets";
import { CONDITION_LABELS } from "@/lib/labels";

type Opt = { id: string; name: string };
type Options = { categories: (Opt & { code: string })[]; locations: Opt[]; departments: Opt[]; vendors: Opt[] };

export type AssetFormValues = {
  id: string;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string;
  purchaseCost: string;
  vendorId: string | null;
  warrantyStart: string;
  warrantyEnd: string;
  locationId: string | null;
  departmentId: string | null;
  condition: string;
  notes: string | null;
  categoryName: string;
};

const CONDITIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }));
const toOpts = (xs: Opt[]) => xs.map((x) => ({ value: x.id, label: x.name }));

/** Register / edit asset (prototype `assetForm`). */
export function AssetForm({ options, asset, prefix, nextNumbers }: { options: Options; asset?: AssetFormValues; prefix: string; nextNumbers: Record<string, number> }) {
  const today = new Date().toISOString().slice(0, 10);
  const [categoryId, setCategoryId] = useState(options.categories.find((c) => c.code === "LAP")?.id ?? options.categories[0]?.id ?? "");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const nextTag = useMemo(() => {
    if (asset) return asset.assetTag;
    const c = options.categories.find((x) => x.id === categoryId);
    return c ? `${prefix}-${c.code}-${String((nextNumbers[`AST-${c.code}`] ?? 0) + 1).padStart(4, "0")}` : "—";
  }, [asset, categoryId, options.categories, nextNumbers, prefix]);

  const action = asset ? updateAssetAction.bind(null, asset.id) : createAssetAction;

  return (
    <ActionForm
      action={action}
      success={(d) => (asset ? `${d.tag} saved` : `${d.tag} registered`)}
      redirectTo={(d) => `/assets/${d.id}`}
      className="row"
    >
      <div className="main-col stack">
        <section className="card pad rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="h2">What is it?</h2>
          {asset ? (
            <div className="f">
              <span className="lbl">Category</span>
              <span className="muted">{asset.categoryName} (can&apos;t change after registration)</span>
            </div>
          ) : (
            <Field name="categoryId" label="Category *">
              <Select name="categoryId" options={toOpts(options.categories)} defaultValue={categoryId} onChange={setCategoryId} />
            </Field>
          )}
          <div className="grid2">
            <Field name="name" label="Asset name *">
              <input name="name" className="inp" defaultValue={asset?.name} required placeholder="Dell Latitude 5440" />
            </Field>
            <Field name="brand" label="Brand">
              <input name="brand" className="inp" defaultValue={asset?.brand ?? ""} />
            </Field>
            <Field name="model" label="Model">
              <input name="model" className="inp" defaultValue={asset?.model ?? ""} />
            </Field>
            <Field name="serialNumber" label="Serial number *">
              <input name="serialNumber" className="inp mono" defaultValue={asset?.serialNumber ?? ""} required />
            </Field>
          </div>
        </section>

        <section className="card pad rise" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="h2">Purchase &amp; warranty</h2>
          <div className="grid2">
            <Field name="purchaseDate" label="Purchase date">
              <input name="purchaseDate" type="date" className="inp" max={today} defaultValue={asset ? asset.purchaseDate : today} />
            </Field>
            <Field name="purchaseCost" label="Purchase cost (₹)">
              <input name="purchaseCost" type="number" min={0} step="0.01" className="inp" defaultValue={asset?.purchaseCost ?? ""} />
            </Field>
            <Field name="vendorId" label="Vendor">
              <Select name="vendorId" options={toOpts(options.vendors)} defaultValue={asset?.vendorId} placeholder="—" />
            </Field>
            <Field name="warrantyStart" label="Warranty start">
              <input name="warrantyStart" type="date" className="inp" defaultValue={asset ? asset.warrantyStart : today} />
            </Field>
            <Field name="warrantyEnd" label="Warranty end">
              <input name="warrantyEnd" type="date" className="inp" defaultValue={asset?.warrantyEnd ?? ""} />
            </Field>
          </div>
        </section>

        <section className="card pad rise" style={{ animationDelay: "120ms", display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="h2">Where it lives</h2>
          <div className="grid2">
            <Field name="locationId" label="Location *">
              <Select name="locationId" options={toOpts(options.locations)} defaultValue={asset?.locationId} placeholder="Choose…" />
            </Field>
            <Field name="departmentId" label="Department *">
              <Select
                name="departmentId"
                options={toOpts(options.departments)}
                defaultValue={asset?.departmentId ?? (options.departments.length === 1 ? options.departments[0].id : undefined)}
                placeholder="Choose…"
              />
            </Field>
            <Field name="condition" label="Condition *">
              <Select name="condition" options={CONDITIONS} defaultValue={asset?.condition ?? "NEW"} />
            </Field>
          </div>
          <div className="grid2">
            <Field name="photo" label="Photo">
              <label
                style={{
                  minHeight: 110,
                  border: "2px dashed var(--at-outline)",
                  borderRadius: "var(--at-r2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  color: "var(--at-muted)",
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 12,
                }}
              >
                <Camera size={26} />
                <b style={{ color: "var(--at-ink)" }}>{photoName ?? (asset ? "Replace the photo" : "Add a photo")}</b>
                JPG, PNG or WebP · up to 5 MB
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            </Field>
            <Field name="notes" label="Notes">
              <textarea name="notes" className="inp" defaultValue={asset?.notes ?? ""} />
            </Field>
          </div>
        </section>
      </div>

      <aside className="hero-dark pad side rise" style={{ animationDelay: "100ms", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>
        <small>Asset ID {asset ? "" : "(auto)"}</small>
        <span className="mono" style={{ fontSize: 28 }}>
          {nextTag}
        </span>
        <span className="muted" style={{ fontSize: 14 }}>
          {asset ? (
            "Changes are recorded in the asset history."
          ) : (
            <>
              A QR label is created when you save. Status on save: <b style={{ color: "#8FD6A8" }}>Available</b>.
            </>
          )}
        </span>
        <SubmitButton className="" pendingText="Saving…">
          {asset ? "Save changes" : "Save asset"}
        </SubmitButton>
        <Link
          className="btn"
          href={asset ? `/assets/${asset.id}` : "/assets"}
          style={{ background: "transparent", color: "var(--at-hd-ink)", borderColor: "var(--at-hd-sub)" }}
        >
          Cancel
        </Link>
      </aside>
    </ActionForm>
  );
}
