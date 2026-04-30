// AI videó háttér generálás szövegből — Replicate (LTX-Video)
// Bemenet: { prompt, project_id?, aspect_ratio? }
// Kimenet: { ok, storage_path, signed_url }
// Ha project_id meg van adva, beállítja a projekt background_asset_path + background_type = "ai_video" mezőit

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_VIDEO_MODEL =
  "lightricks/ltx-video:8c47da666861d081eeb4d1261853087de23722b187d63be9fc8e5dabb29e8e6f";

async function replicateRun(model: string, input: Record<string, unknown>, token: string): Promise<string> {
  const [, version] = model.split(":");
  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ version, input }),
  });
  let prediction = await resp.json();
  if (!resp.ok) throw new Error(`Replicate hiba: ${JSON.stringify(prediction).slice(0, 400)}`);

  const start = Date.now();
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() - start > 8 * 60 * 1000) throw new Error("Videó generálás timeout (8 perc)");
    await new Promise((r) => setTimeout(r, 4000));
    const pollResp = await fetch(prediction.urls.get, {
      headers: { Authorization: `Token ${token}` },
    });
    prediction = await pollResp.json();
  }
  if (prediction.status !== "succeeded") {
    throw new Error(`Videó generálás sikertelen: ${prediction.error || prediction.status}`);
  }
  const out = prediction.output;
  return Array.isArray(out) ? out[out.length - 1] : out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");

  try {
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN nincs beállítva");

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const prompt: string = (body?.prompt || "").toString().trim();
    const projectId: string | null = body?.project_id || null;
    if (prompt.length < 5 || prompt.length > 1500) {
      throw new Error("Háttér leírás 5-1500 karakter között kell legyen.");
    }

    const fullPrompt = `Cinematic 4K marketing video background scene: ${prompt}.
Vertical 9:16 composition, smooth camera motion (slow pan or push-in), professional cinematography,
photorealistic, golden hour lighting, shallow depth of field, color graded.
ABSOLUTELY NO people, no faces, no humans, no silhouettes — only environment and atmosphere.
Empty stage, central area uncluttered for subject compositing later.`;

    // LTX-Video: width/height pixelben (vertical 9:16 = 768x1344 vagy 704x1216)
    const isVertical = (body?.aspect_ratio || "9:16") === "9:16";
    const videoUrl = await replicateRun(
      REPLICATE_VIDEO_MODEL,
      {
        prompt: fullPrompt,
        negative_prompt: "people, person, human, face, hand, body, silhouette, text, watermark, blurry, low quality",
        width: isVertical ? 704 : 1216,
        height: isVertical ? 1216 : 704,
        num_frames: 121,
        cfg: 3,
        steps: 30,
      },
      REPLICATE_API_TOKEN,
    );

    const r = await fetch(videoUrl);
    if (!r.ok) throw new Error(`Videó letöltés hiba: ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());

    const folder = projectId ? `projects/${projectId}` : `ai-bg-videos/${userData.user.id}`;
    const path = `${folder}/bg-video-${Date.now()}.mp4`;
    const up = await admin.storage.from("ai-studio-projects").upload(path, buf, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (up.error) throw new Error("Feltöltés hiba: " + up.error.message);

    // FIX: ai_video típust állítunk (nem video), hogy az UI helyesen ismerje fel
    if (projectId) {
      await admin.from("ai_studio_projects").update({
        background_type: "ai_video",
        background_asset_path: path,
        background_prompt: prompt,
      }).eq("id", projectId);
    }

    const { data: signed } = await admin.storage.from("ai-studio-projects").createSignedUrl(path, 3600);

    return new Response(JSON.stringify({
      ok: true,
      storage_path: path,
      signed_url: signed?.signedUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
