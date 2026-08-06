// AI Workflow Engine — természetes nyelvből eseményvezérelt folyamat + futtatás
// + A/B variáns generálás és kiértékelés.
import { createClient } from "npm:@supabase/supabase-js@2";
import { publish } from "../_shared/agent-bus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function callAI(system: string, user: string, model = "google/gemini-2.5-flash") {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}: ${await res.text()}`);
  const j = await res.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

const TRIGGERS = [
  "order.created", "order.paid", "order.shipped",
  "product.low_stock", "product.created",
  "lead.created", "customer.signup", "cart.abandoned",
  "storefront.published", "review.created", "schedule.daily",
];

const STEP_TYPES = [
  "send_email", "social_post", "notify_admin", "agent_event",
  "webhook", "ai_generate_text", "log", "wait",
];

const COMPILE_SYSTEM = `Te egy workflow fordító vagy. A partner magyarul leírja mit szeretne automatizálni,
te pontos, eseményvezérelt folyamatot adsz vissza JSON-ban.

Engedélyezett trigger_event értékek: ${TRIGGERS.join(", ")}
Engedélyezett lépéstípusok: ${STEP_TYPES.join(", ")}

Válasz szigorúan ilyen JSON:
{
  "name": "rövid név magyarul",
  "description": "1 mondat",
  "trigger_event": "order.created",
  "steps": [
    { "type": "send_email", "label": "Visszaigazoló e-mail", "config": { "to": "{{order.email}}", "subject": "...", "body": "..." } },
    { "type": "social_post", "label": "Facebook poszt", "config": { "platform": "facebook", "prompt": "..." } },
    { "type": "notify_admin", "label": "Raktár értesítés", "config": { "title": "...", "message": "..." } },
    { "type": "agent_event", "label": "Agent Bus jelzés", "config": { "event_type": "workflow.custom", "payload": {} } }
  ]
}
A {{...}} placeholderek a trigger payload mezőire hivatkoznak. Ne találj ki más lépéstípust.`;

function interpolate(tpl: unknown, payload: Record<string, unknown>): unknown {
  if (typeof tpl === "string") {
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
      const val = path.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), payload);
      return val == null ? "" : String(val);
    });
  }
  if (Array.isArray(tpl)) return tpl.map((t) => interpolate(t, payload));
  if (tpl && typeof tpl === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(tpl as Record<string, unknown>)) out[k] = interpolate(v, payload);
    return out;
  }
  return tpl;
}

// deno-lint-ignore no-explicit-any
async function runStep(admin: any, wf: any, step: any, payload: Record<string, unknown>, dryRun: boolean) {
  const cfg = (interpolate(step.config ?? {}, payload) ?? {}) as Record<string, any>;
  const base = { type: step.type, label: step.label ?? step.type };
  if (dryRun) return { ...base, status: "simulated", detail: cfg };

  switch (step.type) {
    case "send_email": {
      const { error } = await admin.functions.invoke("send-transactional-email", {
        body: { to: cfg.to, subject: cfg.subject, html: `<p>${String(cfg.body ?? "").replace(/\n/g, "<br/>")}</p>` },
      });
      return { ...base, status: error ? "error" : "ok", detail: error?.message ?? cfg.to };
    }
    case "social_post": {
      let content = cfg.content ?? "";
      if (!content && cfg.prompt) {
        const gen = await callAI(
          "Rövid, ütős magyar közösségi média poszt. JSON: {\"text\":\"...\"}",
          String(cfg.prompt),
        );
        content = gen.text ?? gen.raw ?? "";
      }
      const { error } = await admin.from("social_publish_queue").insert({
        platform: cfg.platform ?? "facebook",
        content,
        status: "pending",
        scheduled_at: new Date().toISOString(),
        source: `workflow:${wf.id}`,
      });
      return { ...base, status: error ? "error" : "ok", detail: error?.message ?? content.slice(0, 120) };
    }
    case "notify_admin": {
      const { error } = await admin.from("admin_notifications").insert({
        title: cfg.title ?? "Workflow értesítés",
        message: cfg.message ?? "",
        type: "workflow",
      });
      return { ...base, status: error ? "error" : "ok", detail: error?.message ?? cfg.title };
    }
    case "agent_event": {
      const id = await publish(admin, {
        source: `workflow:${wf.name}`,
        eventType: cfg.event_type ?? "workflow.custom",
        payload: { ...(cfg.payload ?? {}), workflow_id: wf.id, trigger: payload },
        severity: "info",
      });
      return { ...base, status: id ? "ok" : "error", detail: id };
    }
    case "webhook": {
      try {
        const r = await fetch(String(cfg.url), {
          method: cfg.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg.body ?? payload),
        });
        return { ...base, status: r.ok ? "ok" : "error", detail: `HTTP ${r.status}` };
      } catch (e) { return { ...base, status: "error", detail: (e as Error).message }; }
    }
    case "ai_generate_text": {
      const gen = await callAI("Magyar marketing szövegíró. JSON: {\"text\":\"...\"}", String(cfg.prompt ?? ""));
      return { ...base, status: "ok", detail: gen.text ?? gen.raw };
    }
    case "wait":
      return { ...base, status: "ok", detail: `${cfg.seconds ?? 0}s (ütemezve)` };
    default:
      return { ...base, status: "ok", detail: cfg };
  }
}

