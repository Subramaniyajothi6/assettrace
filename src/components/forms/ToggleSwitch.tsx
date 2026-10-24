"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";

/** Active/inactive switch that calls a server action and toasts the result. */
export function ToggleSwitch({
  checked,
  label,
  action,
  onText,
  offText,
  disabled,
}: {
  checked: boolean;
  label: string;
  action: (next: boolean) => Promise<ActionResult<unknown>>;
  onText: string;
  offText: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="tgl"
      role="switch"
      aria-checked={optimistic}
      aria-label={label}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const next = !optimistic;
          setOptimistic(next);
          const res = await action(next);
          if (!res.ok) toast.error(res.error);
          else toast.success(next ? onText : offText);
          router.refresh();
        })
      }
    />
  );
}
