"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationIcon, ago } from "@/components/NotificationIcon";
import { markAllReadAction, markReadAction, markUnreadAction } from "@/actions/notifications";
import { undoToast } from "@/components/motion/undoToast";

// createdAt arrives as an ISO string (JSON).
type Item = { id: string; type: NotificationType; title: string; message: string; link: string | null; isRead: boolean; createdAt: string };

const POLL_MS = 60_000;

/** Topbar bell: unread dot + count, latest 10 in a dropdown, polled every minute and on navigation. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [, start] = useTransition();

  const refresh = useCallback(async () => {
    try {
      // GET route, not a server action, so polling never queues behind router navigations.
      const res = await fetch("/api/notifications/bell", { cache: "no-store" });
      if (!res.ok) return;
      const d: { unread: number; items: Item[] } = await res.json();
      setUnread(d.unread);
      setItems(d.items);
    } catch {
      /* offline or signed out: keep the last values */
    }
  }, []);

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  // Something new arrived: swing the bell once (never on first load, never looping).
  const iconRef = useRef<HTMLSpanElement>(null);
  const lastUnread = useRef(initialUnread);
  useEffect(() => {
    if (unread > lastUnread.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      iconRef.current?.animate(
        [0, 16, -14, 10, -6, 3, 0].map((deg) => ({ transform: `rotate(${deg}deg)` })),
        { duration: 700, easing: "ease-out" },
      );
    }
    lastUnread.current = unread;
  }, [unread]);
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const openItem = (n: Item) =>
    start(async () => {
      setOpen(false);
      if (!n.isRead) await markReadAction(n.id);
      await refresh();
      router.push(n.link ?? "/notifications");
    });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void refresh();
      }}
    >
      <PopoverTrigger className="iconbtn" aria-label={`Notifications, ${unread} unread`}>
        <span ref={iconRef} className="bell-ic">
          <Bell size={19} strokeWidth={1.8} />
        </span>
        {unread ? <span key={unread} className="dot dot-pop" /> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="bell-pop">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 8px" }}>
          <b style={{ fontSize: 16 }}>
            Notifications{unread ? <span className="badge" style={{ marginLeft: 8 }}>{unread}</span> : null}
          </b>
          {unread ? (
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                start(async () => {
                  const res = await markAllReadAction();
                  await refresh();
                  router.refresh();
                  if (res.ok)
                    undoToast(`${res.data.count} marked as read`, async () => {
                      await markUnreadAction(res.data.ids);
                      await refresh();
                      router.refresh();
                    });
                })
              }
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {items === null ? (
            <div className="skel" style={{ height: 120 }} />
          ) : items.length ? (
            items.map((n) => (
              <button key={n.id} type="button" className="li" onClick={() => openItem(n)} style={{ width: "100%", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
                <NotificationIcon type={n.type} size={17} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 14, fontWeight: n.isRead ? 500 : 700 }}>{n.title}</span>
                  <small className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.message}
                  </small>
                  <small className="muted">{ago(n.createdAt)}</small>
                </span>
                {n.isRead ? null : <span aria-label="Unread" style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--at-alert)", flex: "none" }} />}
              </button>
            ))
          ) : (
            <div className="empty" style={{ padding: 24 }}>
              <Bell size={26} />
              <b>You&apos;re all caught up</b>
            </div>
          )}
        </div>
        <Link href="/notifications" className="btn sm" style={{ width: "100%", marginTop: 8 }} onClick={() => setOpen(false)}>
          See all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
