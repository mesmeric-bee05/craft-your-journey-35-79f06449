/**
 * Shared export helpers for admin ops tables (webhook events, cron runs,
 * disbursements, repayments). CSV for spreadsheets, PDF for audit packs.
 */
import jsPDF from "jspdf";

export interface ExportColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number | null | undefined;
}

const escapeCsv = (v: unknown) => {
  let s = v == null ? "" : String(v).replace(/"/g, '""');
  // Neutralise spreadsheet formulas (=, +, -, @, tab, CR) so cells open as plain text.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

export function buildCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  return [
    columns.map((c) => escapeCsv(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(",")),
  ].join("\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
) {
  const csv = buildCsv(rows, columns);
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  /** Human-readable summary of the active filters. */
  filters?: string[];
}

export function downloadPdfReport<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
  options: PdfReportOptions,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const lineHeight = 14;

  const colWidth = (pageWidth - margin * 2) / columns.length;
  let y = margin;

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(options.title, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`SmartReach AI · generated ${new Date().toLocaleString()}`, margin, y);
    y += 12;
    if (options.subtitle) {
      doc.text(options.subtitle, margin, y);
      y += 12;
    }
    if (options.filters?.length) {
      doc.text(`Filters: ${options.filters.join(" · ")}`, margin, y);
      y += 12;
    }
    doc.text(`Rows: ${rows.length}`, margin, y);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    columns.forEach((c, i) => {
      doc.text(String(c.label), margin + i * colWidth, y, { maxWidth: colWidth - 6 });
    });
    y += 6;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
  };

  header();

  rows.forEach((row) => {
    if (y > pageHeight - margin - lineHeight) {
      doc.addPage();
      y = margin;
      header();
    }
    columns.forEach((c, i) => {
      const raw = c.value(row);
      const text = raw == null ? "—" : String(raw);
      doc.text(
        doc.splitTextToSize(text, colWidth - 6).slice(0, 2),
        margin + i * colWidth,
        y,
      );
    });
    y += lineHeight + 4;
  });

  doc.save(`${filenameBase}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
