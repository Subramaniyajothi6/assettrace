import type { HistoryEvent } from "@prisma/client";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  Lock,
  Pencil,
  PenLine,
  Plus,
  Undo2,
  User,
  Wrench,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { HISTORY_EVENT_LABELS } from "@/lib/labels";

const EV: Partial<Record<HistoryEvent, [string, string, LucideIcon]>> = {
  REGISTERED: ["#ECE9E4", "#3B3833", Plus],
  ASSIGNED: ["#DDE6F4", "#1F4E95", User],
  HANDOVER_CONFIRMED: ["#DCEFE2", "#1F5C3A", PenLine],
  HANDOVER_DISPUTED: ["#F8DDD2", "#8E2A12", TriangleAlert],
  TRANSFERRED: ["#EDE7F6", "#4C2A85", ArrowRightLeft],
  TRANSFER_REQUESTED: ["#EDE7F6", "#4C2A85", ArrowRightLeft],
  TRANSFER_REJECTED: ["#F8DDD2", "#8E2A12", ArrowRightLeft],
  ISSUE_REPORTED: ["#F8DDD2", "#8E2A12", TriangleAlert],
  ISSUE_UPDATED: ["#FBEBD2", "#7A4505", TriangleAlert],
  MAINTENANCE_STARTED: ["#FBEBD2", "#7A4505", Wrench],
  MAINTENANCE_COMPLETED: ["#E3EBF7", "#1F4E95", Wrench],
  RETURN_REQUESTED: ["#FBEBD2", "#7A4505", Undo2],
  RETURNED: ["#ECE9E4", "#3B3833", Undo2],
  INSPECTED: ["#E3EBF7", "#1F4E95", Check],
  RETIRED: ["#ECE9E4", "#3B3833", Lock],
  MARKED_LOST: ["#F6D9DC", "#8E1B26", TriangleAlert],
  STATUS_CHANGED: ["#ECE9E4", "#3B3833", ArrowRight],
  UPDATED: ["#ECE9E4", "#3B3833", Pencil],
};

export type TimelineItem = {
  id: string;
  event: HistoryEvent;
  description: string;
  createdAt: Date;
  actor: { name: string };
  /** Optional context line, e.g. the asset name on an employee's history page. */
  context?: React.ReactNode;
};

/** Vertical history timeline: event, date/time, actor (ARCHITECTURE.md §8). */
export function Timeline({ items, emptyText = "No history yet." }: { items: TimelineItem[]; emptyText?: string }) {
  if (!items.length) return <div className="empty"><b>{emptyText}</b></div>;
  return (
    <ol className="tl" style={{ padding: "22px 26px 6px" }}>
      {items.map((x, i) => {
        const [bg, fg, Icon] = EV[x.event] ?? EV.UPDATED!;
        return (
          <li key={x.id} style={{ animationDelay: `${Math.min(200 + i * 50, 900)}ms` }}>
            <div className="rail2">
              <span style={{ background: bg, color: fg }}>
                <Icon size={15} />
              </span>
              <span />
            </div>
            <div className="body">
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 16 }}>{HISTORY_EVENT_LABELS[x.event]}</b>
                <time className="muted" style={{ fontSize: 13 }} dateTime={x.createdAt.toISOString()}>
                  {formatDateTime(x.createdAt)}
                </time>
              </div>
              {x.context}
              <span style={{ fontSize: 14, color: "var(--at-soft)" }}>{x.description}</span>
              <small className="muted">by {x.actor.name}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
