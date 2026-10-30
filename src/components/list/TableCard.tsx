import Link from "next/link";
import { Inbox } from "lucide-react";
import { FlipTbody } from "@/components/motion/FlipTbody";

/** Card with a horizontally scrolling table, or an empty state when there are no rows. */
export function TableCard({
  head,
  empty,
  rows,
  footer,
}: {
  head: React.ReactNode;
  empty: { title: string; text?: string; action?: { label: string; href: string } };
  rows: React.ReactNode[];
  footer?: React.ReactNode;
}) {
  return (
    <section className="card rise" style={{ overflow: "hidden", animationDelay: "60ms" }}>
      {rows.length ? (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>{head}</tr>
            </thead>
            <FlipTbody>{rows}</FlipTbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Inbox size={34} aria-hidden="true" />
          <b>{empty.title}</b>
          {empty.text ? <span>{empty.text}</span> : null}
          {empty.action ? (
            <Link className="btn pri" href={empty.action.href}>
              {empty.action.label}
            </Link>
          ) : null}
        </div>
      )}
      {footer}
    </section>
  );
}
