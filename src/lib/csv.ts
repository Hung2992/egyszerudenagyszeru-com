/**
 * One CSV cell, safe for Excel/Sheets: always quoted, and text starting with a
 * formula trigger (= + - @ tab CR) is prefixed with ' so it is never executed.
 * Plain numbers (including negative ones) are kept as numbers.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
  const isNumber = typeof value === "number" || /^-?\d+([.,]\d+)?$/.test(s);
  if (!isNumber && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Joins rows of raw values into CSV text using safe cells. */
export function toCsv(rows: unknown[][], sep = ";"): string {
  return rows.map((r) => r.map(csvCell).join(sep)).join("\n");
}
