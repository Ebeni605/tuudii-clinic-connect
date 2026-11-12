// Report helpers: CSV export (Excel-friendly), date ranges in clinic time, formatting.
import { clinicToday } from "./patient-schema";

export type Column<T> = { key: keyof T & string; label: string; format?: (v: T[keyof T], row: T) => string; align?: "right" };

/** One CSV cell: quoted when needed, and spreadsheet formulas neutralised (=, +, -, @ at the start). */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Column<T>[]): string {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(c.format ? c.format(r[c.key], r) : r[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

/** Downloads text as a CSV file that Excel opens with the right characters (UTF-8 BOM). */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Adds days to a YYYY-MM-DD date without touching time zones. */
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Default report range: the last 30 clinic days including today. */
export function defaultRange(today = clinicToday()) {
  return { from: addDays(today, -29), to: today };
}

/** Problem with a chosen range, or null. Mirrors DB function report_guard (max two years). */
export function rangeProblem(from: string, to: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "Choose both dates";
  if (from > to) return "The start date must be before the end date";
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > 731) return "Date range is limited to two years";
  return null;
}

/** "45 min", "2 h 05 min", "—" */
export function fmtMinutes(m: number | null | undefined) {
  if (m == null || Number.isNaN(Number(m))) return "—";
  const n = Math.round(Number(m));
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  if (h < 48) return `${h} h ${String(n % 60).padStart(2, "0")} min`;
  return `${Math.round(h / 24)} days`;
}

export function pct(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

/** A YYYY-MM-DD value from the URL, or undefined. */
export function searchDate(v: unknown): string | undefined {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

/** Change vs the previous equal-length period, or null when there is no valid basis (never invent a %). */
export function periodChange(current: number, previous: number | null | undefined): { pct: number; dir: "up" | "down" | "same" } | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || previous <= 0) return null;
  const p = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(p), dir: p > 0 ? "up" : p < 0 ? "down" : "same" };
}

/** The flow step with the most visits waiting/in progress — the current bottleneck — or null when nothing is queued. */
export function bottleneck(steps: { key: string; queued: number }[]): string | null {
  const top = steps.reduce<{ key: string; queued: number } | null>((b, s) => (s.queued > (b?.queued ?? 0) ? s : b), null);
  return top?.key ?? null;
}
