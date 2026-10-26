import "server-only";
import ExcelJS from "exceljs";
import type { Cell, Column } from "../queries/reports";

/** Pill colours from the app's status badges (skins.css `.s-*`), as ARGB. */
const TONES = {
  ok: { fill: "FFDCEFE2", font: "FF1F5C3A" },
  info: { fill: "FFDDE6F4", font: "FF1F4E95" },
  vio: { fill: "FFEDE7F6", font: "FF4C2A85" },
  wait: { fill: "FFFBEBD2", font: "FF7A4505" },
  mute: { fill: "FFECE9E4", font: "FF3B3833" },
  bad: { fill: "FFF8DDD2", font: "FF8E2A12" },
} as const;
type Tone = keyof typeof TONES;

/** Report cells hold display labels, so tones are keyed by label text. */
const LABEL_TONES: Record<string, Tone> = {
  // asset status
  Available: "ok",
  Assigned: "info",
  "Under maintenance": "wait",
  Reserved: "vio",
  Lost: "bad",
  Damaged: "bad",
  Returned: "mute",
  Retired: "mute",
  // condition
  New: "ok",
  Good: "ok",
  Fair: "wait",
  Poor: "bad",
  // severity
  Low: "mute",
  Medium: "wait",
  High: "bad",
  Critical: "bad",
  // workflow statuses
  Pending: "wait",
  Signed: "ok",
  Disputed: "bad",
  Requested: "wait",
  Approved: "info",
  Rejected: "bad",
  Completed: "ok",
  Cancelled: "mute",
  Scheduled: "wait",
  "In progress": "info",
  Reported: "wait",
  "Under review": "vio",
  Maintenance: "info",
  Resolved: "ok",
  Closed: "mute",
  "Awaiting inspection": "info",
  Inspected: "mute",
  // inspection result (reports drop the " — back to available" suffix)
  "Minor repair required": "wait",
  "Major repair required": "bad",
  Retire: "mute",
};

/** Columns rendered as coloured pills. */
const PILL_COLUMNS = new Set(["Status", "Condition", "Final condition", "Severity", "Handover", "Inspection result"]);

const INK = "FF151515";
const MUTED = "FF6F6A62";
const ZEBRA = "FFFAF8F4";
const RULE = "FFE6E1D8";
const IST_OFFSET_MS = 330 * 60_000;

type Meta = {
  orgName: string;
  title: string;
  description: string;
  generatedAt: string;
  generatedBy: string;
  filters: string[];
};

/**
 * Styled Excel workbook for a report: title block, dark header row, zebra rows,
 * coloured status pills, ₹ and date formats, totals row, frozen header and autofilter.
 */
export async function buildReportWorkbook(meta: Meta, columns: Column[], rows: Cell[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.orgName;
  wb.created = new Date();
  const ws = wb.addWorksheet(meta.title.slice(0, 31), {
    properties: { tabColor: { argb: INK } },
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const n = columns.length;
  const lastCol = ws.getColumn(n).letter;

  // Title block (rows 1–4)
  ws.mergeCells(`A1:${lastCol}1`);
  ws.mergeCells(`A2:${lastCol}2`);
  ws.mergeCells(`A3:${lastCol}3`);
  ws.mergeCells(`A4:${lastCol}4`);
  const org = ws.getCell("A1");
  org.value = meta.orgName.toUpperCase();
  org.font = { name: "Calibri", size: 9, bold: true, color: { argb: MUTED } };
  const title = ws.getCell("A2");
  title.value = meta.title;
  title.font = { name: "Calibri", size: 18, bold: true, color: { argb: INK } };
  ws.getRow(2).height = 28;
  const sub = ws.getCell("A3");
  sub.value = `${meta.description} · ${rows.length} record${rows.length === 1 ? "" : "s"} · Generated ${meta.generatedAt} by ${meta.generatedBy}`;
  sub.font = { name: "Calibri", size: 10, color: { argb: MUTED } };
  const filt = ws.getCell("A4");
  filt.value = meta.filters.length ? `Filters: ${meta.filters.join(" · ")}` : "Filters: none";
  filt.font = { name: "Calibri", size: 10, italic: true, color: { argb: MUTED } };
  ws.getRow(4).height = 20;

  // Header (row 5)
  const header = ws.getRow(5);
  header.values = columns.map((c) => c.label);
  header.height = 26;
  header.eachCell((cell, ci) => {
    const kind = columns[ci - 1].kind;
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    cell.alignment = { vertical: "middle", horizontal: kind === "money" || kind === "number" ? "right" : "left", indent: 1 };
  });

  // Data rows
  rows.forEach((r, ri) => {
    const row = ws.addRow(r.map((v) => (v instanceof Date ? new Date(v.getTime() + IST_OFFSET_MS) : v)));
    // Leave the height unset when a cell wraps, so Excel grows the row to fit.
    if (!columns.some((c) => c.kind === "long")) row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, ci) => {
      const col = columns[ci - 1];
      if (!col) return;
      cell.font = { name: "Calibri", size: 10.5, color: { argb: INK } };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      cell.border = { bottom: { style: "thin", color: { argb: RULE } } };
      if (ri % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      if (col.kind === "date") cell.numFmt = "dd mmm yyyy";
      if (col.kind === "money") {
        cell.numFmt = '"₹"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
      }
      if (col.kind === "number") cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
      if (col.kind === "long") cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
      if (ci === 1) cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: INK } };
      const tone = PILL_COLUMNS.has(col.label) && typeof cell.value === "string" ? LABEL_TONES[cell.value] : undefined;
      if (tone) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TONES[tone].fill } };
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: TONES[tone].font } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  // Totals row for money columns
  const firstData = 6;
  const lastData = 5 + rows.length;
  if (rows.length && columns.some((c) => c.kind === "money")) {
    const sum = (i: number) => rows.reduce((s, r) => s + (typeof r[i] === "number" ? (r[i] as number) : 0), 0);
    const total = ws.addRow(
      columns.map((c, i) => {
        if (i === 0) return "Total";
        if (c.kind !== "money") return null;
        const letter = ws.getColumn(i + 1).letter;
        // Cached result so previews that don't recalculate still show the total.
        return { formula: `SUM(${letter}${firstData}:${letter}${lastData})`, result: sum(i) };
      }),
    );
    total.height = 24;
    total.eachCell({ includeEmpty: true }, (cell, ci) => {
      const col = columns[ci - 1];
      if (!col) return;
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: INK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F5" } };
      cell.border = { top: { style: "medium", color: { argb: INK } } };
      cell.alignment = { vertical: "middle", horizontal: col.kind === "money" ? "right" : "left", indent: 1 };
      if (col.kind === "money") cell.numFmt = '"₹"#,##0.00';
    });
  }

  // Column widths from the content
  columns.forEach((c, ci) => {
    const longest = Math.max(
      c.label.length,
      ...rows.slice(0, 300).map((r) => {
        const v = r[ci];
        if (v instanceof Date) return 11;
        if (c.kind === "money" && typeof v === "number") return Math.round(v).toLocaleString("en-IN").length + 4;
        return String(v ?? "").length;
      }),
    );
    ws.getColumn(ci + 1).width = c.kind === "long" ? Math.min(45, Math.max(24, longest + 4)) : Math.min(50, Math.max(10, longest + 4));
  });

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, lastData), column: n } };
  ws.pageSetup.printTitlesRow = "5:5";
  ws.headerFooter.oddFooter = `&L${meta.orgName} · ${meta.title}&RPage &P of &N`;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
