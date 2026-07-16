// Partner Toborzó AI Agent — Facebook/Instagram/TikTok posztokat generál
// hogy a webshop platformra új partnereket vonzzon.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_IMG = "https://ai.gateway.lovable.dev/v1/images/generations";
const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ANGLES = [
  "sikertörténet — egy magyar KKV, aki 2 nap alatt indított saját webshopot",
  "problémafeltárás — miért drága és bonyolult a Shopify/WooCommerce",
  "költség-összehasonlítás — 0 Ft vs 15.000 Ft/hó",
  "AI funkciók bemutatása — automatikus termékleírás, kép, marketing",
  "gyorsaság — 5 perc alatt élő webshop, nem 2 hét fejlesztő nélkül",
  "egyedi domain + saját brand — nem shopify.com/store/xy hanem márkanev.hu",
  "közösségi bizonyíték — hány partner csatlakozott már",
  "FOMO — korlátozott számú ingyenes helyet ajánlunk",
  "célközönség: kézműves, streetwear designer, dropshipper",
  "hogyan kezdd — 3 egyszerű lépés",
];

const PLATFORM_SPECS: Record<string, string> = {
  facebook: "Facebook feed poszt. 300-500 karakter, 2-3 bekezdés, emoji, végén erős CTA. 2-3 hashtag. Történet vezérelt, közösségi hangvétel.",
  instagram: "Instagram caption. 800-1500 karakter, hookkal indul, sortörésekkel, 8-12 releváns hashtag. Vizuális, inspiráló, motivációs.",
  tiktok: "TikTok videó forgatókönyv + caption. Hook első 2 mp-ben, 15-30 mp forgatókönyv jelenetekre bontva, caption max 150 karakter, 3-5 hashtag (#fyp #vallalkozas #webshop). Pörgős, trendi, humoros.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "run");

    // Load config
    const { data: cfgRow } = await supabase
      .from("partner_recruitment_agent_config")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const cfg = cfgRow || {
      tone: "lelkes, magabiztos, magyar KKV-barát",
      target_audience: "Magyar KKV tulajdonosok, akik saját webshopot szeretnének",
      value_props: "Ingyenes saját webshop, egyedi domain, AI marketing, 0% havidíj",
      custom_instructions: "",
      posts_per_run: 3,
    };

    if (action === "run") {
      const platforms = (body?.platforms as string[]) ?? ["facebook", "instagram", "tiktok"];
      const count = Math.max(1, Math.min(10, Number(body?.count) || Number(cfg.posts_per_run) || 3));
      const withImages = body?.with_images !== false;

      const created: any[] = [];
      for (const platform of platforms) {
        for (let i = 0; i < count; i++) {
          const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
          const sys = `Te egy magyar közösségi média copywriter vagy. Célod nem termékeket reklámozni, hanem NEW PARTNEREKET (magyar KKV-kat, márkatulajdonosokat, kézműveseket) toborozni az "Egyszerű de Nagyszerű" webshop platformra, ahol INGYEN kaphatnak saját webshopot AI marketing eszközökkel. Válasz SZIGORÚAN érvényes JSON.`;
          const usr = `Platform: ${platform}
Specifikáció: ${PLATFORM_SPECS[platform] || ""}
Hangnem: ${cfg.tone}
Célközönség: ${cfg.target_audience}
Érték-ajánlatok: ${cfg.value_props}
Extra utasítás: ${cfg.custom_instructions || "—"}
Ez a poszt szöge: ${angle}

Add vissza pontosan ezt a JSON-t:
{
  "hook": "első mondat, ami megállítja a görgetést",
  "title": "opcionális belső cím (max 60 karakter)",
  "body": "teljes poszt szöveg magyarul, formázva sortörésekkel és emojikkal",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "CTA szöveg, pl. 'Regisztrálj itt →'",
  "image_prompt": "angol nyelvű részletes prompt egy vonzó feed képhez, ami vizuálisan illusztrálja a szöget (fotórealisztikus, modern, magyar KKV környezet, nem generikus stock)",
  "video_script": "${platform === "tiktok" ? "TikTok forgatókönyv 3-5 jelenetre bontva (0-2s hook, 2-10s probléma, 10-20s megoldás, 20-30s CTA)" : "null"}"
}`;
          const res = await fetch(AI_CHAT, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: TEXT_MODEL,
              messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
              response_format: { type: "json_object" },
            }),
          });
          if (!res.ok) {
            const err = await res.text();
            console.error("AI text error", res.status, err);
            continue;
          }
          const d = await res.json();
          const raw = d?.choices?.[0]?.message?.content ?? "{}";
          let p: any = {};
          try { p = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); p = m ? JSON.parse(m[0]) : {}; }

          let imageUrl: string | null = null;
          if (withImages && p.image_prompt) {
            try {
              const ires = await fetch(AI_IMG, {
                method: "POST",
                headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: IMAGE_MODEL,
                  messages: [{ role: "user", content: `${p.image_prompt}. Professional social media asset, ${platform === "tiktok" || platform === "instagram" ? "9:16 vertical" : "1:1 square"}, no text overlay.` }],
                  modalities: ["image", "text"],
                }),
              });
              if (ires.ok) {
                const idata = await ires.json();
                const b64 = idata?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")?.[1] ?? idata?.data?.[0]?.b64_json ?? null;
                if (b64) {
                  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                  const path = `recruitment/${platform}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
                  const { error: upErr } = await supabase.storage.from("product-images").upload(path, bytes, { contentType: "image/png", upsert: false });
                  if (!upErr) {
                    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
                    imageUrl = pub.publicUrl;
                  }
                }
              }
            } catch (e) { console.error("image error", e); }
          }

          const { data: ins, error: insErr } = await supabase
            .from("partner_recruitment_posts")
            .insert({
              platform,
              title: p.title || null,
              hook: p.hook || null,
              body: p.body || "",
              hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
              cta: p.cta || null,
              image_prompt: p.image_prompt || null,
              image_url: imageUrl,
              video_script: p.video_script && p.video_script !== "null" ? p.video_script : null,
              angle,
              status: "draft",
              generated_by: userId,
            })
            .select()
            .single();
          if (!insErr && ins) created.push(ins);
        }
      }

      if (cfgRow?.id) {
        await supabase.from("partner_recruitment_agent_config").update({ last_run_at: new Date().toISOString() }).eq("id", cfgRow.id);
      }
      return json({ ok: true, created });
    }

    if (action === "regenerate_image") {
      const postId = body?.post_id;
      if (!postId) return json({ error: "post_id required" }, 400);
      const { data: post } = await supabase.from("partner_recruitment_posts").select("*").eq("id", postId).maybeSingle();
      if (!post) return json({ error: "not found" }, 404);
      const prompt = body?.prompt || post.image_prompt;
      if (!prompt) return json({ error: "no prompt" }, 400);
      const ires = await fetch(AI_IMG, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: `${prompt}. Professional social media asset, ${post.platform === "facebook" ? "1:1 square" : "9:16 vertical"}, no text overlay.` }],
          modalities: ["image", "text"],
        }),
      });
      if (!ires.ok) return json({ error: "image gen failed" }, 500);
      const idata = await ires.json();
      const b64 = idata?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")?.[1] ?? null;
      if (!b64) return json({ error: "no image" }, 500);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `recruitment/${post.platform}/${Date.now()}.png`;
      await supabase.storage.from("product-images").upload(path, bytes, { contentType: "image/png", upsert: false });
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      await supabase.from("partner_recruitment_posts").update({ image_url: pub.publicUrl, image_prompt: prompt }).eq("id", postId);
      return json({ ok: true, image_url: pub.publicUrl });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message || "internal" }, 500);
  }
});
