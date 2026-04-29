// AI háttér generálás szövegből — Lovable AI Gateway (Gemini image)
// + emberi/arc/silhouette ellenőrzés vision modellel + auto-újragenerálás
// Kimenet: ai_studio_backgrounds rekord létrehozva

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_MODEL = "google/gemini-3-pro-image-preview";
const VISION_MODEL = "google/gemini-2.5-flash";

const buildPrompt = (userPrompt: string, retryNote: string) => `Ultra-detailed 4K Ultra HD photorealistic background scene for a marketing video: ${userPrompt}.

STRICT REQUIREMENTS:
- Resolution: 3840x2160 (4K UHD), maximum sharpness, crystal clear, zero pixelation, zero compression artifacts, zero blur
- Aspect ratio: 16:9 cinematic widescreen
- Quality: professional commercial photography, shot on Hasselblad / RED camera, 85mm lens, shallow depth of field, perfect focus, HDR, color graded
- Lighting: natural cinematic lighting, golden hour or soft studio light, realistic shadows
- ABSOLUTELY NO people, faces, hands, body parts, mannequins, silhouettes, statues of humans, posters of humans, or human figures of any kind. THIS IS CRITICAL — the image must be COMPLETELY EMPTY of humans.
- Only environment, scenery, atmosphere, mood — empty stage where a person will be composited later
- Composition: balanced, leave the central area uncluttered for subject placement
- Texture: visible fine details (concrete grain, fabric weave, leaf veins, dust particles, light rays)${retryNote}`;

async function generateImage(LOVABLE_API_KEY: string, prompt: string): Promise<string> {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    if (aiRes.status === 429) throw new Error("AI kvóta elfogyott, próbáld később.");
    if (aiRes.status === 402) throw new Error("Lovable AI hitelek elfogytak. Tölts fel a Workspace beállításokban.");
    throw new Error(`AI hiba: ${errText}`);
  }
  const aiJson = await aiRes.json();
  const imageUrl = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl || !imageUrl.startsWith("data:image/")) throw new Error("Nem érkezett kép az AI-tól.");
  return imageUrl;
}

async function detectHuman(LOVABLE_API_KEY: string, dataUrl: string): Promise<{ has_human: boolean; reason: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Does this image contain ANY human figure (person, face, hand, body part, silhouette, mannequin, or statue/poster of a human)? Answer with only one word: YES or NO. Then on a new line briefly state what you see." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    // ha vision hiba, engedjük át (ne blokkoljuk a workflowt)
    return { has_human: false, reason: "vision_check_failed" };
  }
  const j = await res.json();
  const text = (j?.choices?.[0]?.message?.content || "").toString().trim();
  const firstLine = text.split("\n")[0].trim().toUpperCase();
  const has_human = firstLine.startsWith("YES");
  return { has_human, reason: text.slice(0, 200) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, title } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length < 3 || prompt.length > 1000) {
      return new Response(JSON.stringify({ error: "Háttér leírás 3-1000 karakter között kell legyen." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI szolgáltatás nincs beállítva." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // beállítások betöltése
    const { data: settings } = await supabase
      .from("ai_studio_settings")
      .select("bg_human_check_enabled, bg_max_regenerations")
      .limit(1).maybeSingle();
    const checkEnabled = settings?.bg_human_check_enabled ?? true;
    const maxRetries = Math.max(0, Math.min(5, settings?.bg_max_regenerations ?? 2));

    // Generálás + ellenőrzés ciklus
    let dataUrl = "";
    let attempts = 0;
    let lastReason = "";
    const totalAttempts = checkEnabled ? maxRetries + 1 : 1;

    for (let i = 0; i < totalAttempts; i++) {
      attempts = i + 1;
      const retryNote = i > 0
        ? `\n\nRETRY: A previous attempt accidentally included a human figure (${lastReason}). This time, ABSOLUTELY guarantee NO human, face, hand, body, silhouette, mannequin or statue.`
        : "";
      dataUrl = await generateImage(LOVABLE_API_KEY, buildPrompt(prompt, retryNote));

      if (!checkEnabled) break;

      const check = await detectHuman(LOVABLE_API_KEY, dataUrl);
      if (!check.has_human) break;
      lastReason = check.reason;
      console.log(`[bg-gen] human detected, retry ${i + 1}/${maxRetries}: ${check.reason}`);
    }

    // base64 -> bytes
    const base64 = dataUrl.split(",")[1];
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const path = `ai-generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const up = await supabase.storage.from("ai-studio-backgrounds").upload(path, binary, {
      contentType: "image/png",
      upsert: false,
    });
    if (up.error) throw up.error;

    const insert = await supabase.from("ai_studio_backgrounds").insert({
      title: title?.trim() || `AI: ${prompt.slice(0, 60)}`,
      storage_path: path,
      category: "ai_generated",
      ai_prompt: prompt,
      bg_type: "image",
    }).select().single();
    if (insert.error) throw insert.error;

    return new Response(JSON.stringify({
      ok: true,
      background: insert.data,
      attempts,
      had_human_initially: attempts > 1,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