// deno-lint-ignore no-explicit-any
async function executeWorkflow(admin: any, wf: any, payload: Record<string, unknown>, dryRun: boolean) {
  const started = Date.now();
  const results: unknown[] = [];
  let failed = false;
  for (const step of (wf.steps ?? [])) {
    try {
      const r = await runStep(admin, wf, step, payload, dryRun);
      if ((r as any).status === "error") failed = true;
      results.push(r);
    } catch (e) {
      failed = true;
      results.push({ type: step.type, label: step.label, status: "error", detail: (e as Error).message });
    }
  }
  const duration = Date.now() - started;
  if (!dryRun) {
    await admin.from("partner_workflow_runs").insert({
      workflow_id: wf.id, partner_id: wf.partner_id, trigger_event: wf.trigger_event,
      trigger_payload: payload, step_results: results,
      status: failed ? "failed" : "success", duration_ms: duration,
    });
    await admin.from("partner_workflows").update({
      run_count: (wf.run_count ?? 0) + 1,
      error_count: (wf.error_count ?? 0) + (failed ? 1 : 0),
      last_run_at: new Date().toISOString(),
    }).eq("id", wf.id);
  }
  return { status: failed ? "failed" : "success", duration_ms: duration, step_results: results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "compile";

    // --- 1) Természetes nyelv -> workflow ---
    if (action === "compile") {
      if (!body.prompt) return json({ error: "prompt kötelező" }, 400);
      const spec = await callAI(COMPILE_SYSTEM, String(body.prompt));
      if (!TRIGGERS.includes(spec.trigger_event)) spec.trigger_event = "order.created";
      spec.steps = (spec.steps ?? []).filter((s: any) => STEP_TYPES.includes(s?.type));
      return json({ ok: true, workflow: spec });
    }

    // --- 2) Kézi / teszt futtatás ---
    if (action === "run" || action === "test") {
      const { data: wf } = await admin.from("partner_workflows").select("*").eq("id", body.workflow_id).maybeSingle();
      if (!wf) return json({ error: "workflow nem található" }, 404);
      const res = await executeWorkflow(admin, wf, body.payload ?? {}, action === "test");
      return json({ ok: true, ...res });
    }

    // --- 3) Esemény szétosztás minden aktív folyamatra ---
    if (action === "dispatch") {
      const event = String(body.event ?? "");
      const { data: wfs } = await admin.from("partner_workflows")
        .select("*").eq("trigger_event", event).eq("is_active", true).limit(50);
      const out = [];
      for (const wf of wfs ?? []) {
        out.push({ workflow_id: wf.id, ...(await executeWorkflow(admin, wf, body.payload ?? {}, false)) });
      }
      return json({ ok: true, event, executed: out.length, results: out });
    }

    // --- 4) A/B variáns generálás ---
    if (action === "ab_generate") {
      const spec = await callAI(
        `Konverzió-optimalizált magyar A/B teszt variánsok webshophoz.
JSON: {"name":"...","target_field":"hero_title","variant_a":{"value":"...","rationale":"..."},"variant_b":{"value":"...","rationale":"..."},"hypothesis":"..."}`,
        `Teszt típus: ${body.test_type ?? "hero"}. Márka: ${body.brand ?? "-"}. Jelenlegi tartalom: ${body.current ?? "-"}. Cél: ${body.goal ?? "magasabb konverzió"}`,
      );
      return json({ ok: true, test: spec });
    }

    // --- 5) A/B kiértékelés (statisztika + AI javaslat) ---
    if (action === "ab_evaluate") {
      const { data: t } = await admin.from("partner_ab_tests").select("*").eq("id", body.test_id).maybeSingle();
      if (!t) return json({ error: "teszt nem található" }, 404);
      const nA = t.variant_a_impressions || t.variant_a_clicks || 0;
      const nB = t.variant_b_impressions || t.variant_b_clicks || 0;
      const cA = t.variant_a_conversions || 0, cB = t.variant_b_conversions || 0;
      const pA = nA ? cA / nA : 0, pB = nB ? cB / nB : 0;
      const pPool = (nA + nB) ? (cA + cB) / (nA + nB) : 0;
      const se = Math.sqrt(pPool * (1 - pPool) * ((nA ? 1 / nA : 0) + (nB ? 1 / nB : 0)));
      const z = se > 0 ? (pB - pA) / se : 0;
      const confidence = Math.min(99.9, Math.max(0, (1 - Math.exp(-0.717 * Math.abs(z) - 0.416 * z * z)) * 100));
      const enough = nA >= (t.min_sample_size ?? 100) && nB >= (t.min_sample_size ?? 100);
      const winner = !enough || confidence < 90 ? null : (pB > pA ? "b" : "a");
      const lift = pA > 0 ? ((pB - pA) / pA) * 100 : 0;
      const rec = winner
        ? `A(z) ${winner.toUpperCase()} variáns nyert ${confidence.toFixed(1)}% megbízhatósággal (${lift >= 0 ? "+" : ""}${lift.toFixed(1)}% konverzió).`
        : `Még nincs elég adat (A: ${nA}, B: ${nB}) — a teszt fusson tovább.`;
      await admin.from("partner_ab_tests").update({
        confidence, winner, ai_recommendation: rec,
        status: winner ? "completed" : t.status,
        completed_at: winner ? new Date().toISOString() : null,
      }).eq("id", t.id);
      return json({ ok: true, winner, confidence, lift, recommendation: rec, enough });
    }

    return json({ error: "ismeretlen action" }, 400);
  } catch (e) {
    console.error("[partner-workflow-engine]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
