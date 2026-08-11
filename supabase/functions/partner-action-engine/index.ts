// AI intézkedés motor: cél → elemzés → terv → jóváhagyás → végrehajtás → mérés → tanulás.
// Minden intézkedés auditált: ki, mikor, mit, előtte/utána, correlation_id, rollback.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Kockázati besorolás: 🟢 auto engedhető, 🟡 jóváhagyás, 🔴 erős emberi kontroll
const RISK_BY_TYPE: Record<string, "alacsony" | "közepes" | "magas"> = {
  campaign: "alacsony",
  abtest: "alacsony",
  workflow: "alacsony",
  manual: "alacsony",
  reprice: "közepes",
};
const RISK_ORDER = { alacsony: 1, "közepes": 2, magas: 3 } as const;

function stepRisk(step: any): "alacsony" | "közepes" | "magas" {
  const base = RISK_BY_TYPE[String(step?.type)] ?? "közepes";
  if (step?.type === "reprice") {
    const pct = Number(step?.params?.discount_pct || 0);
    if (pct > 20) return "magas";
  }
  return base;
}

async function callAI(system: string, user: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

type Ctx = Record<string, unknown>;

async function buildContext(sb: any, partnerId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const prev = new Date(Date.now() - 60 * 864e5).toISOString();
  const [ordersRes, prodRes, sfRes, campRes] = await Promise.all([
    sb.from("partner_orders").select("total_huf,partner_payout_huf,status,created_at").eq("partner_id", partnerId).gte("created_at", prev).limit(1000),
    sb.from("partner_products").select("id,title,price_huf,compare_price_huf,stock_qty,status,view_count,sales_count,description").eq("partner_id", partnerId).limit(200),
    sb.from("partner_storefronts").select("id,slug,is_published,store_name,tagline,seo_title,seo_description").eq("partner_id", partnerId).maybeSingle(),
    sb.from("partner_marketing_campaigns").select("id,platform,status,created_at").eq("partner_id", partnerId).gte("created_at", prev).limit(200),
  ]);
  const orders = ordersRes.data || [];
  const products = prodRes.data || [];
  const cur = orders.filter((o: any) => o.created_at >= since);
  const old = orders.filter((o: any) => o.created_at < since);
  const sum = (arr: any[]) => arr.reduce((s, o) => s + Number(o.partner_payout_huf || o.total_huf || 0), 0);
  const weak = products
    .filter((p: any) => Number(p.view_count || 0) > 0 && Number(p.sales_count || 0) === 0)
    .slice(0, 20)
    .map((p: any) => ({ id: p.id, cim: p.title, ar: p.price_huf, megtekintes: p.view_count, keszlet: p.stock_qty }));
  const noSeo = products.filter((p: any) => !p.description || String(p.description).length < 60).slice(0, 20)
    .map((p: any) => ({ id: p.id, cim: p.title }));
  return {
    ctx: {
      utolso_30_nap: { bevetel_ft: sum(cur), rendelesek: cur.length },
      elozo_30_nap: { bevetel_ft: sum(old), rendelesek: old.length },
      webshop: sfRes.data || null,
      kampanyok_60_nap: (campRes.data || []).length,
      termek_osszes: products.length,
      gyenge_termekek: weak,
      hianyos_leiras: noSeo,
      top_termekek: products.sort((a: any, b: any) => Number(b.sales_count || 0) - Number(a.sales_count || 0)).slice(0, 8)
        .map((p: any) => ({ id: p.id, cim: p.title, eladas: p.sales_count, ar: p.price_huf })),
    } as Ctx,
    baseline: {
      revenue_30d: sum(cur), orders_30d: cur.length,
      products: products.length, ts: new Date().toISOString(),
    },
    storefrontId: (sfRes.data as any)?.id ?? null,
  };
}

const PLAN_SYS = `Te egy magyar e-kereskedelmi AI operatív vezető vagy. A partner adataiból konkrét, végrehajtható intézkedési TERVET készítesz.
Válasz KIZÁRÓLAG JSON:
{"summary":"2-3 mondat magyarul","expected_impact":"pl. +8–15% rendelési volumen","risk_level":"alacsony|közepes|magas",
"steps":[{"type":"reprice|campaign|abtest|workflow|manual","title":"...","why":"...","impact":"magas|közepes|alacsony","params":{}}]}
Maximum 5 lépés. A params mezők típusonként:
- reprice: {"product_ids":["uuid",...],"discount_pct":10}  (csak a megadott gyenge termékek id-jai, 5-25 közti kedvezmény)
- campaign: {"platform":"facebook|instagram|tiktok","title":"...","body":"...","cta_text":"..."}
- abtest: {"name":"...","test_type":"hero","target_field":"hero_title","variant_a":{"value":"..."},"variant_b":{"value":"..."}}
- workflow: {"name":"...","natural_language":"...","trigger_event":"cart_abandoned|order_created|product_low_stock"}
- manual: {"instructions":"..."}
Magyarul írj, konkrét számokkal, a megadott adatokra hivatkozva.`;

async function audit(sb: any, row: Record<string, unknown>) {
  try {
    await sb.from("partner_action_audit").insert(row);
  } catch (_) { /* audit soha ne blokkolja a folyamatot */ }
}

async function busPublish(sb: any, eventType: string, payload: unknown, correlationId: string | null) {
  try {
    await sb.rpc("agent_bus_publish", {
      _source_agent: "action-engine",
      _event_type: eventType,
      _payload: payload,
      _target_agent: null,
      _severity: "info",
      _correlation_id: correlationId,
    });
  } catch (_) { /* nem kritikus */ }
}

/** Egy lépés végrehajtása. Visszaadja az előtte/utána állapotot és a rollback adatot. */
async function executeStep(sb: any, partnerId: string, storefrontId: string | null, step: any) {
  const p = step?.params || {};
  switch (step?.type) {
    case "reprice": {
      const ids: string[] = Array.isArray(p.product_ids) ? p.product_ids.slice(0, 30) : [];
      const pct = Math.min(25, Math.max(5, Number(p.discount_pct) || 10));
      if (!ids.length) return { ok: false, message: "Nincs kiválasztott termék.", before: {}, after: {}, rollback: [] };
      const { data: prods } = await sb.from("partner_products").select("id,title,price_huf,compare_price_huf").eq("partner_id", partnerId).in("id", ids);
      const before: any[] = [];
      const after: any[] = [];
      const rollback: any[] = [];
      for (const pr of prods || []) {
        const old = Number(pr.price_huf || 0);
        if (!old) continue;
        const next = Math.max(1, Math.round((old * (100 - pct)) / 100 / 10) * 10);
        const { error } = await sb.from("partner_products")
          .update({ price_huf: next, compare_price_huf: pr.compare_price_huf || old })
          .eq("id", pr.id).eq("partner_id", partnerId);
        if (!error) {
          before.push({ id: pr.id, cim: pr.title, ar: old, compare: pr.compare_price_huf });
          after.push({ id: pr.id, cim: pr.title, ar: next });
          rollback.push({ table: "partner_products", id: pr.id, values: { price_huf: old, compare_price_huf: pr.compare_price_huf } });
        }
      }
      return { ok: after.length > 0, message: `${after.length} termék újraárazva -${pct}%.`, before: { termekek: before }, after: { termekek: after }, rollback };
    }
    case "campaign": {
      const { data, error } = await sb.from("partner_marketing_campaigns").insert({
        partner_id: partnerId,
        platform: String(p.platform || "facebook"),
        title: String(p.title || step.title || "AI kampány").slice(0, 200),
        body: String(p.body || "").slice(0, 3000),
        cta_text: p.cta_text ? String(p.cta_text).slice(0, 80) : null,
        status: "draft",
        ai_model: "google/gemini-3.5-flash",
      }).select("id").maybeSingle();
      return {
        ok: !error, message: error ? error.message : "Kampány piszkozat létrehozva.",
        before: {}, after: { campaign_id: data?.id },
        rollback: data?.id ? [{ table: "partner_marketing_campaigns", id: data.id, delete: true }] : [],
      };
    }
    case "abtest": {
      const { data, error } = await sb.from("partner_ab_tests").insert({
        partner_id: partnerId,
        storefront_id: storefrontId,
        name: String(p.name || step.title || "AI A/B teszt").slice(0, 200),
        test_type: String(p.test_type || "hero"),
        target_field: String(p.target_field || "hero_title"),
        variant_a: p.variant_a || {},
        variant_b: p.variant_b || {},
        status: "draft",
      }).select("id").maybeSingle();
      return {
        ok: !error, message: error ? error.message : "A/B teszt piszkozat létrehozva.",
        before: {}, after: { ab_test_id: data?.id },
        rollback: data?.id ? [{ table: "partner_ab_tests", id: data.id, delete: true }] : [],
      };
    }
    case "workflow": {
      const { data, error } = await sb.from("partner_workflows").insert({
        partner_id: partnerId,
        name: String(p.name || step.title || "AI automatizmus").slice(0, 200),
        natural_language: String(p.natural_language || step.why || "").slice(0, 2000),
        trigger_event: String(p.trigger_event || "order_created"),
        steps: [],
        is_active: false,
      }).select("id").maybeSingle();
      return {
        ok: !error, message: error ? error.message : "Automatizmus létrehozva (inaktív).",
        before: {}, after: { workflow_id: data?.id },
        rollback: data?.id ? [{ table: "partner_workflows", id: data.id, delete: true }] : [],
      };
    }
    default:
      return { ok: true, message: "Teendő rögzítve (kézi lépés).", before: {}, after: {}, rollback: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "");
    const action = String(body.action || "propose");
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    const { data: partner } = await sb.from("partners").select("id").eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const actor = { actor_id: user.id, actor_email: user.email ?? null, actor_role: "partner" };

    if (action === "propose") {
      const goal = String(body.goal || "Növeld a bevételemet.").slice(0, 500);
      const autopilot = body.autopilot === true;
      const { ctx, baseline } = await buildContext(sb, partnerId);
      const raw = await callAI(PLAN_SYS, `CÉL: ${goal}\n\nADATOK:\n${JSON.stringify(ctx)}`);
      let plan: any;
      try { plan = JSON.parse(raw); } catch { plan = null; }
      if (!plan || !Array.isArray(plan.steps)) return json({ error: "ai_invalid_plan" }, 502);
      const steps = plan.steps.slice(0, 5).map((s: any, i: number) => {
        const st = {
          idx: i, type: String(s.type || "manual"), title: String(s.title || `Lépés ${i + 1}`),
          why: String(s.why || ""), impact: String(s.impact || "közepes"), params: s.params || {},
          state: "pending", risk: "alacsony" as string,
        };
        st.risk = stepRisk(st);
        return st;
      });
      const maxRisk = steps.reduce((m: string, s: any) => RISK_ORDER[s.risk as keyof typeof RISK_ORDER] > RISK_ORDER[m as keyof typeof RISK_ORDER] ? s.risk : m, "alacsony");
      const { data: inserted, error } = await sb.from("partner_action_plans").insert({
        partner_id: partnerId, goal,
        summary: String(plan.summary || "").slice(0, 2000),
        expected_impact: String(plan.expected_impact || "").slice(0, 300),
        risk_level: maxRisk,
        steps, baseline, status: "proposed",
        source: autopilot ? "autopilot" : "partner",
      }).select().single();
      if (error) return json({ error: error.message }, 400);

      await audit(sb, {
        action_id: inserted.id, partner_id: partnerId, correlation_id: inserted.correlation_id,
        event_type: "proposed", risk_level: maxRisk, ...actor,
        details: { goal, steps: steps.map((s: any) => ({ type: s.type, title: s.title, risk: s.risk })), source: inserted.source },
      });
      await busPublish(sb, "action_plan.proposed", { action_id: inserted.id, partner_id: partnerId, goal, risk: maxRisk }, inserted.correlation_id);
      return json({ plan: inserted });
    }

    if (action === "approve") {
      const planId = String(body.plan_id || "");
      const autoMode = body.approval_mode === "autopilot";
      const onlyIdx: number[] | null = Array.isArray(body.step_indexes) ? body.step_indexes.map((n: any) => Number(n)) : null;
      const { data: plan } = await sb.from("partner_action_plans").select("*").eq("id", planId).eq("partner_id", partnerId).maybeSingle();
      if (!plan) return json({ error: "plan_not_found" }, 404);
      if (plan.status === "executed" || plan.status === "measured") return json({ plan });
      const { storefrontId } = await buildContext(sb, partnerId);
      const log: any[] = Array.isArray(plan.execution_log) ? [...plan.execution_log] : [];
      const steps = Array.isArray(plan.steps) ? [...plan.steps] : [];
      const rollbackData: any[] = Array.isArray(plan.rollback_data) ? [...plan.rollback_data] : [];
      const beforeAll: any = {}; const afterAll: any = {};

      // Autopilot: csak alacsony kockázatú lépés futhat jóváhagyás nélkül
      let settings: any = null;
      if (autoMode) {
        const { data } = await sb.from("partner_autopilot_settings").select("*").eq("partner_id", partnerId).maybeSingle();
        settings = data;
        if (!settings?.enabled) return json({ error: "autopilot_disabled" }, 403);
      }

      for (const step of steps) {
        const risk = step.risk || stepRisk(step);
        step.risk = risk;
        if (onlyIdx && !onlyIdx.includes(Number(step.idx))) { step.state = "skipped"; continue; }
        if (autoMode) {
          const allowed = Array.isArray(settings?.auto_allowed_types) ? settings.auto_allowed_types : [];
          const maxRisk = settings?.max_risk_level || "alacsony";
          if (!allowed.includes(step.type) || RISK_ORDER[risk as keyof typeof RISK_ORDER] > RISK_ORDER[maxRisk as keyof typeof RISK_ORDER]) {
            step.state = "needs_approval";
            step.result = "Kockázat miatt emberi jóváhagyás szükséges.";
            continue;
          }
          if (step.type === "reprice") {
            const pct = Number(step?.params?.discount_pct || 0);
            const cap = Number(settings?.max_price_change_pct ?? 10);
            if (pct > cap) { step.params.discount_pct = cap; }
          }
        }
        try {
          const r = await executeStep(sb, partnerId, storefrontId, step);
          step.state = r.ok ? "done" : "failed";
          step.result = r.message;
          if (r.rollback?.length) rollbackData.push(...r.rollback);
          beforeAll[`step_${step.idx}`] = r.before;
          afterAll[`step_${step.idx}`] = r.after;
          log.push({ at: new Date().toISOString(), step: step.title, ok: r.ok, message: r.message, risk });
          await audit(sb, {
            action_id: planId, partner_id: partnerId, correlation_id: plan.correlation_id,
            event_type: r.ok ? "step_executed" : "step_failed", risk_level: risk,
            ...actor, actor_role: autoMode ? "autopilot" : "partner",
            details: { step: step.title, type: step.type, message: r.message },
            before_state: r.before || {}, after_state: r.after || {},
          });
        } catch (e) {
          step.state = "failed";
          step.result = e instanceof Error ? e.message : "hiba";
          log.push({ at: new Date().toISOString(), step: step.title, ok: false, message: step.result });
        }
      }

      const executedAny = steps.some((s: any) => s.state === "done");
      const { data: updated, error } = await sb.from("partner_action_plans")
        .update({
          status: executedAny ? "executed" : "proposed",
          steps, execution_log: log, rollback_data: rollbackData,
          before_state: beforeAll, after_state: afterAll,
          approval_mode: autoMode ? "autopilot" : "manual",
          approved_by: user.id, approved_by_email: user.email ?? null,
          approved_at: new Date().toISOString(),
          executed_at: executedAny ? new Date().toISOString() : null,
        })
        .eq("id", planId).eq("partner_id", partnerId).select().single();
      if (error) return json({ error: error.message }, 400);

      await audit(sb, {
        action_id: planId, partner_id: partnerId, correlation_id: plan.correlation_id,
        event_type: "approved", risk_level: plan.risk_level, ...actor,
        actor_role: autoMode ? "autopilot" : "partner",
        details: { mode: autoMode ? "autopilot" : "manual", executed_steps: steps.filter((s: any) => s.state === "done").length },
      });
      await busPublish(sb, "action_plan.executed", { action_id: planId, partner_id: partnerId }, plan.correlation_id);
      return json({ plan: updated });
    }

    if (action === "rollback") {
      const planId = String(body.plan_id || "");
      const { data: plan } = await sb.from("partner_action_plans").select("*").eq("id", planId).eq("partner_id", partnerId).maybeSingle();
      if (!plan) return json({ error: "plan_not_found" }, 404);
      const entries: any[] = Array.isArray(plan.rollback_data) ? plan.rollback_data : [];
      let restored = 0;
      for (const e of entries) {
        try {
          if (e.delete) {
            const { error } = await sb.from(e.table).delete().eq("id", e.id).eq("partner_id", partnerId);
            if (!error) restored++;
          } else {
            const { error } = await sb.from(e.table).update(e.values).eq("id", e.id).eq("partner_id", partnerId);
            if (!error) restored++;
          }
        } catch (_) { /* folytatjuk */ }
      }
      const { data: updated } = await sb.from("partner_action_plans")
        .update({ status: "rolled_back", rolled_back_at: new Date().toISOString(), rolled_back_by: user.id })
        .eq("id", planId).eq("partner_id", partnerId).select().single();
      await audit(sb, {
        action_id: planId, partner_id: partnerId, correlation_id: plan.correlation_id,
        event_type: "rolled_back", risk_level: plan.risk_level, ...actor,
        details: { restored }, before_state: plan.after_state || {}, after_state: plan.before_state || {},
      });
      await busPublish(sb, "action_plan.rolled_back", { action_id: planId, partner_id: partnerId, restored }, plan.correlation_id);
      return json({ plan: updated, restored });
    }

    if (action === "measure") {
      const planId = String(body.plan_id || "");
      const { data: plan } = await sb.from("partner_action_plans").select("*").eq("id", planId).eq("partner_id", partnerId).maybeSingle();
      if (!plan) return json({ error: "plan_not_found" }, 404);
      const { baseline } = await buildContext(sb, partnerId);
      const base: any = plan.baseline || {};
      const delta = (a: number, b: number) => (b ? Number((((a - b) / b) * 100).toFixed(1)) : a > 0 ? 100 : 0);
      const result = {
        revenue_30d: baseline.revenue_30d,
        orders_30d: baseline.orders_30d,
        revenue_change_pct: delta(baseline.revenue_30d, Number(base.revenue_30d || 0)),
        orders_change_pct: delta(baseline.orders_30d, Number(base.orders_30d || 0)),
        measured_at: new Date().toISOString(),
      };
      const { data: updated, error } = await sb.from("partner_action_plans")
        .update({ status: "measured", result, measured_at: new Date().toISOString() })
        .eq("id", planId).eq("partner_id", partnerId).select().single();
      if (error) return json({ error: error.message }, 400);
      await audit(sb, {
        action_id: planId, partner_id: partnerId, correlation_id: plan.correlation_id,
        event_type: "measured", risk_level: plan.risk_level, ...actor, details: result,
      });
      await busPublish(sb, "action_plan.measured", { action_id: planId, partner_id: partnerId, ...result }, plan.correlation_id);
      return json({ plan: updated });
    }

    if (action === "discard") {
      const planId = String(body.plan_id || "");
      const { data: plan } = await sb.from("partner_action_plans").update({ status: "discarded" })
        .eq("id", planId).eq("partner_id", partnerId).select().maybeSingle();
      if (plan) {
        await audit(sb, {
          action_id: planId, partner_id: partnerId, correlation_id: plan.correlation_id,
          event_type: "discarded", risk_level: plan.risk_level, ...actor, details: {},
        });
      }
      return json({ ok: true });
    }

    if (action === "autopilot_run") {
      const { data: settings } = await sb.from("partner_autopilot_settings").select("*").eq("partner_id", partnerId).maybeSingle();
      if (!settings?.enabled) return json({ error: "autopilot_disabled" }, 403);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { count } = await sb.from("partner_action_plans")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId).eq("source", "autopilot").gte("created_at", todayStart.toISOString());
      if ((count ?? 0) >= Number(settings.max_auto_actions_per_day || 3)) {
        return json({ error: "daily_limit_reached", limit: settings.max_auto_actions_per_day }, 429);
      }
      const goal = (settings.goals || [])[0] || "Növeld a bevételemet alacsony kockázatú lépésekkel.";
      const { ctx, baseline } = await buildContext(sb, partnerId);
      const raw = await callAI(PLAN_SYS, `CÉL: ${goal}\n\nCsak alacsony kockázatú lépéseket javasolj.\n\nADATOK:\n${JSON.stringify(ctx)}`);
      let plan: any; try { plan = JSON.parse(raw); } catch { plan = null; }
      if (!plan || !Array.isArray(plan.steps)) return json({ error: "ai_invalid_plan" }, 502);
      const steps = plan.steps.slice(0, 5).map((s: any, i: number) => {
        const st = { idx: i, type: String(s.type || "manual"), title: String(s.title || `Lépés ${i + 1}`), why: String(s.why || ""), impact: String(s.impact || "közepes"), params: s.params || {}, state: "pending", risk: "alacsony" as string };
        st.risk = stepRisk(st); return st;
      });
      const { data: inserted, error } = await sb.from("partner_action_plans").insert({
        partner_id: partnerId, goal, summary: String(plan.summary || "").slice(0, 2000),
        expected_impact: String(plan.expected_impact || "").slice(0, 300),
        risk_level: steps.reduce((m: string, s: any) => RISK_ORDER[s.risk as keyof typeof RISK_ORDER] > RISK_ORDER[m as keyof typeof RISK_ORDER] ? s.risk : m, "alacsony"),
        steps, baseline, status: "proposed", source: "autopilot",
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      await sb.from("partner_autopilot_settings").update({ last_run_at: new Date().toISOString() }).eq("partner_id", partnerId);
      await audit(sb, {
        action_id: inserted.id, partner_id: partnerId, correlation_id: inserted.correlation_id,
        event_type: "autopilot_proposed", risk_level: inserted.risk_level, ...actor, actor_role: "autopilot",
        details: { goal },
      });
      return json({ plan: inserted, note: "Autopilot terv elkészült — az engedélyezett, alacsony kockázatú lépések futtathatók." });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[partner-action-engine]", msg);
    return json({ error: msg }, msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500);
  }
});
