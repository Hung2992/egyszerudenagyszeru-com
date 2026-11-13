export interface AiBudget {
  used: number; calls: number; tokens: number; limit: number; warn_pct: number; block_at_limit: boolean;
  credit_price: number | null; credit_currency: string; monthly_cost: number | null;
  pct: number | null; state: "ok" | "warn" | "over" | "blocked";
  by_function: { fn: string; calls: number; tokens: number; cost: number }[];
}

export function budgetMessage(b: Pick<AiBudget, "state" | "pct" | "warn_pct">): { level: "ok" | "warn" | "stop"; text: string } {
  if (b.state === "blocked") return { level: "stop", text: "A havi AI-keret elfogyott: a segédek leálltak. Emeld a keretet a folytatáshoz." };
  if (b.state === "over") return { level: "stop", text: "A havi AI-keret elfogyott, de a segédek tovább futnak (leállítás kikapcsolva)." };
  if (b.state === "warn") return { level: "warn", text: `Figyelem: a keret ${b.pct}%-a elfogyott (határ: ${b.warn_pct}%). A segédek a keret elérésekor leállnak.` };
  return { level: "ok", text: b.pct == null ? "Nincs keret beállítva." : `Rendben: a keret ${b.pct}%-a használt.` };
}
