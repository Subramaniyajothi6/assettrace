import "server-only";
import type { AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { managedAssetScope, type CurrentUser } from "../permissions";
import { getSettings } from "../settings";
import { ilike, param, type SearchParams } from "@/lib/list";
import {
  CONDITION_LABELS,
  DISPOSAL_LABELS,
  HANDOVER_LABELS,
  INSPECTION_RESULT_LABELS,
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  RETURN_STATUS_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
} from "@/lib/labels";

/** A cell keeps its real type so CSV/XLSX/preview can each format it properly. */
export type Cell = string | number | Date | null;
/** `long` = free text (reasons, remarks): wide and wrapping; other text stays on one line. */
export type ColKind = "text" | "long" | "date" | "money" | "number";
export type Column = { label: string; kind?: ColKind };
export type FilterKey = "q" | "from" | "to" | "status" | "category" | "department" | "location" | "days";

export type ReportResult = { columns: Column[]; rows: Cell[][]; total: number };
type Range = { skip: number; take: number };

export type ReportDef = {
  key: string;
  title: string;
  description: string;
  /** Which filters the toolbar shows for this report. */
  filters: FilterKey[];
  /** Status options for this report's status filter. */
  statuses?: Record<string, string>;
  /** What the from/to dates filter on. */
  dateLabel?: string;
  run: (user: CurrentUser, sp: SearchParams, range: Range) => Promise<ReportResult>;
};

const DAY = 864e5;

/** Inclusive date range filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD. */
function dateRange(sp: SearchParams): Prisma.DateTimeFilter | undefined {
  const from = param(sp, "from");
  const to = param(sp, "to");
  if (!from && !to) return undefined;
  const f: Prisma.DateTimeFilter = {};
  if (from && !Number.isNaN(Date.parse(from))) f.gte = new Date(`${from}T00:00:00`);
  if (to && !Number.isNaN(Date.parse(to))) f.lte = new Date(`${to}T23:59:59.999`);
  return f;
}

/** Common asset filters (department, location, category) as an asset where clause. */
function assetWhere(user: CurrentUser, sp: SearchParams): Prisma.AssetWhereInput {
  return {
    AND: [
      managedAssetScope(user),
      param(sp, "department") ? { departmentId: param(sp, "department") } : {},
      param(sp, "location") ? { locationId: param(sp, "location") } : {},
      param(sp, "category") ? { categoryId: param(sp, "category") } : {},
    ],
  };
}

const label = <T extends string>(map: Record<T, string>, v: T | null | undefined) => (v ? map[v] : null);

export const REPORTS: ReportDef[] = [
  {
    key: "inventory",
    title: "Asset inventory",
    description: "Every asset with status, holder and cost",
    filters: ["q", "status", "category", "department", "location", "from", "to"],
    statuses: STATUS_LABELS,
    dateLabel: "Purchase date",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssetWhereInput = {
        AND: [
          assetWhere(user, sp),
          param(sp, "status") ? { status: param(sp, "status") as AssetStatus } : {},
          dateRange(sp) ? { purchaseDate: dateRange(sp) } : {},
          q ? { OR: [{ assetTag: ilike(q) }, { name: ilike(q) }, { serialNumber: ilike(q) }, { brand: ilike(q) }, { currentHolder: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          orderBy: { assetTag: "asc" },
          ...range,
          include: { category: true, currentHolder: true, department: true, location: true, vendor: true },
        }),
        prisma.asset.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Asset ID" },
          { label: "Name" },
          { label: "Category" },
          { label: "Brand" },
          { label: "Model" },
          { label: "Serial no." },
          { label: "Status" },
          { label: "Condition" },
          { label: "Holder" },
          { label: "Department" },
          { label: "Location" },
          { label: "Vendor" },
          { label: "Purchase date", kind: "date" },
          { label: "Cost (₹)", kind: "money" },
          { label: "Warranty end", kind: "date" },
        ],
        rows: list.map((a) => [
          a.assetTag,
          a.name,
          a.category.name,
          a.brand,
          a.model,
          a.serialNumber,
          STATUS_LABELS[a.status],
          CONDITION_LABELS[a.condition],
          a.currentHolder?.name ?? null,
          a.department?.name ?? null,
          a.location?.name ?? null,
          a.vendor?.name ?? null,
          a.purchaseDate,
          a.purchaseCost ? Number(a.purchaseCost) : null,
          a.warrantyEnd,
        ]),
      };
    },
  },
  {
    key: "employees",
    title: "Employee asset list",
    description: "Who holds what right now",
    filters: ["q", "department", "location", "category"],
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssignmentWhereInput = {
        AND: [
          { isActive: true },
          { asset: assetWhere(user, sp) },
          q ? { OR: [{ employee: { name: ilike(q) } }, { employee: { employeeCode: ilike(q) } }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          orderBy: [{ employee: { name: "asc" } }, { assignedAt: "asc" }],
          ...range,
          include: { employee: { include: { department: true } }, asset: { include: { category: true } }, location: true },
        }),
        prisma.assignment.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Employee" },
          { label: "Code" },
          { label: "Department" },
          { label: "Asset" },
          { label: "Asset ID" },
          { label: "Category" },
          { label: "Location" },
          { label: "Since", kind: "date" },
          { label: "Expected return", kind: "date" },
          { label: "Handover" },
          { label: "Accessories", kind: "long" },
        ],
        rows: list.map((g) => [
          g.employee.name,
          g.employee.employeeCode,
          g.employee.department.name,
          g.asset.name,
          g.asset.assetTag,
          g.asset.category.name,
          g.location?.name ?? null,
          g.assignedAt,
          g.expectedReturnDate,
          HANDOVER_LABELS[g.handoverStatus],
          g.accessories.join(", ") || null,
        ]),
      };
    },
  },
  {
    key: "maintenance",
    title: "Maintenance records",
    description: "Repairs, costs and providers",
    filters: ["q", "status", "department", "location", "category", "from", "to"],
    statuses: MAINTENANCE_STATUS_LABELS,
    dateLabel: "Service date",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.MaintenanceRecordWhereInput = {
        AND: [
          { asset: assetWhere(user, sp) },
          param(sp, "status") ? { status: param(sp, "status") as Prisma.EnumMaintenanceStatusFilter["equals"] } : {},
          dateRange(sp) ? { serviceDate: dateRange(sp) } : {},
          q ? { OR: [{ maintenanceNo: ilike(q) }, { problem: ilike(q) }, { serviceProvider: ilike(q) }, { asset: { assetTag: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.maintenanceRecord.findMany({ where, orderBy: { serviceDate: "desc" }, ...range, include: { asset: true, issue: true } }),
        prisma.maintenanceRecord.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Record ID" },
          { label: "Asset ID" },
          { label: "Asset" },
          { label: "Type" },
          { label: "Problem", kind: "long" },
          { label: "Provider" },
          { label: "Service date", kind: "date" },
          { label: "Completed", kind: "date" },
          { label: "Cost (₹)", kind: "money" },
          { label: "Warranty" },
          { label: "Linked issue ID" },
          { label: "Status" },
        ],
        rows: list.map((m) => [
          m.maintenanceNo,
          m.asset.assetTag,
          m.asset.name,
          MAINTENANCE_TYPE_LABELS[m.type],
          m.problem,
          m.serviceProvider,
          m.serviceDate,
          m.actualCompletion,
          Number(m.cost),
          m.warrantyCovered ? "Yes" : "No",
          m.issue?.issueNo ?? null,
          MAINTENANCE_STATUS_LABELS[m.status],
        ]),
      };
    },
  },
  {
    key: "transfers",
    title: "Transfer records",
    description: "Moves between people and places",
    filters: ["q", "status", "department", "location", "category", "from", "to"],
    statuses: TRANSFER_STATUS_LABELS,
    dateLabel: "Requested",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssetTransferWhereInput = {
        AND: [
          { asset: assetWhere(user, sp) },
          param(sp, "status") ? { status: param(sp, "status") as Prisma.EnumTransferStatusFilter["equals"] } : {},
          dateRange(sp) ? { requestedAt: dateRange(sp) } : {},
          q ? { OR: [{ transferNo: ilike(q) }, { asset: { assetTag: ilike(q) } }, { fromEmployee: { name: ilike(q) } }, { toEmployee: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.assetTransfer.findMany({
          where,
          orderBy: { requestedAt: "desc" },
          ...range,
          include: { asset: true, fromEmployee: true, toEmployee: true, fromDepartment: true, toDepartment: true, fromLocation: true, toLocation: true, requestedBy: true, reviewedBy: true },
        }),
        prisma.assetTransfer.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Transfer ID" },
          { label: "Asset ID" },
          { label: "Asset" },
          { label: "From" },
          { label: "To" },
          { label: "From department" },
          { label: "To department" },
          { label: "To location" },
          { label: "Reason", kind: "long" },
          { label: "Status" },
          { label: "Requested", kind: "date" },
          { label: "Requested by" },
          { label: "Reviewed by" },
          { label: "Remarks", kind: "long" },
        ],
        rows: list.map((t) => [
          t.transferNo,
          t.asset.assetTag,
          t.asset.name,
          t.fromEmployee?.name ?? null,
          t.toEmployee.name,
          t.fromDepartment?.name ?? null,
          t.toDepartment?.name ?? null,
          t.toLocation?.name ?? null,
          t.reason,
          TRANSFER_STATUS_LABELS[t.status],
          t.requestedAt,
          t.requestedBy.name,
          t.reviewedBy?.name ?? null,
          t.reviewRemarks,
        ]),
      };
    },
  },
  {
    key: "returns",
    title: "Return records",
    description: "Returned assets and their inspections",
    filters: ["q", "status", "department", "location", "category", "from", "to"],
    statuses: RETURN_STATUS_LABELS,
    dateLabel: "Requested",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssetReturnWhereInput = {
        AND: [
          { asset: assetWhere(user, sp) },
          param(sp, "status") ? { status: param(sp, "status") as Prisma.EnumReturnStatusFilter["equals"] } : {},
          dateRange(sp) ? { requestedAt: dateRange(sp) } : {},
          q ? { OR: [{ returnNo: ilike(q) }, { asset: { assetTag: ilike(q) } }, { returnedBy: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.assetReturn.findMany({ where, orderBy: { requestedAt: "desc" }, ...range, include: { asset: true, returnedBy: true, receivedBy: true, inspection: true } }),
        prisma.assetReturn.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Return ID" },
          { label: "Asset ID" },
          { label: "Asset" },
          { label: "Returned by" },
          { label: "Requested", kind: "date" },
          { label: "Received", kind: "date" },
          { label: "Received by" },
          { label: "Condition" },
          { label: "Missing accessories", kind: "long" },
          { label: "Damage", kind: "long" },
          { label: "Inspection result" },
          { label: "Status" },
        ],
        rows: list.map((r) => [
          r.returnNo,
          r.asset.assetTag,
          r.asset.name,
          r.returnedBy.name,
          r.requestedAt,
          r.receivedAt,
          r.receivedBy?.name ?? null,
          label(CONDITION_LABELS, r.condition),
          r.missingAccessories.join(", ") || null,
          r.damage,
          r.inspection ? INSPECTION_RESULT_LABELS[r.inspection.result].split(" — ")[0] : null,
          RETURN_STATUS_LABELS[r.status],
        ]),
      };
    },
  },
  {
    key: "retired",
    title: "Retired assets",
    description: "Disposal records",
    filters: ["q", "department", "location", "category", "from", "to"],
    dateLabel: "Retired on",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssetRetirementWhereInput = {
        AND: [
          { asset: assetWhere(user, sp) },
          dateRange(sp) ? { retirementDate: dateRange(sp) } : {},
          q ? { OR: [{ reason: ilike(q) }, { asset: { assetTag: ilike(q) } }, { asset: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.assetRetirement.findMany({ where, orderBy: { retirementDate: "desc" }, ...range, include: { asset: { include: { category: true } }, authorizedBy: true } }),
        prisma.assetRetirement.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Asset ID" },
          { label: "Name" },
          { label: "Category" },
          { label: "Retired on", kind: "date" },
          { label: "Reason", kind: "long" },
          { label: "Final condition" },
          { label: "Disposal" },
          { label: "Authorised by" },
          { label: "Purchase cost (₹)", kind: "money" },
          { label: "Remarks", kind: "long" },
        ],
        rows: list.map((r) => [
          r.asset.assetTag,
          r.asset.name,
          r.asset.category.name,
          r.retirementDate,
          r.reason,
          CONDITION_LABELS[r.finalCondition],
          DISPOSAL_LABELS[r.disposalMethod],
          r.authorizedBy.name,
          r.asset.purchaseCost ? Number(r.asset.purchaseCost) : null,
          r.remarks,
        ]),
      };
    },
  },
  {
    key: "warranty",
    title: "Warranty expiring",
    description: "Warranties ending soon",
    filters: ["q", "days", "department", "location", "category"],
    async run(user, sp, range) {
      const { warrantyAlertDays } = await getSettings();
      const days = Math.min(365, Math.max(1, Number(param(sp, "days")) || warrantyAlertDays));
      const now = new Date();
      const q = param(sp, "q");
      const where: Prisma.AssetWhereInput = {
        AND: [
          assetWhere(user, sp),
          { status: { not: "RETIRED" } },
          { warrantyEnd: { gte: now, lte: new Date(now.getTime() + days * DAY) } },
          q ? { OR: [{ assetTag: ilike(q) }, { name: ilike(q) }, { currentHolder: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.asset.findMany({ where, orderBy: { warrantyEnd: "asc" }, ...range, include: { category: true, currentHolder: true, location: true, vendor: true } }),
        prisma.asset.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Asset ID" },
          { label: "Name" },
          { label: "Category" },
          { label: "Holder" },
          { label: "Location" },
          { label: "Warranty end", kind: "date" },
          { label: "Days left", kind: "number" },
          { label: "Vendor" },
        ],
        rows: list.map((a) => [
          a.assetTag,
          a.name,
          a.category.name,
          a.currentHolder?.name ?? null,
          a.location?.name ?? null,
          a.warrantyEnd,
          a.warrantyEnd ? Math.max(0, Math.ceil((a.warrantyEnd.getTime() - now.getTime()) / DAY)) : null,
          a.vendor?.name ?? null,
        ]),
      };
    },
  },
  {
    key: "issues",
    title: "Issue records",
    description: "Reported problems by status",
    filters: ["q", "status", "department", "location", "category", "from", "to"],
    statuses: ISSUE_STATUS_LABELS,
    dateLabel: "Reported",
    async run(user, sp, range) {
      const q = param(sp, "q");
      const where: Prisma.AssetIssueWhereInput = {
        AND: [
          { asset: assetWhere(user, sp) },
          param(sp, "status") ? { status: param(sp, "status") as Prisma.EnumIssueStatusFilter["equals"] } : {},
          dateRange(sp) ? { reportedAt: dateRange(sp) } : {},
          q ? { OR: [{ issueNo: ilike(q) }, { title: ilike(q) }, { asset: { assetTag: ilike(q) } }, { reportedBy: { name: ilike(q) } }] } : {},
        ],
      };
      const [list, total] = await Promise.all([
        prisma.assetIssue.findMany({ where, orderBy: { reportedAt: "desc" }, ...range, include: { asset: true, reportedBy: true, handledBy: true } }),
        prisma.assetIssue.count({ where }),
      ]);
      return {
        total,
        columns: [
          { label: "Issue ID" },
          { label: "Asset ID" },
          { label: "Asset" },
          { label: "Title", kind: "long" },
          { label: "Reported by" },
          { label: "Category" },
          { label: "Severity" },
          { label: "Status" },
          { label: "Reported", kind: "date" },
          { label: "Resolved", kind: "date" },
          { label: "Handled by" },
          { label: "Resolution", kind: "long" },
        ],
        rows: list.map((i) => [
          i.issueNo,
          i.asset.assetTag,
          i.asset.name,
          i.title,
          i.reportedBy.name,
          ISSUE_CATEGORY_LABELS[i.category],
          SEVERITY_LABELS[i.severity],
          ISSUE_STATUS_LABELS[i.status],
          i.reportedAt,
          i.resolvedAt,
          i.handledBy?.name ?? null,
          i.resolution,
        ]),
      };
    },
  },
];

export const reportByKey = (key: string | undefined) => REPORTS.find((r) => r.key === key);

/** Hard cap for one export file. */
export const EXPORT_MAX_ROWS = 10_000;
