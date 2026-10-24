import type { AssetStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/labels";

const ASSET_STATUSES = new Set<string>(Object.keys(STATUS_LABELS));

type Props = {
  /** An AssetStatus, or any other workflow status (PENDING, APPROVED, ...). */
  status: AssetStatus | string;
  /** Override the label text. */
  label?: string;
  className?: string;
};

/** Pill with a 7px dot. Asset statuses get their own colour; others map to a tone. */
export function StatusBadge({ status, label, className }: Props) {
  const isAsset = ASSET_STATUSES.has(status);
  const cls = isAsset ? `s-${status}` : `s-${STATUS_TONES[status] ?? "mute"}`;
  const text = label ?? (isAsset ? STATUS_LABELS[status as AssetStatus] : humanize(status));
  return <span className={cn("pill", cls, className)}>{text}</span>;
}

function humanize(s: string) {
  const t = s.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
