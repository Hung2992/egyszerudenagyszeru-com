import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";
import { z } from "npm:zod@3";
import { aegisRedact } from "../_shared/aegis.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
async function read(connector: string, secret: string, path: string, body?: object) {
  const key = Deno.env.get(secret);
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !lovable) return { ok: false, status: 503, details: "Kapcsolat nincs konfigurálva" };
  const response = await fetch(`https://connector-gateway.lovable.dev/${connector}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) {
    const details = aegisRedact(text).text;
    console.error(`Social connection [${response.status}]: ${details}`);
    return { ok: false, status: response.status, details };
  }
  const data = JSON.parse(text);
  if (data.error && data.error.code !== "ok") return { ok: false, status: response.status, details: aegisRedact(JSON.stringify(data.error)).text };
  return { ok: true, status: response.status, data };
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;
  if (guard.caller !== "admin") return json({ error: "human_admin_required" }, 403);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const parsed = z.discriminatedUnion("action", [z.object({ action: z.literal("inspect") }), z.object({ action: z.literal("ads_report"), since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })]).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  try {
    if (parsed.data.action === "ads_report") {
      const { since, until } = parsed.data;
      const start = Date.parse(since), end = Date.parse(until);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start > 93 * 86400000) return json({ error: "invalid_date_range" }, 400);
      const account = await read("meta_ads", "META_ADS_API_KEY", "v26.0/act_1752502632475982?fields=name,currency,timezone_name");
      if (!account.ok) return json(account, account.status);
      const params = new URLSearchParams({ fields: "spend,impressions,clicks,inline_link_clicks", time_range: JSON.stringify({ since, until }) });
      const report = await read("meta_ads", "META_ADS_API_KEY", `v26.0/act_1752502632475982/insights?${params}`);
      if (!report.ok) return json(report, report.status);
      return json({ account: account.data, rows: report.data.data ?? [], since, until, checked_at: new Date().toISOString() });
    }
    const [facebook, tiktok, tiktokPosting, linkedin] = await Promise.all([
      read("meta_ads", "META_ADS_API_KEY", "v26.0/act_1752502632475982?fields=id,name,account_status,disable_reason,funding_source_details"),
      read("tiktok", "TIKTOK_API_KEY", "user/info/?fields=open_id,display_name"),
      read("tiktok", "TIKTOK_API_KEY", "post/publish/creator_info/query/", {}),
      read("linkedin", "LINKEDIN_API_KEY", "v2/userinfo"),
    ]);
    return json({ facebook: { ...facebook, account_link: "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1752502632475982", billing_link: "https://business.facebook.com/billing_hub/payment_settings/?asset_id=1752502632475982", page_name: "Horváth Zoltán", inspected_at: new Date().toISOString() }, tiktok, tiktokPosting, linkedin: { ok: linkedin.ok, status: linkedin.status, details: linkedin.details, name: linkedin.data?.name }, inspected_at: new Date().toISOString() });
  } catch (error) { return json({ error: aegisRedact(error instanceof Error ? error.message : "connection_check_failed").text }, 502); }
});