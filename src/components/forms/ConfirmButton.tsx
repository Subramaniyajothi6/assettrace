"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/utils";

type Props = {
  action: () => Promise<ActionResult<unknown>>;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  success: string;
  danger?: boolean;
  className?: string;
  redirectTo?: string;
  children: React.ReactNode;
};

/** Lifecycle action behind a confirm dialog, with a toast (CLAUDE.md rule 7). */
export function ConfirmButton({ action, title, description, confirmLabel, success, danger, className, redirectTo, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(success);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className={cn("btn", className)}>{children}</AlertDialogTrigger>
      <AlertDialogContent className="modal">
        <AlertDialogTitle style={{ fontSize: 20, fontWeight: 700 }}>{title}</AlertDialogTitle>
        <AlertDialogDescription className="muted" style={{ fontSize: 15 }}>
          {description}
        </AlertDialogDescription>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </button>
          <button type="button" className={cn("btn", danger ? "danger" : "pri")} onClick={confirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
