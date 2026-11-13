// Global AI gateway meter: wraps fetch so every Lovable AI gateway call in this
// function is budget-checked and recorded into ai_usage_daily (CONTROL panel).
import { estimateAiCost } from "./ai-usage.ts";
import { aegisArmSystem, aegisCanary, aegisCanaryHit, aegisRedact, aegisSanitizeHistory, AegisStreamGuard, AEGIS_PROMPT_LEAK_REPLY } from "./aegis.ts";

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
  const redactChoices = (j: any, canary?: string): { found: string[]; leak: boolean } => {
    const all: string[] = []; let leak = false;
    for (const c of j?.choices ?? []) {
      const m = c?.message;
      if (typeof m?.content === "string") {
        if (aegisCanaryHit(m.content, canary)) { m.content = AEGIS_PROMPT_LEAK_REPLY; leak = true; continue; }
        const r = aegisRedact(m.content); m.content = r.text; r.findings.forEach((f) => all.includes(f) || all.push(f));
      }
    }
    return { found: all, leak };
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
    let canary: string | undefined;
    try {
      const body = JSON.parse(String(init?.body ?? "{}"));
      model = body.model ?? model;
      if (Array.isArray(body.messages)) {
        // 1) csak az utolsó felhasználói kérdést blokkoljuk; a korábbi (kliens által küldött) üzenetekből kivesszük a támadást
        const { lastUser, neutralized } = aegisSanitizeHistory(body.messages);
        if (lastUser.length && g.__aegisState?.mode !== "flag") {
          orig(`${url}/rest/v1/aegis_events`, { method: "POST", headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ source: fn, stage: "input", action: "blocked", findings: lastUser }) }).catch(() => {});
          return new Response(JSON.stringify({ error: "aegis_input_blocked", findings: lastUser }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        aegis("input", "flagged", [...lastUser, ...neutralized.filter((x) => !lastUser.includes(x))]);
        // 2) kanári-jelölő a rendszerpromptba: ha a válaszban megjelenik, rejtett-utasítás szivárgás
        const c = aegisCanary();
        if (aegisArmSystem(body.messages, c)) canary = c;
        if (neutralized.length || canary) init = { ...init, body: JSON.stringify(body) };
      }
    } catch { /* binary body */ }
    const res = await orig(input, init);
    if (!res.ok) return res;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const j = await res.json();
        record(model, j?.usage ?? null);
        const rc = redactChoices(j, canary);
        aegis("output", "redacted", rc.found);
        if (rc.leak) aegis("output", "flagged", ["prompt_leak"]);
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
      // darabokon átívelő titkok ellen: választásonként egy visszatartó őr
      const guards = new Map<number, AegisStreamGuard>();
      const gd = (i: number) => { let x = guards.get(i); if (!x) { x = new AegisStreamGuard(canary); guards.set(i, x); } return x; };
      let carry = "";
      const enc = new TextEncoder();
      const flushAll = (ctl: TransformStreamDefaultController<Uint8Array>) => {
        for (const [i, x] of guards) { const rest = x.end(); if (rest) ctl.enqueue(enc.encode("data: " + JSON.stringify({ choices: [{ index: i, delta: { content: rest } }] }) + "\n\n")); }
      };
      const report = () => {
        const found: string[] = []; let leak = false;
        for (const x of guards.values()) { x.findings.forEach((f) => f === "prompt_leak" ? (leak = true) : found.includes(f) || found.push(f)); }
        aegis("output", "redacted", found);
        if (leak) aegis("output", "flagged", ["prompt_leak"]);
      };
      let done = false;
      const guarded = a.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream<string, Uint8Array>({
        transform(chunk, ctl) {
          const lines = (carry + chunk).split("\n"); carry = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim() === "data: [DONE]") { flushAll(ctl); done = true; ctl.enqueue(enc.encode(line + "\n")); continue; }
            if (line.startsWith("data: ")) {
              try {
                const j = JSON.parse(line.slice(6)); let touched = false;
                for (const c of j?.choices ?? []) {
                  const i = Number(c?.index ?? 0);
                  if (typeof c?.delta?.content === "string") { c.delta.content = gd(i).push(c.delta.content); touched = true; }
                  if (c?.finish_reason && guards.has(i)) { const rest = gd(i).end(); if (rest) { c.delta = { ...(c.delta ?? {}), content: (c.delta?.content ?? "") + rest }; touched = true; } }
                }
                if (touched) { ctl.enqueue(enc.encode("data: " + JSON.stringify(j) + "\n")); continue; }
              } catch { /* pass through */ }
            }
            ctl.enqueue(enc.encode(line + "\n"));
          }
        },
        flush(ctl) { if (carry) ctl.enqueue(enc.encode(carry)); if (!done) flushAll(ctl); report(); },
      }));
      const h = new Headers(res.headers); h.delete("content-length");
      return new Response(guarded, { status: res.status, statusText: res.statusText, headers: h });
    } else {
      record(model, null);
    }
    return res;
  };
}
