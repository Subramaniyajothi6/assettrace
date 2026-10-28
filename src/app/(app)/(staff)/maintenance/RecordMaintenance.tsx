"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MaintenanceForm } from "./MaintenanceForm";

/**
 * "Record maintenance" button + dialog. The form used to sit beside the table, which squeezed the table
 * until it scrolled sideways; in a dialog the table gets the full width. Opens by itself for
 * /maintenance?asset=… (the asset page's "Record maintenance" link).
 */
export function RecordMaintenance({ pool, initialAssetId }: React.ComponentProps<typeof MaintenanceForm>) {
  const [open, setOpen] = useState(!!initialAssetId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="btn pri">
        <Wrench size={17} /> Record maintenance
      </DialogTrigger>
      <DialogContent className="modal" showCloseButton>
        <MaintenanceForm
          pool={pool}
          initialAssetId={initialAssetId}
          heading={<DialogTitle style={{ fontSize: 22, fontWeight: 700 }}>Record maintenance</DialogTitle>}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
