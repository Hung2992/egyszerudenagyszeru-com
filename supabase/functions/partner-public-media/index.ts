// Returns short-lived signed URLs for partner media that is referenced by a
// published storefront or an active product. Replaces anonymous storage reads.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BUCKETS = new Set(["partner-storefront-media", "partner-product-images"]);
const SF_FIELDS = ["hero_image_url", "banner_url", "logo_url", "og_image_url", "section1_image_url", "section2_image_url"];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function isReferenced(path: string): Promise<boolean> {
  const { count: pc } = await admin.from("partner_products").select("id", { count: "exact", head: true })
    .eq("status", "active").contains("images", JSON.stringify([path]));
  if ((pc ?? 0) > 0) return true;
  const or = SF_FIELDS.map((f) => `${f}.eq.${JSON.stringify(path)}`).join(",");
  const { count: sc } = await admin.from("partner_storefronts").select("id", { count: "exact", head: true })
    .eq("is_published", true).or(or);
  return (sc ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const bucket = body?.bucket, paths = body?.paths;
    if (typeof bucket !== "string" || !BUCKETS.has(bucket) || !Array.isArray(paths) || paths.length === 0 || paths.length > 50) {
      return json({ error: "invalid request" }, 400);
    }
    const urls: Record<string, string> = {};
    for (const p of paths) {
      if (typeof p !== "string" || p.length > 500 || p.includes("..") || /^https?:/.test(p)) continue;
      if (!(await isReferenced(p))) continue;
      const { data } = await admin.storage.from(bucket).createSignedUrl(p, 60 * 60 * 24);
      if (data?.signedUrl) urls[p] = data.signedUrl;
    }
    return json({ urls });
  } catch (_e) {
    return json({ error: "internal error" }, 500);
  }
});
