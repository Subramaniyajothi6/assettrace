import type {
  AssetCondition,
  AssetStatus,
  DisposalMethod,
  HandoverStatus,
  HistoryEvent,
  InspectionResult,
  IssueCategory,
  IssueStatus,
  MaintenanceStatus,
  MaintenanceType,
  NotificationType,
  Priority,
  RequestStatus,
  RequestType,
  ReturnStatus,
  Role,
  Severity,
  TransferStatus,
} from "@prisma/client";

/** One place for every enum label shown in the UI (copy matches docs/prototype). */

export const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  UNDER_MAINTENANCE: "Under maintenance",
  RESERVED: "Reserved",
  LOST: "Lost",
  DAMAGED: "Damaged",
  RETURNED: "Returned",
  RETIRED: "Retired",
};

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  DAMAGED: "Damaged",
};

export const HANDOVER_LABELS: Record<HandoverStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Signed",
  DISPUTED: "Disputed",
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  PHYSICAL_DAMAGE: "Physical damage",
  PERFORMANCE: "Performance",
  BATTERY: "Battery",
  NETWORK: "Network",
  OTHER: "Other",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  MAINTENANCE: "Maintenance",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  REPAIR: "Repair",
  PREVENTIVE: "Preventive",
  UPGRADE: "Upgrade",
  WARRANTY_CLAIM: "Warranty claim",
  OTHER: "Other",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  RECEIVED: "Awaiting inspection",
  INSPECTED: "Inspected",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  GOOD: "Good — back to available",
  MINOR_REPAIR_REQUIRED: "Minor repair required",
  MAJOR_REPAIR_REQUIRED: "Major repair required",
  DAMAGED: "Damaged",
  RETIRE: "Retire",
};

export const DISPOSAL_LABELS: Record<DisposalMethod, string> = {
  RECYCLED: "Recycled",
  SOLD: "Sold",
  DONATED: "Donated",
  DESTROYED: "Destroyed",
  RETURNED_TO_VENDOR: "Returned to vendor",
  OTHER: "Other",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  ISSUE: "Issue",
  REPLACEMENT: "Replacement",
  RETURN: "Return",
  NEW_ASSET: "New asset",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export const HISTORY_EVENT_LABELS: Record<HistoryEvent, string> = {
  REGISTERED: "Registered",
  UPDATED: "Details updated",
  STATUS_CHANGED: "Status changed",
  ASSIGNED: "Assigned",
  HANDOVER_CONFIRMED: "Handover signed",
  HANDOVER_DISPUTED: "Handover disputed",
  TRANSFER_REQUESTED: "Transfer requested",
  TRANSFER_REJECTED: "Transfer rejected",
  TRANSFERRED: "Transferred",
  ISSUE_REPORTED: "Issue reported",
  ISSUE_UPDATED: "Issue updated",
  MAINTENANCE_STARTED: "Maintenance started",
  MAINTENANCE_COMPLETED: "Maintenance completed",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  INSPECTED: "Inspected",
  MARKED_LOST: "Marked lost",
  RETIRED: "Retired",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ASSET_ASSIGNED: "Asset assigned",
  HANDOVER_CONFIRMED: "Handover signed",
  HANDOVER_DISPUTED: "Handover disputed",
  TRANSFER_REQUESTED: "Transfer requested",
  TRANSFER_COMPLETED: "Transfer completed",
  RETURN_REQUESTED: "Return requested",
  MAINTENANCE_COMPLETED: "Maintenance completed",
  WARRANTY_EXPIRING: "Warranty expiring",
  ISSUE_STATUS_UPDATED: "Issue updated",
  REQUEST_UPDATED: "Request updated",
  GENERAL: "Notice",
};

/**
 * Pill tones for non-asset statuses (asset statuses have their own colours).
 * Mirrors the prototype's TONE map.
 */
export type Tone = "ok" | "info" | "vio" | "wait" | "mute" | "bad";

export const STATUS_TONES: Record<string, Tone> = {
  PENDING: "wait",
  CONFIRMED: "ok",
  DISPUTED: "bad",
  REQUESTED: "wait",
  APPROVED: "info",
  REJECTED: "bad",
  COMPLETED: "ok",
  CANCELLED: "mute",
  IN_PROGRESS: "info",
  SCHEDULED: "wait",
  REPORTED: "wait",
  UNDER_REVIEW: "vio",
  MAINTENANCE: "info",
  RESOLVED: "ok",
  CLOSED: "mute",
  RECEIVED: "info",
  INSPECTED: "mute",
};

/** Solid status colours for charts and the location grid squares. */
export const STATUS_COLORS: Record<AssetStatus, string> = {
  ASSIGNED: "#3A6BB8",
  AVAILABLE: "#3E8E5E",
  RESERVED: "#7C5CC4",
  UNDER_MAINTENANCE: "#D08A1E",
  RETURNED: "#8C8579",
  DAMAGED: "#C9472B",
  LOST: "#B4232F",
  RETIRED: "#B0AAA0",
};
