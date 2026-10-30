"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Notification } from "@prisma/client";
import { NotificationIcon, ago } from "@/components/NotificationIcon";
import { markAllReadAction, markReadAction, markUnreadAction } from "@/actions/notifications";
import { undoToast } from "@/components/motion/undoToast";

export function NotificationRow({ n }: { n: Notification }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="li"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!n.isRead) await markReadAction(n.id);
          if (n.link) router.push(n.link);
          else router.refresh();
        })
      }
      style={{ width: "100%", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
    >
      <NotificationIcon type={n.type} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 16, fontWeight: n.isRead ? 500 : 700 }}>{n.title}</span>
        <small className="muted">{n.message}</small>
      </span>
      <small className="muted" style={{ whiteSpace: "nowrap" }}>
        {ago(n.createdAt)}
      </small>
      {n.isRead ? null : <span aria-label="Unread" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--at-alert)", flex: "none" }} />}
    </button>
  );
}

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await markAllReadAction();
          if (!res.ok) toast.error(res.error);
          else
            undoToast(`${res.data.count} notification${res.data.count === 1 ? "" : "s"} marked as read`, async () => {
              await markUnreadAction(res.data.ids);
              router.refresh();
            });
          router.refresh();
        })
      }
    >
      Mark all as read
    </button>
  );
}
