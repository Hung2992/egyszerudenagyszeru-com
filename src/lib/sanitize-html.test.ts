import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    expect(sanitizeHtml('<p>Hi</p><script>alert(1)</script>')).toBe("<p>Hi</p>");
  });
  it("removes inline event handlers", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain("onerror");
  });
  it("removes javascript: links", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });
  it("keeps normal formatting", () => {
    expect(sanitizeHtml("<p><strong>Rólunk</strong></p>")).toBe("<p><strong>Rólunk</strong></p>");
  });
});
