"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import type { HandoverStatus } from "@prisma/client";
import { remindAction } from "@/actions/assignments";

export function AssignmentRowActions({ id, assetId, status, overdue }: { id: string; assetId: string; status: HandoverStatus; overdue: boolean }) {
  const [pending, start] = useTransition();
  if (status === "PENDING") {
    return (
      <button
        type="button"
        className="btn sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await remindAction(id);
            if (res.ok) toast.success(`Reminder sent to ${res.data.name}`);
            else toast.error(res.error);
          })
        }
      >
        {pending ? "Sending…" : "Remind"}
      </button>
    );
  }
  return (
    <Link className="btn sm" href={`/assets/${assetId}`}>
      {status === "DISPUTED" ? "Review" : overdue ? "Follow up" : "Open"}
    </Link>
  );
}
