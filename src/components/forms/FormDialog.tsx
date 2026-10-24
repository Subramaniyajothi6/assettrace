"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActionForm, SubmitButton, type AnyResult, type DataOf } from "./ActionForm";

type Props<R extends AnyResult> = {
  trigger: React.ReactNode;
  triggerClassName?: string;
  title: string;
  description?: string;
  action: (fd: FormData) => Promise<R>;
  success: string | ((data: DataOf<R>) => string);
  submitLabel?: string;
  wide?: boolean;
  children: React.ReactNode;
};

/** Button that opens a modal form; closes and refreshes on success. */
export function FormDialog<R extends AnyResult>({ trigger, triggerClassName, title, description, action, success, submitLabel = "Save", wide, children }: Props<R>) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn("btn", triggerClassName)}>{trigger}</DialogTrigger>
      <DialogContent className={cn("modal", wide && "wide")} showCloseButton>
        <DialogTitle style={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        {description ? <DialogDescription className="muted">{description}</DialogDescription> : null}
        <ActionForm action={action} success={success} onSuccess={() => setOpen(false)} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          {children}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
