// AI usage metering + monthly budget guard (MODEL COMMAND).
// Cost is an estimate from token counts, calibrated against observed gateway billing.
const RATES: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.0000012, out: 0.00001 },
  "google/gemini-3.8-flash": { in: 0.000003, out: 0.000015 },
};
const DEFAULT_RATE = { in: 0.000003, out: 0.000015 };

export function estimateAiCost(model: string, promptTokens: number, completionTokens: number): number {
  const r = RATES[model] ?? DEFAULT_RATE;
  return Math.max(0, promptTokens) * r.in + Math.max(0, completionTokens) * r.out;
}

// deno-lint-ignore no-explicit-any
export async function recordAiUsage(db: any, fn: string, model: string, usage: any): Promise<void> {
  try {
    const pin = Number(usage?.prompt_tokens ?? 0), pout = Number(usage?.completion_tokens ?? 0);
    const cost = typeof usage?.cost === "number" ? usage.cost : estimateAiCost(model, pin, pout);
    const { error } = await db.rpc("ai_record_usage", { _fn: fn, _tokens: pin + pout, _cost: cost });
    if (error) console.warn("ai usage record failed:", error.message);
  } catch (e) {
    console.warn("ai usage record failed:", (e as Error).message);
  }
}

/** Throws "ai_budget_exhausted" when the monthly budget is spent and blocking is on. */
// deno-lint-ignore no-explicit-any
export async function assertAiBudget(db: any): Promise<void> {
  const { data, error } = await db.rpc("ai_budget_state");
  if (error || !data) throw new Error("ai_budget_unavailable");
  if (data?.state === "blocked") throw new Error("ai_budget_exhausted");
}
