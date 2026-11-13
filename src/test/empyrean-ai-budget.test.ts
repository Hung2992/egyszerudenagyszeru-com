import { describe, it, expect } from "vitest";
import { budgetMessage } from "@/lib/empyrean-ai-budget";

describe("AI budget warning", () => {
  it("warns before the limit is reached", () => {
    expect(budgetMessage({ state: "warn", pct: 85, warn_pct: 80 }).level).toBe("warn");
  });
  it("reports a stop when the budget is exhausted and blocking is on", () => {
    expect(budgetMessage({ state: "blocked", pct: 100, warn_pct: 80 }).level).toBe("stop");
  });
});
