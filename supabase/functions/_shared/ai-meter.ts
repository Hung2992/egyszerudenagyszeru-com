// Global AI gateway meter: wraps fetch so every Lovable AI gateway call in this
// function is budget-checked and recorded into ai_usage_daily (CONTROL panel).
import { estimateAiCost } from "./ai-usage.ts";
import { aegisInput, aegisRedact } from "./aegis.ts";

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

  const aegis = (stage: "input" | "output", action: "flagged" | "redacted", findings: string[]) => {
    if (!findings.length) return;
    orig(`${url}/rest/v1/aegis_events`, {
      method: "POST",
      headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: fn, stage, action, findings }),
    }).catch(() => {});
  };
  // deno-lint-ignore no-explicit-any
  const redactChoices = (j: any, key2: "message" | "delta"): string[] => {
    const all: string[] = [];
    for (const c of j?.choices ?? []) {
      const m = c?.[key2];
      if (typeof m?.content === "string") {
        const r = aegisRedact(m.content); m.content = r.text; r.findings.forEach((f) => all.includes(f) || all.push(f));
      }
    }
    return all;
  };

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url || !key || !href.includes(GATEWAY)) return orig(input, init);
    // AEGIS vészleállítás: GLOBAL STOP / PAUSE / ISOLATE / REVOKE / KILL ügynökönként
    try {
      const now = Date.now();
      if (!g.__aegisState || now - g.__aegisState.at > 15_000) {
        const ar = await rpc("aegis_policy", { _agent: fn });
        const pol = ar.ok ? await ar.json() : null;
        g.__aegisState = { at: now, state: String(pol?.state ?? "active"), mode: String(pol?.input_mode ?? "block") };
      }
      if (g.__aegisState.state !== "active") {
        orig(`${url}/rest/v1/aegis_events`, { method: "POST", headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ source: fn, stage: "agent", action: "blocked", findings: [g.__aegisState.state] }) }).catch(() => {});
        return new Response(JSON.stringify({ error: "aegis_agent_stopped", state: g.__aegisState.state }), { status: 423, headers: { "Content-Type": "application/json" } });
      }
    } catch { /* AEGIS check failure must not hide budget check */ }
    try {
      const st = await rpc("ai_budget_state", {});
      if (st.ok && (await st.json())?.state === "blocked") {
        return new Response(JSON.stringify({ error: "ai_budget_exhausted" }), { status: 402, headers: { "Content-Type": "application/json" } });
      }
    } catch { /* never block on meter failure */ }
    let model = "unknown";
    try {
      const body = JSON.parse(String(init?.body ?? "{}"));
      model = body.model ?? model;
      // deno-lint-ignore no-explicit-any
      const users = (body.messages ?? []).filter((m: any) => m?.role === "user");
      const last = users[users.length - 1]?.content;
      const text = typeof last === "string" ? last : Array.isArray(last) ? last.map((p: { text?: string }) => p?.text ?? "").join(" ") : "";
      const found = text ? aegisInput(text) : [];
      if (found.length && g.__aegisState?.mode !== "flag") {
        orig(`${url}/rest/v1/aegis_events`, { method: "POST", headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ source: fn, stage: "input", action: "blocked", findings: found }) }).catch(() => {});
        return new Response(JSON.stringify({ error: "aegis_input_blocked", findings: found }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      aegis("input", "flagged", found);
    } catch { /* binary body */ }
    const res = await orig(input, init);
    if (!res.ok) return res;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const j = await res.json();
        record(model, j?.usage ?? null);
        aegis("output", "redacted", redactChoices(j, "message"));
        const h = new Headers(res.headers); h.delete("content-length");
        return new Response(JSON.stringify(j), { status: res.status, statusText: res.statusText, headers: h });
      } catch {
        record(model, null);
        return new Response(null, { status: 502 });
      }
    } else if (ct.includes("text/event-stream") && res.body) {
      const [a, b] = res.body.tee();
      (async () => {
        let usage = null, buf = "";
        const r = b.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) { const { done, value } = await r.read(); if (done) break; buf = (buf + value).slice(-8000);
          const m = buf.match(/"usage"\s*:\s*(\{[^{}]*\})/g); if (m) { try { usage = JSON.parse(m[m.length - 1].replace(/^"usage"\s*:\s*/, "")); } catch { /**/ } } }
        await record(model, usage);
      })().catch(() => {});
      const found: string[] = [];
      let carry = "";
      const enc = new TextEncoder();
      const guarded = a.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream<string, Uint8Array>({
        transform(chunk, ctl) {
          const lines = (carry + chunk).split("\n"); carry = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try { const j = JSON.parse(line.slice(6)); const f = redactChoices(j, "delta");
                if (f.length) { f.forEach((x) => found.includes(x) || found.push(x)); ctl.enqueue(enc.encode("data: " + JSON.stringify(j) + "\n")); continue; } } catch { /* pass through */ }
            }
            ctl.enqueue(enc.encode(line + "\n"));
          }
        },
        flush(ctl) { if (carry) ctl.enqueue(enc.encode(carry)); aegis("output", "redacted", found); },
      }));
      const h = new Headers(res.headers); h.delete("content-length");
      return new Response(guarded, { status: res.status, statusText: res.statusText, headers: h });
    } else {
      record(model, null);
    }
    return res;
  };
}
