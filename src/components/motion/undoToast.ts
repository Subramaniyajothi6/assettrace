"use client";

import { toast } from "sonner";

const UNDO_MS = 5000;

/**
 * Success toast with an "Undo" button and a shrinking timer line (`.has-undo` in globals.css), for small
 * actions that are easy to reverse. Lifecycle actions keep their confirm dialog (CLAUDE.md rule 7).
 */
export function undoToast(message: string, undo: () => Promise<void>) {
  toast.success(message, {
    duration: UNDO_MS,
    className: "has-undo",
    action: {
      label: "Undo",
      onClick: () => {
        void undo().then(() => toast.success("Undone"));
      },
    },
  });
}
