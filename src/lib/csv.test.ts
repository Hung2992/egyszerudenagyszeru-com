import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+1+1")).toBe("\"'+1+1\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });
  it("keeps negative numbers as numbers", () => {
    expect(csvCell(-1500)).toBe('"-1500"');
    expect(csvCell("-12,5")).toBe('"-12,5"');
  });
  it("quotes separators", () => {
    expect(toCsv([["a;b", null]])).toBe('"a;b";""');
  });
});
