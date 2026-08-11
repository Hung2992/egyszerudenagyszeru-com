// AI intézkedés motor: elemzés → terv → jóváhagyás → végrehajtás → mérés.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

async function executeStep(sb: any, partnerId: string, storefrontId: string | null, step: any) {
  const p = step?.params || {};
  switch (step?.type) {
    case "reprice": {
      const ids: string[] = Array.isArray(p.product_ids) ? p.product_ids.slice(0, 30) : [];
      const pct = Math.min(25, Math.max(5, Number(p.discount_pct) || 10));
      if (!ids.length) return { ok: false, message: "Nincs kiválasztott termék." };
      const { data: prods } = await sb.from("partner_products").select("id,price_huf,compare_price_huf").eq("partner_id", partnerId).in("id", ids);
      let n = 0;
      for (const pr of prods || []) {
        const old = Number(pr.price_huf || 0);
        if (!old) continue;
        const next = Math.max(1, Math.round((old * (100 - pct)) / 100 / 10) * 10);
        const { error } = await sb.from("partner_products")
          .update({ price_huf: next, compare_price_huf: pr.compare_price_huf || old })
          .eq("id", pr.id).eq("partner_id", partnerId);
        if (!error) n++;
      }
      return { ok: n > 0, message: `${n} termék újraárazva -${pct}%.` };
    }
    case "campaign": {
      const { error } = await sb.from("partner_marketing_campaigns").insert({
        partner_id: partnerId,
        platform: String(p.platform || "facebook"),
        title: String(p.title || step.title || "AI kampány").slice(0, 200),
        body: String(p.body || "").slice(0, 3000),
        cta_text: p.cta_text ? String(p.cta_text).slice(0, 80) : null,
        status: "draft",
        ai_model: "google/gemini-3.5-flash",
      });
      return { ok: !error, message: error ? error.message : "Kampány piszkozat létrehozva." };
    }
    case "abtest": {
      const { error } = await sb.from("partner_ab_tests").insert({
        partner_id: partnerId,
        storefront_id: storefrontId,
        name: String(p.name || step.title || "AI A/B teszt").slice(0, 200),
        test_type: String(p.test_type || "hero"),
        target_field: String(p.target_field || "hero_title"),
        variant_a: p.variant_a || {},
        variant_b: p.variant_b || {},
        status: "draft",
      });
      return { ok: !error, message: error ? error.message : "A/B teszt piszkozat létrehozva." };
    }
    case "workflow": {
      const { error } = await sb.from("partner_workflows").insert({
        partner_id: partnerId,
        name: String(p.name || step.title || "AI automatizmus").slice(0, 200),
        natural_language: String(p.natural_language || step.why || "").slice(0, 2000),
        trigger_event: String(p.trigger_event || "order_created"),
        steps: [],
        is_active: false,
      });
      return { ok: !error, message: error ? error.message : "Automatizmus létrehozva (inaktív)." };
    }
    default:
      return { ok: true, message: "Teendő rögzítve (kézi lépés)." };
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

    if (action === "propose") {
      const goal = String(body.goal || "Növeld a bevételemet.").slice(0, 500);
      const { ctx, baseline } = await buildContext(sb, partnerId);
      const raw = await callAI(PLAN_SYS, `CÉL: ${goal}\n\nADATOK:\n${JSON.stringify(ctx)}`);
      let plan: any;
      try { plan = JSON.parse(raw); } catch { plan = null; }
      if (!plan || !Array.isArray(plan.steps)) return json({ error: "ai_invalid_plan" }, 502);
      const steps = plan.steps.slice(0, 5).map((s: any, i: number) => ({
        idx: i, type: String(s.type || "manual"), title: String(s.title || `Lépés ${i + 1}`),
        why: String(s.why || ""), impact: String(s.impact || "közepes"), params: s.params || {},
        state: "pending",
      }));
      const { data: inserted, error } = await sb.from("partner_action_plans").insert({
        partner_id: partnerId, goal,
        summary: String(plan.summary || "").slice(0, 2000),
        expected_impact: String(plan.expected_impact || "").slice(0, 300),
        risk_level: ["alacsony", "közepes", "magas"].includes(plan.risk_level) ? plan.risk_level : "alacsony",
        steps, baseline, status: "proposed",
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ plan: inserted });
    }

    if (action === "approve") {
      const planId = String(body.plan_id || "");
      const { data: plan } = await sb.from("partner_action_plans").select("*").eq("id", planId).eq("partner_id", partnerId).maybeSingle();
      if (!plan) return json({ error: "plan_not_found" }, 404);
      if (plan.status === "executed") return json({ plan });
      const { storefrontId } = await buildContext(sb, partnerId);
      const log: any[] = [];
      const steps = Array.isArray(plan.steps) ? [...plan.steps] : [];
      for (const step of steps) {
        try {
          const r = await executeStep(sb, partnerId, storefrontId, step);
          step.state = r.ok ? "done" : "failed";
          step.result = r.message;
          log.push({ at: new Date().toISOString(), step: step.title, ...r });
        } catch (e) {
          step.state = "failed";
          step.result = e instanceof Error ? e.message : "hiba";
          log.push({ at: new Date().toISOString(), step: step.title, ok: false, message: step.result });
        }
      }
      const { data: updated, error } = await sb.from("partner_action_plans")
        .update({ status: "executed", steps, execution_log: log, approved_at: new Date().toISOString(), executed_at: new Date().toISOString() })
        .eq("id", planId).eq("partner_id", partnerId).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ plan: updated });
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
      return json({ plan: updated });
    }

    if (action === "discard") {
      const planId = String(body.plan_id || "");
      await sb.from("partner_action_plans").update({ status: "discarded" }).eq("id", planId).eq("partner_id", partnerId);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[partner-action-engine]", msg);
    return json({ error: msg }, msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500);
  }
});
