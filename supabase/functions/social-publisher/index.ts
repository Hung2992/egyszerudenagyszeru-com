// Social Auto-Publisher — Facebook, Instagram, TikTok
// Actions:
//   process_queue  -> cron/tick: publish everything due
//   publish_now    -> publish one queue item immediately (admin)
//   enqueue        -> insert new queue item (admin)
//   refresh_metrics -> pull latest metrics for a post
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

interface Item {
  id: string;
  platform: "facebook" | "instagram" | "tiktok";
  content: string;
  media_urls: string[];
  media_type: string;
  hashtags: string[];
  retry_count: number;
  max_retries: number;
}

interface Settings {
  facebook_page_id: string | null;
  instagram_business_id: string | null;
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  tiktok_enabled: boolean;
  autopilot_enabled: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  default_hashtags: string[];
}

function buildText(item: Item, defaults: string[]): string {
  const tags = [...item.hashtags, ...defaults].filter(Boolean);
  const tagLine = tags.length ? "\n\n" + tags.map(t => (t.startsWith("#") ? t : `#${t}`)).join(" ") : "";
  return `${item.content}${tagLine}`.slice(0, 2200);
}

async function logEvent(sb: any, queue_id: string, event_type: string, platform: string | null, payload: any) {
  try { await sb.from("social_publish_events").insert({ queue_id, event_type, platform, payload }); }
  catch (e) { console.warn("event log fail", e); }
}

// ============ FACEBOOK ============
async function publishFacebook(item: Item, s: Settings, text: string): Promise<{ id: string; permalink: string | null }> {
  const token = Deno.env.get("META_PAGE_ACCESS_TOKEN");
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN missing");
  if (!s.facebook_page_id) throw new Error("facebook_page_id not configured");

  const hasImage = item.media_urls.length > 0 && item.media_type !== "text";
  const endpoint = hasImage
    ? `${META_GRAPH}/${s.facebook_page_id}/photos`
    : `${META_GRAPH}/${s.facebook_page_id}/feed`;

  const body: Record<string, string> = { access_token: token };
  if (hasImage) { body.url = item.media_urls[0]; body.caption = text; }
  else { body.message = text; }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`FB: ${j.error?.message || res.status}`);
  const postId = j.post_id || j.id;
  return { id: postId, permalink: postId ? `https://facebook.com/${postId}` : null };
}

// ============ INSTAGRAM ============
async function publishInstagram(item: Item, s: Settings, text: string): Promise<{ id: string; permalink: string | null }> {
  const token = Deno.env.get("META_PAGE_ACCESS_TOKEN");
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN missing");
  const igId = s.instagram_business_id;
  if (!igId) throw new Error("instagram_business_id not configured");
  if (!item.media_urls.length) throw new Error("Instagram requires media");

  const isVideo = item.media_type === "video";
  const mediaParams: Record<string, string> = {
    access_token: token,
    caption: text,
  };
  if (isVideo) { mediaParams.video_url = item.media_urls[0]; mediaParams.media_type = "REELS"; }
  else { mediaParams.image_url = item.media_urls[0]; }

  // Step 1: create container
  const cr = await fetch(`${META_GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(mediaParams),
  });
  const cj = await cr.json();
  if (!cr.ok || cj.error) throw new Error(`IG container: ${cj.error?.message || cr.status}`);
  const containerId = cj.id;

  // For video: poll status
  if (isVideo) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const sr = await fetch(`${META_GRAPH}/${containerId}?fields=status_code&access_token=${token}`);
      const sj = await sr.json();
      if (sj.status_code === "FINISHED") break;
      if (sj.status_code === "ERROR") throw new Error("IG video processing failed");
    }
  }

  // Step 2: publish
  const pr = await fetch(`${META_GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: token, creation_id: containerId }),
  });
  const pj = await pr.json();
  if (!pr.ok || pj.error) throw new Error(`IG publish: ${pj.error?.message || pr.status}`);

  // fetch permalink
  let permalink: string | null = null;
  try {
    const lr = await fetch(`${META_GRAPH}/${pj.id}?fields=permalink&access_token=${token}`);
    const lj = await lr.json();
    permalink = lj.permalink || null;
  } catch {/* ignore */}
  return { id: pj.id, permalink };
}

