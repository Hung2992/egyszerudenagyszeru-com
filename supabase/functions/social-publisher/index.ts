// Social Auto-Publisher — Facebook, Instagram, TikTok
// Actions:
//   process_queue  -> cron/tick: publish everything due
//   publish_now    -> publish one queue item immediately (admin)
//   enqueue        -> insert new queue item (admin)
//   refresh_metrics -> pull latest metrics for a post
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/internal-auth.ts";
import { publish as busPublish } from "../_shared/agent-bus.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { aegisRedact, aegisInput } from "../_shared/aegis.ts";
import { providerOutcome, canCallProvider } from "../_shared/social-governance.ts";

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
  approved_by: string | null;
  test_only: boolean;
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

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("process_queue") }),
  z.object({ action: z.literal("test_publish"), id: z.string().uuid() }),
  z.object({ action: z.literal("publish_now"), id: z.string().uuid() }),
  z.object({ action: z.literal("enqueue"), platform: z.enum(["facebook", "instagram", "tiktok"]), test_only: z.boolean().default(false), content: z.string().trim().min(1).max(20000), media_urls: z.array(z.string().url()).max(10).default([]), media_type: z.enum(["text", "image", "video", "carousel"]).default("text"), hashtags: z.array(z.string().max(100)).max(50).default([]), scheduled_at: z.string().datetime({ offset: true }).optional(), campaign_id: z.string().uuid().optional(), source: z.string().max(100).optional(), source_ref: z.string().uuid().optional() }),
]);

// ============ FACEBOOK ============
async function publishFacebook(item: Item, s: Settings, text: string, preflight: () => Promise<void>): Promise<{ id: string; permalink: string | null }> {
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

  await preflight();
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
async function publishInstagram(item: Item, s: Settings, text: string, preflight: () => Promise<void>): Promise<{ id: string; permalink: string | null }> {
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
  await preflight();
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
  await preflight();
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
async function publishTikTok(item: Item, text: string, preflight: () => Promise<void>): Promise<{ id: string; permalink: string | null }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const tkKey = Deno.env.get("TIKTOK_API_KEY");
  if (!lovableKey || !tkKey) throw new Error("TikTok connector not configured");
  if (!item.media_urls.length || item.media_type !== "video") throw new Error("TikTok requires a video URL");

  await preflight();
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
    const isCron = await isInternalCall(req);

    const auth = req.headers.get("Authorization") || "";
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!backendUrl || !serviceKey || !anonKey) return json({ error: "configuration_missing" }, 503);
    const sb = createClient(backendUrl, serviceKey);
    const caller = createClient(backendUrl, anonKey, { global: { headers: { Authorization: auth } } });

    let uid: string | null = null;
    if (!isCron) {
      if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
      const { data: u } = await caller.auth.getUser();
      uid = u?.user?.id || null;
      if (!uid) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await caller.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "admin_required" }, 403);
    }

    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const action = body.action;
    if (body.action === "test_publish") {
      if (!uid || isCron) return json({ error: "human_admin_required" }, 403);
      const { data, error } = await caller.rpc("social_test_run", { _id: body.id });
      return error ? json({ error: error.message }, 400) : json(data);
    }
    const { data: settings, error: settingsError } = await sb.from("social_auto_publish_settings").select("*").limit(1).maybeSingle();
    if (settingsError || !settings) return json({ error: "settings_unavailable" }, 503);
    const s: Settings = settings;

    if (body.action === "enqueue") {
      if (isCron || !uid) return json({ error: "human_admin_required" }, 403);
      const safety = aegisRedact(body.content);
      if (safety.findings.length || aegisInput(body.content).length) return json({ error: "aegis_review_required" }, 422);
      const { data: ins, error } = await caller.from("social_publish_queue").insert({
        test_only: body.test_only, platform: body.platform, content: body.content, media_urls: body.media_urls, media_type: body.media_type, hashtags: body.hashtags,
        scheduled_at: body.scheduled_at || new Date().toISOString(), campaign_id: body.campaign_id || null,
        source: body.source || "manual", source_ref: body.source_ref || null, autopilot: false, requires_approval: true, created_by: uid,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, item: ins });
    }

    // ---- PROCESS QUEUE ----
    if (action === "process_queue" || action === "publish_now") {
      let query = sb.from("social_publish_queue").select("*").eq("status", "pending").lte("scheduled_at", new Date().toISOString());
      if (action === "publish_now" && body.action === "publish_now") query = sb.from("social_publish_queue").select("*").eq("id", body.action === "publish_now" ? body.id : "").eq("status", "pending");

      const { data: items } = await query.order("scheduled_at", { ascending: true }).limit(20);
      const results: any[] = [];

      for (const raw of (items || [])) {
        let item = raw as Item;

        const { data: claim, error: claimError } = await sb.rpc("social_dispatch_claim", { _id: item.id, _actor: uid ?? item.approved_by });
        if (claimError) { results.push({ id: item.id, ok: false, error: claimError.message }); continue; }
        if (!claim?.allowed || !claim.token) { results.push({ id: item.id, skipped: claim?.reason || "gate_unavailable" }); continue; }
        const token = claim.token;
        const preflight = async () => {
          const { data: allowed, error } = await sb.rpc("social_authorized_preflight", { _id: item.id, _token: token });
          if (error || allowed !== true) throw new Error("AEGIS: execution stopped before provider call");
        };
        try {
          const { data: snapshot, error: snapshotError } = await sb.rpc("social_execution_payload", { _id: item.id, _token: token });
          if (snapshotError || !snapshot?.item || !snapshot.settings) throw new Error("AEGIS: approved snapshot unavailable");
          item = snapshot.item as Item;
          const { data: permission, error: permissionError } = await sb.rpc("social_has_permission", { _user: uid ?? item.approved_by, _mode: "live" });
          if (permissionError || !canCallProvider(item.test_only, permission === true)) throw new Error("publication_permission_required");
          const approvedSettings = snapshot.settings as Settings;
          const text = buildText(item, approvedSettings.default_hashtags || []);
          if (aegisRedact(text).findings.length || aegisInput(text).length) throw new Error("AEGIS: output review required");
          let out: { id: string; permalink: string | null };
          if (item.platform === "facebook") out = await publishFacebook(item, approvedSettings, text, preflight);
          else if (item.platform === "instagram") out = await publishInstagram(item, approvedSettings, text, preflight);
          else if (item.platform === "tiktok") out = await publishTikTok(item, text, preflight);
          else throw new Error(`unknown platform: ${item.platform}`);

          if (!out.id) throw new Error("Provider receipt missing; manual reconciliation required");
          const state = providerOutcome(item.platform);
          const { error: receiptError } = await sb.rpc("social_finish", { _id: item.id, _token: token, _state: state, _external_id: out.id, _permalink: out.permalink });
          if (receiptError) throw new Error("Receipt persistence failed; manual reconciliation required");
          await busPublish(sb, {
            source: "social-publisher",
            eventType: `social.${state === "published" ? "published" : "accepted"}.${item.platform}`,
            payload: { queue_id: item.id, external_id: out.id, permalink: out.permalink, platform: item.platform },
            severity: "info",
          });
          results.push({ id: item.id, ok: true, state, external_id: out.id });
        } catch (e: any) {
          const msg = e?.message || String(e);
          const safeError = aegisRedact(msg).text;
          const { error: finishError } = await sb.rpc("social_finish", { _id: item.id, _token: token, _state: "failed", _error: safeError });
          if (finishError) console.error("social receipt reconciliation required", item.id);
          results.push({ id: item.id, ok: false, error: aegisRedact(msg).text });
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
