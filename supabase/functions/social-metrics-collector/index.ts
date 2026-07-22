// Social Metrics Collector — publikált posztok teljesítménymérése
// Actions: collect_all (cron), collect_one (admin)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const META_GRAPH = "https://graph.facebook.com/v21.0";
const TIKTOK_GW = "https://connector-gateway.lovable.dev/tiktok";

async function fetchMetaInsights(externalId: string, isIg: boolean, token: string) {
  try {
    const metrics = isIg
      ? "impressions,reach,likes,comments,shares,saved,plays"
      : "post_impressions,post_impressions_unique,post_reactions_by_type_total,post_clicks";
    const url = `${META_GRAPH}/${externalId}/insights?metric=${metrics}&access_token=${token}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok || j.error) return null;
    const map: Record<string, number> = {};
    for (const item of j.data || []) {
      const v = item.values?.[0]?.value;
      if (typeof v === "number") map[item.name] = v;
      else if (v && typeof v === "object") {
        map[item.name] = Object.values(v).reduce((a: number, b: any) => a + Number(b || 0), 0);
      }
    }
    return isIg
      ? {
          impressions: map.impressions || 0,
          reach: map.reach || 0,
          views: map.plays || 0,
          likes: map.likes || 0,
          comments: map.comments || 0,
          shares: map.shares || 0,
          saves: map.saved || 0,
          raw: j,
        }
      : {
          impressions: map.post_impressions || 0,
          reach: map.post_impressions_unique || 0,
          likes: map.post_reactions_by_type_total || 0,
          clicks: map.post_clicks || 0,
          raw: j,
        };
  } catch (e) {
    console.warn("meta insights fail", e);
    return null;
  }
}

async function fetchTikTokMetrics(publishId: string) {
  try {
    const lk = Deno.env.get("LOVABLE_API_KEY");
    const tk = Deno.env.get("TIKTOK_API_KEY");
    if (!lk || !tk) return null;
    const r = await fetch(`${TIKTOK_GW}/post/publish/status/fetch/?publish_id=${publishId}`, {
      headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": tk },
    });
    const j = await r.json();
    if (!r.ok) return null;
    return { raw: j };
  } catch { return null; }
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
    const singleId = body?.id;

    let q = sb.from("social_publish_queue")
      .select("id,platform,external_post_id,published_at")
      .eq("status", "published")
      .not("external_post_id", "is", null);
    if (singleId) q = q.eq("id", singleId);
    else q = q.gte("published_at", new Date(Date.now() - 14 * 24 * 3600_000).toISOString()).limit(50);

    const { data: posts } = await q;
    const token = Deno.env.get("META_PAGE_ACCESS_TOKEN");
    const results: any[] = [];

    for (const p of posts || []) {
      let m: any = null;
      if (p.platform === "facebook" && token) m = await fetchMetaInsights(p.external_post_id, false, token);
      else if (p.platform === "instagram" && token) m = await fetchMetaInsights(p.external_post_id, true, token);
      else if (p.platform === "tiktok") m = await fetchTikTokMetrics(p.external_post_id);

      if (!m) { results.push({ id: p.id, skipped: true }); continue; }

      const impressions = m.impressions || 0;
      const reach = m.reach || 0;
      const eng = (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
      const er = reach ? Number((eng / reach * 100).toFixed(2)) : null;

      await sb.from("social_post_metrics").insert({
        queue_id: p.id, platform: p.platform, external_post_id: p.external_post_id,
        impressions, reach, views: m.views || 0,
        likes: m.likes || 0, comments: m.comments || 0, shares: m.shares || 0,
        saves: m.saves || 0, clicks: m.clicks || 0, link_clicks: m.clicks || 0,
        engagement_rate: er, raw_payload: m.raw || {},
      });
      results.push({ id: p.id, ok: true, impressions, reach, er });
    }

    return json({ ok: true, collected: results.length, results });
  } catch (e: any) {
    console.error("metrics-collector error", e);
    return json({ error: e?.message || "server_error" }, 500);
  }
});
