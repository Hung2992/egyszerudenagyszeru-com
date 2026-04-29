// AI háttér generálás szövegből — Lovable AI Gateway (Gemini image)
// Bemenet: prompt (magyar leírás), title (opcionális)
// Kimenet: ai_studio_backgrounds rekord létrehozva, image_url visszaadva

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Háttér-orientált prompt — 4K Ultra HD, 16:9, NINCS ember
    const fullPrompt = `Ultra-detailed 4K Ultra HD photorealistic background scene for a marketing video: ${prompt}.

STRICT REQUIREMENTS:
- Resolution: 3840x2160 (4K UHD), maximum sharpness, crystal clear, zero pixelation, zero compression artifacts, zero blur
- Aspect ratio: 16:9 cinematic widescreen
- Quality: professional commercial photography, shot on Hasselblad / RED camera, 85mm lens, shallow depth of field, perfect focus, HDR, color graded
- Lighting: natural cinematic lighting, golden hour or soft studio light, realistic shadows
- ABSOLUTELY NO people, faces, hands, body parts, mannequins, silhouettes or human figures of any kind
- Only environment, scenery, atmosphere, mood — empty stage where a person will be composited later
- Composition: balanced, leave the central area uncluttered for subject placement
- Texture: visible fine details (concrete grain, fabric weave, leaf veins, dust particles, light rays)`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI kvóta elfogyott, próbáld később." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI hitelek elfogytak. Tölts fel a Workspace beállításokban." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI hiba: ${errText}`);
    }

    const aiJson = await aiRes.json();
    const imageUrl = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith("data:image/")) {
      throw new Error("Nem érkezett kép az AI-tól.");
    }

    // base64 -> Uint8Array
    const base64 = imageUrl.split(",")[1];
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      width: 3840,
      height: 2160,
      ai_prompt: prompt,
    }).select().single();

    if (insert.error) throw insert.error;

    return new Response(JSON.stringify({
      ok: true,
      background: insert.data,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
