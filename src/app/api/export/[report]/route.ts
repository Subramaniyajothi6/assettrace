import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/server/db";
import { can, getCurrentUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { buildReportWorkbook } from "@/server/exports/xlsx";
import { EXPORT_MAX_ROWS, reportByKey, type Cell, type Column, type ReportDef } from "@/server/queries/reports";
import { formatDate, formatDateTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/list";

/**
 * CSV / Excel export for a report (PLAN Phase 11). Same permission and scope as the
 * Reports page: managers get their departments only, admins everything, employees nothing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ report: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(user, "report:view")) return new NextResponse("Forbidden", { status: 403 });
  const def = reportByKey((await params).report);
  if (!def) return new NextResponse("Unknown report", { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const sp: SearchParams = Object.fromEntries(url.searchParams.entries());
  const { columns, rows } = await def.run(user, sp, { skip: 0, take: EXPORT_MAX_ROWS });
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${def.key}-${stamp}`;

  if (format === "csv") {
    const csv = Papa.unparse({ fields: columns.map((c) => c.label), data: rows.map((r) => r.map((v, i) => csvCell(v, columns[i]))) });
    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const { orgName } = await getSettings();
  const buf = await buildReportWorkbook(
    {
      orgName,
      title: def.title,
      description: def.description,
      generatedAt: formatDateTime(new Date()),
      generatedBy: user.name,
      filters: await describeFilters(def, sp),
    },
    columns,
    rows,
  );
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Human-readable list of the filters applied, for the Excel title block. */
async function describeFilters(def: ReportDef, sp: SearchParams): Promise<string[]> {
  const out: string[] = [];
  const q = param(sp, "q");
  const status = param(sp, "status");
  const [department, location, category] = await Promise.all([
    param(sp, "department") ? prisma.department.findUnique({ where: { id: param(sp, "department") }, select: { name: true } }) : null,
    param(sp, "location") ? prisma.location.findUnique({ where: { id: param(sp, "location") }, select: { name: true } }) : null,
    param(sp, "category") ? prisma.assetCategory.findUnique({ where: { id: param(sp, "category") }, select: { name: true } }) : null,
  ]);
  if (q) out.push(`Search "${q}"`);
  if (status) out.push(`Status: ${def.statuses?.[status] ?? status}`);
  if (category) out.push(`Category: ${category.name}`);
  if (department) out.push(`Department: ${department.name}`);
  if (location) out.push(`Location: ${location.name}`);
  const from = param(sp, "from");
  const to = param(sp, "to");
  if (from || to) out.push(`${def.dateLabel ?? "Date"}: ${from ? formatDate(from) : "…"} – ${to ? formatDate(to) : "…"}`);
  if (def.filters.includes("days") && param(sp, "days")) out.push(`Next ${param(sp, "days")} days`);
  return out;
}

function csvCell(v: Cell, col: Column): string | number {
  if (v == null) return "";
  if (v instanceof Date) return formatDate(v);
  if (col.kind === "money" && typeof v === "number") return Math.round(v * 100) / 100;
  return v;
}
