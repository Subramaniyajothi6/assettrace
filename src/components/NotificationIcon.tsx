import type { NotificationType } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { ArrowRightLeft, Bell, Check, PenLine, ShieldAlert, TriangleAlert, Undo2, User, Wrench, type LucideIcon } from "lucide-react";

const T: Record<NotificationType, [string, string, LucideIcon]> = {
  ASSET_ASSIGNED: ["#DDE6F4", "#1F4E95", User],
  HANDOVER_CONFIRMED: ["#DCEFE2", "#1F5C3A", PenLine],
  HANDOVER_DISPUTED: ["#F8DDD2", "#8E2A12", TriangleAlert],
  TRANSFER_REQUESTED: ["#EDE7F6", "#4C2A85", ArrowRightLeft],
  TRANSFER_COMPLETED: ["#EDE7F6", "#4C2A85", ArrowRightLeft],
  RETURN_REQUESTED: ["#FBEBD2", "#7A4505", Undo2],
  MAINTENANCE_COMPLETED: ["#DDE6F4", "#1F4E95", Wrench],
  WARRANTY_EXPIRING: ["#F6D9DC", "#8E1B26", ShieldAlert],
  ISSUE_STATUS_UPDATED: ["#F8DDD2", "#8E2A12", TriangleAlert],
  REQUEST_UPDATED: ["#DCEFE2", "#1F5C3A", Check],
  GENERAL: ["#ECE9E4", "#3B3833", Bell],
};

export function NotificationIcon({ type, size = 19 }: { type: NotificationType; size?: number }) {
  const [bg, fg, Icon] = T[type];
  return (
    <span className="ico" style={{ background: bg, color: fg }} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}

/** "Today, 9:40 AM" / "Yesterday" / "3 days ago" / "24 Oct 2026". */
export function ago(d: Date | string, now = new Date()): string {
  const x = new Date(d);
  const day = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const days = Math.round((day(now) - day(x)) / 864e5);
  const time = x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  if (days <= 0) return `Today, ${time}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(x);
}
