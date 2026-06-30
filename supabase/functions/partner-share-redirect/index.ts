// Public short-link redirect + click logger. GET /functions/v1/partner-share-redirect?c=XXXX
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("c") || url.pathname.split("/").pop();
  if (!code) return new Response("Missing code", { status: 400, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: link } = await supabase
    .from("partner_share_links")
    .select("id, partner_id, target_url, utm_source, utm_medium, utm_campaign, click_count, active")
    .eq("code", code)
    .maybeSingle();

  if (!link || !link.active) {
    return new Response("Link not found", { status: 404, headers: corsHeaders });
  }

  // Build destination with UTM
  let dest = link.target_url;
  try {
    const d = new URL(dest);
    if (link.utm_source) d.searchParams.set("utm_source", link.utm_source);
    if (link.utm_medium) d.searchParams.set("utm_medium", link.utm_medium);
    if (link.utm_campaign) d.searchParams.set("utm_campaign", link.utm_campaign);
    d.searchParams.set("ref", code);
    dest = d.toString();
  } catch { /* keep raw */ }

  // Log click (fire-and-forget)
  const ua = req.headers.get("user-agent") || "";
  const referrer = req.headers.get("referer") || "";
  const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
  const device = /mobile/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
  const source = url.searchParams.get("s") || (link as any).utm_source || "direct";

  supabase.from("partner_share_clicks").insert({
    share_link_id: link.id,
    partner_id: link.partner_id,
    source,
    referrer,
    user_agent: ua.slice(0, 500),
    country,
    device_type: device,
  }).then(() => {});

  supabase.from("partner_share_links").update({
    click_count: (link.click_count || 0) + 1,
    last_clicked_at: new Date().toISOString(),
  }).eq("id", link.id).then(() => {});

  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: dest } });
});
