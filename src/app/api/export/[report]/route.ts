import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { can, getCurrentUser } from "@/server/permissions";
import { EXPORT_MAX_ROWS, reportByKey, type Cell, type Column } from "@/server/queries/reports";
import { formatDate } from "@/lib/format";
import type { SearchParams } from "@/lib/list";

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

  const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), ...rows.map((r) => r.map((v) => v ?? ""))], { cellDates: true });
  columns.forEach((c, ci) => {
    for (let ri = 1; ri <= rows.length; ri++) {
      const cell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })];
      if (!cell || cell.v === "") continue;
      if (c.kind === "date") cell.z = "dd mmm yyyy";
      if (c.kind === "money") cell.z = '"₹"#,##0';
    }
  });
  ws["!cols"] = columns.map((c, ci) => ({
    wch: Math.min(48, Math.max(c.label.length, ...rows.slice(0, 200).map((r) => (r[ci] instanceof Date ? 11 : String(r[ci] ?? "").length))) + 2),
  }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: columns.length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.title.slice(0, 31));
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(v: Cell, col: Column): string | number {
  if (v == null) return "";
  if (v instanceof Date) return formatDate(v);
  if (col.kind === "money" && typeof v === "number") return Math.round(v * 100) / 100;
  return v;
}