// ============ TIKTOK ============
async function publishTikTok(item: Item, text: string): Promise<{ id: string; permalink: string | null }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const tkKey = Deno.env.get("TIKTOK_API_KEY");
  if (!lovableKey || !tkKey) throw new Error("TikTok connector not configured");
  if (!item.media_urls.length || item.media_type !== "video") throw new Error("TikTok requires a video URL");

  const initRes = await fetch(`${TIKTOK_GW}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tkKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: text.slice(0, 150),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: item.media_urls[0],
      },
    }),
  });
  const initJson = await initRes.json();
  if (!initRes.ok || initJson.error?.code !== "ok") {
    throw new Error(`TikTok init: ${initJson.error?.message || initRes.status}`);
  }
  const publishId = initJson.data?.publish_id;
  return { id: publishId, permalink: null };
}

// ============ MAIN ============
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

    let uid: string | null = null;
    if (!isCron) {
      if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
      const { data: u } = await sb.auth.getUser();
      uid = u?.user?.id || null;
      if (!uid) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "admin_required" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body?.action || (isCron ? "process_queue" : ""));

    const { data: settings } = await sb.from("social_auto_publish_settings").select("*").limit(1).maybeSingle();
    const s: Settings = settings || {} as Settings;

    // ---- ENQUEUE ----
    if (action === "enqueue") {
      const { platform, content, media_urls = [], media_type = "image", hashtags = [], scheduled_at, campaign_id, source, source_ref, autopilot } = body;
      if (!platform || !content) return json({ error: "platform+content required" }, 400);
      const { data: ins, error } = await sb.from("social_publish_queue").insert({
        platform, content, media_urls, media_type, hashtags,
        scheduled_at: scheduled_at || new Date().toISOString(),
        campaign_id: campaign_id || null,
        source: source || "manual", source_ref: source_ref || null,
        autopilot: !!autopilot,
        approved_by: autopilot ? uid : null,
        approved_at: autopilot ? new Date().toISOString() : null,
        created_by: uid,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, item: ins });
    }

    // ---- PROCESS QUEUE ----
    if (action === "process_queue" || action === "publish_now") {
      let query = sb.from("social_publish_queue").select("*").eq("status", "pending").lte("scheduled_at", new Date().toISOString());
      if (action === "publish_now" && body.id) query = sb.from("social_publish_queue").select("*").eq("id", body.id);

      const { data: items } = await query.order("scheduled_at", { ascending: true }).limit(20);
      const results: any[] = [];

      for (const raw of (items || [])) {
        const item = raw as Item;

        // Platform gate
        if (action === "process_queue") {
          if (item.platform === "facebook" && !s.facebook_enabled) { results.push({ id: item.id, skipped: "fb_disabled" }); continue; }
          if (item.platform === "instagram" && !s.instagram_enabled) { results.push({ id: item.id, skipped: "ig_disabled" }); continue; }
          if (item.platform === "tiktok" && !s.tiktok_enabled) { results.push({ id: item.id, skipped: "tt_disabled" }); continue; }
          // Quiet hours (Europe/Budapest ~ UTC+1/2, cron-safe: use UTC hour + 1)
          const hr = (new Date().getUTCHours() + 1) % 24;
          const qs = s.quiet_hours_start, qe = s.quiet_hours_end;
          const inQuiet = qs < qe ? (hr >= qs && hr < qe) : (hr >= qs || hr < qe);
          if (inQuiet) { results.push({ id: item.id, skipped: "quiet_hours" }); continue; }
        }

        await sb.from("social_publish_queue").update({ status: "processing" }).eq("id", item.id);
        await logEvent(sb, item.id, "processing_started", item.platform, {});

        try {
          const text = buildText(item, s.default_hashtags || []);
          let out: { id: string; permalink: string | null };
          if (item.platform === "facebook") out = await publishFacebook(item, s, text);
          else if (item.platform === "instagram") out = await publishInstagram(item, s, text);
          else if (item.platform === "tiktok") out = await publishTikTok(item, text);
          else throw new Error(`unknown platform: ${item.platform}`);

          await sb.from("social_publish_queue").update({
            status: "published",
            external_post_id: out.id,
            external_permalink: out.permalink,
            published_at: new Date().toISOString(),
            error_message: null,
          }).eq("id", item.id);
          await logEvent(sb, item.id, "published", item.platform, out);
          results.push({ id: item.id, ok: true, external_id: out.id });
        } catch (e: any) {
          const msg = e?.message || String(e);
          const nextRetry = item.retry_count + 1;
          const failed = nextRetry >= item.max_retries;
          await sb.from("social_publish_queue").update({
            status: failed ? "failed" : "pending",
            retry_count: nextRetry,
            error_message: msg,
            scheduled_at: failed ? undefined : new Date(Date.now() + Math.pow(2, nextRetry) * 60_000).toISOString(),
          }).eq("id", item.id);
          await logEvent(sb, item.id, failed ? "failed" : "retry_scheduled", item.platform, { error: msg, retry: nextRetry });
          results.push({ id: item.id, ok: false, error: msg });
        }
      }
      return json({ ok: true, processed: results.length, results });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    console.error("social-publisher error", e);
    return json({ error: e?.message || "server_error" }, 500);
  }
});
