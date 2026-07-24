// AI Agent Bus Sync — percenkénti aggregátor
// Összegyűjti a fontos friss adatokat az összes ügynök tábláiból és beírja
// az ai_agent_bus_context / ai_agent_bus_events táblákba, hogy minden ügynök
// egyetlen forrásból tudja lekérdezni a másik munkájának eredményét.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { setContext, publish } from "../_shared/agent-bus.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const since = new Date(Date.now() - 5 * 60_000).toISOString(); // utolsó 5 perc
    const summary: Record<string, number> = {};

    // 1) SHOP: friss rendelések + top termékek
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id,total_amount,status,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    await setContext(supabase, {
      namespace: "shop", key: "recent_orders",
      value: { count: recentOrders?.length ?? 0, orders: recentOrders ?? [], window_minutes: 5 },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 600,
    });
    summary.recent_orders = recentOrders?.length ?? 0;

    // 2) MARKETING: friss AI insight-ok
    const { data: insights } = await supabase
      .from("ai_marketing_insights").select("*")
      .order("created_at", { ascending: false }).limit(10);
    await setContext(supabase, {
      namespace: "marketing", key: "latest_insights",
      value: { insights: insights ?? [] },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 3600,
    });
    summary.marketing_insights = insights?.length ?? 0;

    // 3) SOCIAL: publish queue állapot
    const { data: queue } = await supabase
      .from("social_publish_queue").select("id,platform,status,scheduled_at,ai_score")
      .in("status", ["pending", "queued", "processing"])
      .order("scheduled_at", { ascending: true }).limit(20);
    await setContext(supabase, {
      namespace: "social", key: "pending_queue",
      value: { count: queue?.length ?? 0, items: queue ?? [] },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 300,
    });
    summary.social_pending = queue?.length ?? 0;

    // 4) SOCIAL METRICS: legutóbbi teljesítmény
    const { data: metrics } = await supabase
      .from("social_post_metrics").select("platform,impressions,reach,engagement,collected_at")
      .gte("collected_at", new Date(Date.now() - 24*3600_000).toISOString())
      .order("collected_at", { ascending: false }).limit(50);
    const byPlatform: Record<string, {impr:number;reach:number;eng:number;n:number}> = {};
    (metrics ?? []).forEach((m: any) => {
      const p = m.platform || "unknown";
      byPlatform[p] = byPlatform[p] || {impr:0,reach:0,eng:0,n:0};
      byPlatform[p].impr += Number(m.impressions||0);
      byPlatform[p].reach += Number(m.reach||0);
      byPlatform[p].eng += Number(m.engagement||0);
      byPlatform[p].n++;
    });
    await setContext(supabase, {
      namespace: "social", key: "metrics_24h",
      value: { by_platform: byPlatform, total_samples: metrics?.length ?? 0 },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 900,
    });

    // 5) PARTNER: friss leadek + outreach
    const { data: leads } = await supabase
      .from("partner_leads").select("id,company_name,ai_score,status,created_at")
      .gte("created_at", new Date(Date.now() - 24*3600_000).toISOString())
      .order("ai_score", { ascending: false }).limit(20);
    await setContext(supabase, {
      namespace: "partner", key: "top_leads_24h",
      value: { count: leads?.length ?? 0, leads: leads ?? [] },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 1800,
    });
    summary.top_leads = leads?.length ?? 0;

    const { data: outreach } = await supabase
      .from("partner_outreach").select("status,channel,variant,created_at")
      .gte("created_at", new Date(Date.now() - 24*3600_000).toISOString());
    const outStats: Record<string, number> = {};
    (outreach ?? []).forEach((o: any) => {
      const k = `${o.channel}:${o.status}`;
      outStats[k] = (outStats[k]||0)+1;
    });
    await setContext(supabase, {
      namespace: "partner", key: "outreach_24h",
      value: { total: outreach?.length ?? 0, breakdown: outStats },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 1800,
    });

    // 6) SHOPPING: friss beszélgetések (intent jelek)
    const { data: convos } = await supabase
      .from("ai_shopping_conversations").select("id,created_at")
      .gte("created_at", since).limit(50);
    await setContext(supabase, {
      namespace: "shop", key: "active_intent_signals",
      value: { conversations_last_5min: convos?.length ?? 0 },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 300,
    });

    // 7) AI META: aktív stratégiák
    const { data: strategies } = await supabase
      .from("ai_response_strategies").select("name,is_active,success_rate,total_uses")
      .eq("is_active", true).order("success_rate", { ascending: false }).limit(10);
    await setContext(supabase, {
      namespace: "meta", key: "top_strategies",
      value: { strategies: strategies ?? [] },
      producedBy: "ai-agent-bus-sync", ttlSeconds: 3600,
    });

    // 8) HEARTBEAT event — mindenki lássa hogy friss az adat
    await publish(supabase, {
      source: "ai-agent-bus-sync",
      eventType: "bus.sync.tick",
      payload: { summary, synced_at: new Date().toISOString() },
      severity: "info",
    });

    // 9) Takarítás: lejárt context sorok törlése
    await supabase.from("ai_agent_bus_context")
      .delete().not("expires_at", "is", null).lt("expires_at", new Date().toISOString());
    // Régi eventek (7 napnál régebbi) törlése
    await supabase.from("ai_agent_bus_events")
      .delete().lt("created_at", new Date(Date.now() - 7*24*3600_000).toISOString());

    return json({ ok: true, summary, synced_at: new Date().toISOString() });
  } catch (e) {
    console.error("[ai-agent-bus-sync] error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
