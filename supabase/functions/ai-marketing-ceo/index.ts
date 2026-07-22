// AI Marketing CEO — napi/heti briefing + insights generálás
// Actions: run_daily, run_weekly, generate_insights
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(system: string, user: string, jsonMode = true) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content || "{}";
  return jsonMode ? JSON.parse(content) : content;
}

async function aggregate(sb: any, sinceIso: string) {
  const { data: posts } = await sb.from("social_publish_queue")
    .select("id,platform,status,published_at,content,retry_count")
    .gte("created_at", sinceIso).limit(500);

  const { data: metrics } = await sb.from("social_post_metrics")
    .select("queue_id,platform,impressions,reach,views,likes,comments,shares,clicks,engagement_rate,collected_at")
    .gte("collected_at", sinceIso).order("collected_at", { ascending: false }).limit(1000);

  // latest metric per queue_id
  const latest = new Map<string, any>();
  for (const m of metrics || []) if (!latest.has(m.queue_id)) latest.set(m.queue_id, m);

  const byPlatform: Record<string, any> = {};
  let totalReach = 0, totalImpr = 0, totalClicks = 0, totalEng = 0, totalPub = 0, totalFail = 0;

  for (const p of posts || []) {
    const plat = p.platform;
    byPlatform[plat] ??= { published: 0, failed: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0 };
    if (p.status === "published") { byPlatform[plat].published++; totalPub++; }
    if (p.status === "failed") { byPlatform[plat].failed++; totalFail++; }
    const m = latest.get(p.id);
    if (m) {
      byPlatform[plat].reach += m.reach || 0;
      byPlatform[plat].impressions += m.impressions || 0;
      byPlatform[plat].clicks += m.clicks || 0;
      byPlatform[plat].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
      totalReach += m.reach || 0;
      totalImpr += m.impressions || 0;
      totalClicks += m.clicks || 0;
      totalEng += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
    }
  }

  const { count: newLeads } = await sb.from("partner_leads")
    .select("*", { count: "exact", head: true }).gte("created_at", sinceIso);
  const { count: newPartners } = await sb.from("partners")
    .select("*", { count: "exact", head: true }).gte("created_at", sinceIso);

  return {
    posts: totalPub, failed: totalFail,
    reach: totalReach, impressions: totalImpr,
    clicks: totalClicks, engagement: totalEng,
    ctr: totalImpr ? Number((totalClicks / totalImpr * 100).toFixed(2)) : 0,
    er: totalReach ? Number((totalEng / totalReach * 100).toFixed(2)) : 0,
    byPlatform,
    partnerLeads: newLeads || 0,
    newPartners: newPartners || 0,
    windowStart: sinceIso,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const isCron = url.searchParams.get("cron") === "1" || req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");

    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      isCron ? {} : { global: { headers: { Authorization: auth } } },
    );
    if (!isCron) {
      if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
      const { data: u } = await sb.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "admin_required" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body?.action || (isCron ? "run_daily" : "run_daily"));
    const period = action === "run_weekly" ? "weekly" : "daily";
    const hours = period === "weekly" ? 7 * 24 : 24;
    const since = new Date(Date.now() - hours * 3600_000).toISOString();

    const stats = await aggregate(sb, since);

    if (action === "generate_insights") {
      const ai = await callAI(
        "Te vagy egy közösségi média marketing elemző. JSON tömböt adsz vissza `insights` kulcs alatt. Minden elem: {category, title, insight, recommendation, confidence (0-1), platform (opcionális)}. Magyarul. Max 6 elem, konkrét, számadatokkal alátámasztott.",
        `Az elmúlt ${hours} óra közösségi teljesítménye: ${JSON.stringify(stats)}`,
      );
      const insights = Array.isArray(ai?.insights) ? ai.insights : [];
      const rows = insights.map((i: any) => ({
        scope: "global",
        platform: i.platform || null,
        category: String(i.category || "performance"),
        title: String(i.title || "insight"),
        insight: String(i.insight || ""),
        recommendation: String(i.recommendation || ""),
        confidence: Number(i.confidence ?? 0.5),
        evidence: { window_hours: hours, stats },
      }));
      if (rows.length) await sb.from("ai_marketing_insights").insert(rows);
      return json({ ok: true, generated: rows.length });
    }

    // run_daily / run_weekly briefing
    const ai = await callAI(
      "Te vagy a márka AI Marketing CEO-ja. Készíts rövid vezetői jelentést magyarul. JSON: {summary (2-3 mondat), highlights (max 5 string), recommendations (max 5 {title, action, priority: high|medium|low}), next_actions (max 3 string)}. Konkrét számokkal, üzleti nyelvezettel, sallang nélkül.",
      `Időszak: ${period}. Adatok: ${JSON.stringify(stats)}`,
    );

    const row = {
      briefing_date: new Date().toISOString().slice(0, 10),
      period,
      summary: String(ai?.summary || ""),
      highlights: ai?.highlights || [],
      metrics: stats,
      recommendations: ai?.recommendations || [],
      next_actions: ai?.next_actions || [],
      ai_model: "google/gemini-2.5-flash",
    };

    const { data: saved, error } = await sb.from("ai_marketing_briefings")
      .upsert(row, { onConflict: "briefing_date,period" }).select().single();
    if (error) throw error;

    return json({ ok: true, briefing: saved });
  } catch (e: any) {
    console.error("ai-marketing-ceo error", e);
    return json({ error: e?.message || "server_error" }, 500);
  }
});
