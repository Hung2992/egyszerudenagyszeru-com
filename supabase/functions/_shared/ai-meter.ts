// Global AI gateway meter: wraps fetch so every Lovable AI gateway call in this
// function is budget-checked and recorded into ai_usage_daily (CONTROL panel).
import { estimateAiCost } from "./ai-usage.ts";

const GATEWAY = "ai.gateway.lovable.dev";
// deno-lint-ignore no-explicit-any
const g = globalThis as any;

export function installAiMeter(fn: string): void {
  if (g.__aiMeterInstalled) return;
  g.__aiMeterInstalled = true;
  const orig: typeof fetch = globalThis.fetch.bind(globalThis);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rpc = (name: string, body: unknown) => orig(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const record = async (model: string, usage: Record<string, number> | null) => {
    try {
      const pin = Number(usage?.prompt_tokens ?? 0), pout = Number(usage?.completion_tokens ?? 0);
      const cost = typeof usage?.cost === "number" ? usage.cost : estimateAiCost(model, pin, pout);
      await rpc("ai_record_usage", { _fn: fn, _tokens: pin + pout, _cost: cost });
    } catch (e) { console.warn("ai meter record failed", (e as Error).message); }
  };

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url || !key || !href.includes(GATEWAY)) return orig(input, init);
    try {
      const st = await rpc("ai_budget_state", {});
      if (st.ok && (await st.json())?.state === "blocked") {
        return new Response(JSON.stringify({ error: "ai_budget_exhausted" }), { status: 402, headers: { "Content-Type": "application/json" } });
      }
    } catch { /* never block on meter failure */ }
    let model = "unknown";
    try { model = JSON.parse(String(init?.body ?? "{}")).model ?? model; } catch { /* binary body */ }
    const res = await orig(input, init);
    if (!res.ok) return res;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      res.clone().json().then((j) => record(model, j?.usage ?? null)).catch(() => record(model, null));
    } else if (ct.includes("text/event-stream") && res.body) {
      const [a, b] = res.body.tee();
      (async () => {
        let usage = null, buf = "";
        const r = b.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) { const { done, value } = await r.read(); if (done) break; buf = (buf + value).slice(-8000);
          const m = buf.match(/"usage"\s*:\s*(\{[^{}]*\})/g); if (m) { try { usage = JSON.parse(m[m.length - 1].replace(/^"usage"\s*:\s*/, "")); } catch { /**/ } } }
        await record(model, usage);
      })().catch(() => {});
      return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
    } else {
      record(model, null);
    }
    return res;
  };
}
