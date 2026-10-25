"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requestReturnAction } from "@/actions/requests";

/** Manager-initiated return: pick an assigned asset, the holder is asked to bring it back. */
export function StartReturn({ assets }: { assets: { value: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.value ?? "");
  const [pending, start] = useTransition();
  if (!assets.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="btn pri">Request a return</DialogTrigger>
      <DialogContent className="modal" showCloseButton>
        <DialogTitle style={{ fontSize: 22, fontWeight: 700 }}>Request a return</DialogTitle>
        <DialogDescription className="muted">The holder is notified. The asset stays assigned until you receive it.</DialogDescription>
        <div className="f" style={{ marginTop: 8 }}>
          <label htmlFor="sr-asset">Asset *</label>
          <select id="sr-asset" className="inp" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn pri"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await requestReturnAction(assetId);
                if (!res.ok) return void toast.error(res.error);
                toast.success(`${res.data.no} created. The holder has been notified.`);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Sending…" : "Request return"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
