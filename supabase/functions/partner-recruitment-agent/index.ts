// Partner Toborzó AI Agent — PRO
// Actions: run, regenerate_image, score_post, research_trends, weekly_plan, schedule_post
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_IMG = "https://ai.gateway.lovable.dev/v1/images/generations";
const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

const buildCorsHeaders = (req?: Request) => ({
  ...corsHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    req?.headers.get("access-control-request-headers") ||
    corsHeaders["Access-Control-Allow-Headers"] ||
    "authorization, x-client-info, apikey, content-type",
});

const json = (b: unknown, s = 200, req?: Request) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });

const ANGLES = [
  "sikertörténet — magyar KKV, aki 2 nap alatt indított saját webshopot",
  "problémafeltárás — miért drága és bonyolult a Shopify/WooCommerce",
  "költség-összehasonlítás — 0 Ft vs 15.000 Ft/hó",
  "AI funkciók — automatikus termékleírás, kép, marketing, virtual try-on",
  "gyorsaság — 5 perc alatt élő webshop, nem 2 hét fejlesztő nélkül",
  "egyedi domain + saját brand — nem shopify.com/store/xy hanem márkanev.hu",
  "közösségi bizonyíték — hány partner csatlakozott már",
  "FOMO — korlátozott ingyenes helyek",
  "kézműves / streetwear / dropshipper célközönség",
  "3 egyszerű lépés — hogyan kezdd",
  "before/after — Instagram bio-linkről saját domainre",
  "napi rutin — mit csinál az AI helyetted",
];

const PLATFORM_SPECS: Record<string, string> = {
  facebook: "Facebook feed poszt. 300-500 karakter, 2-3 bekezdés, emoji, végén erős CTA. 2-3 hashtag.",
  instagram: "Instagram caption. 800-1500 karakter, hookkal indul, sortörésekkel, 8-12 releváns hashtag.",
  tiktok: "TikTok videó forgatókönyv + caption. 15-30 mp forgatókönyv jelenetekre bontva, caption max 150 karakter, 3-5 hashtag.",
};

const BEST_TIMES: Record<string, string[]> = {
  facebook: ["09:00", "13:00", "19:00"],
  instagram: ["11:00", "17:00", "20:00"],
  tiktok: ["07:00", "19:00", "22:00"],
};

async function aiJson(key: string, sys: string, usr: string) {
  const res = await fetch(AI_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_${res.status}:${await res.text()}`);
  const d = await res.json();
  const raw = d?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

async function generateImage(key: string, prompt: string, platform: string, supabase: any): Promise<string | null> {
  try {
    const aspect = platform === "facebook" ? "1:1 square" : "9:16 vertical";
    const ires = await fetch(AI_IMG, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: `${prompt}. Professional social media asset, ${aspect}, no text overlay.` }],
        modalities: ["image", "text"],
      }),
    });
    if (!ires.ok) return null;
    const idata = await ires.json();
    const b64 = idata?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")?.[1] ?? idata?.data?.[0]?.b64_json ?? null;
    if (!b64) return null;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `recruitment/${platform}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) return null;
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    return pub.publicUrl;
  } catch { return null; }
}

async function scorePost(key: string, post: any) {
  const sys = `Te egy virális social media stratéga vagy. Elemezd EZT a poszttervet. Válasz CSAK JSON: {"viral_score":0-100,"hook_strength":0-100,"cta_strength":0-100,"clarity":0-100,"emotional_pull":0-100,"weaknesses":["..."],"improvements":["..."],"predicted_reach":"low|mid|high|viral"}`;
  const usr = `Platform: ${post.platform}\nHook: ${post.hook}\nBody: ${post.body}\nHashtags: ${(post.hashtags || []).join(" ")}\nCTA: ${post.cta || "—"}`;
  return await aiJson(key, sys, usr);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: buildCorsHeaders(req) });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500, req);
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401, req);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin required" }, 403, req);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "run");

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

    // ============ RUN ============
    if (action === "run") {
      const platforms = (body?.platforms as string[]) ?? ["facebook", "instagram", "tiktok"];
      const count = Math.max(1, Math.min(10, Number(body?.count) || Number(cfg.posts_per_run) || 3));
      const withImages = body?.with_images !== false;
      const withScore = body?.with_score !== false;
      const withVariants = body?.with_variants !== false;
      const campaignGroup = body?.campaign_group || null;

      const created: any[] = [];
      for (const platform of platforms) {
        for (let i = 0; i < count; i++) {
          const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
          const sys = `Te egy virális magyar social media copywriter vagy. Célod NEW PARTNEREKET (magyar KKV, márkatulajdonos, kézműves) toborozni az "Egyszerű de Nagyszerű" webshop platformra, ahol INGYEN kapnak saját webshopot AI marketing eszközökkel. Válasz SZIGORÚAN érvényes JSON. Írj úgy, mintha 1M+ követős magyar content creator lennél.`;
          const usr = `Platform: ${platform}
Spec: ${PLATFORM_SPECS[platform] || ""}
Hangnem: ${cfg.tone}
Célközönség: ${cfg.target_audience}
Érték-ajánlatok: ${cfg.value_props}
Extra: ${cfg.custom_instructions || "—"}
Poszt szöge: ${angle}

JSON:
{
  "hook": "első mondat, ami megállítja a görgetést (max 80 karakter, PROVOKATÍV vagy MEGLEPŐ)",
  "hook_variants": ["2 alternatív hook — másik érzelmi húrra"],
  "title": "belső cím (max 60 karakter)",
  "body": "teljes poszt szöveg magyarul, sortöréssel és emojival",
  "hashtags": ["#tag1"],
  "cta": "CTA (pl. 'Regisztrálj →')",
  "image_prompt": "angol nyelvű részletes prompt vonzó feed képhez (fotórealisztikus, modern, magyar KKV környezet, nem generikus stock)",
  "video_script": ${platform === "tiktok" ? '"3-5 jelenetre bontott TikTok script (0-2s hook, 2-10s probléma, 10-20s megoldás, 20-30s CTA)"' : "null"}
}`;
          let p: any = {};
          try { p = await aiJson(LOVABLE_API_KEY, sys, usr); } catch (e) { console.error("gen", e); continue; }

          // score
          let scoreData: any = null;
          if (withScore) {
            try { scoreData = await scorePost(LOVABLE_API_KEY, { platform, hook: p.hook, body: p.body, hashtags: p.hashtags, cta: p.cta }); } catch (e) { console.error("score", e); }
          }

          const imageUrl = withImages && p.image_prompt ? await generateImage(LOVABLE_API_KEY, p.image_prompt, platform, supabase) : null;
          const bestTime = BEST_TIMES[platform]?.[Math.floor(Math.random() * (BEST_TIMES[platform]?.length || 1))] || null;

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
              viral_score: scoreData?.viral_score ?? null,
              viral_analysis: scoreData || {},
              hook_variants: withVariants && Array.isArray(p.hook_variants) ? p.hook_variants : [],
              campaign_group: campaignGroup,
              best_time_hint: bestTime,
            })
            .select()
            .single();
          if (!insErr && ins) created.push(ins);
        }
      }

      if (cfgRow?.id) {
        await supabase.from("partner_recruitment_agent_config").update({ last_run_at: new Date().toISOString() }).eq("id", cfgRow.id);
      }
      return json({ ok: true, created }, 200, req);
    }

    // ============ SCORE POST ============
    if (action === "score_post") {
      const { post_id } = body;
      const { data: post } = await supabase.from("partner_recruitment_posts").select("*").eq("id", post_id).maybeSingle();
      if (!post) return json({ error: "not found" }, 404, req);
      const s = await scorePost(LOVABLE_API_KEY, post);
      await supabase.from("partner_recruitment_posts").update({ viral_score: s.viral_score, viral_analysis: s }).eq("id", post_id);
      return json({ ok: true, score: s }, 200, req);
    }

    // ============ RESEARCH TRENDS ============
    if (action === "research_trends") {
      const platforms = (body?.platforms as string[]) ?? ["facebook", "instagram", "tiktok"];
      const results: any[] = [];
      for (const platform of platforms) {
        const sys = `Te egy magyar social media trend-kutató vagy. Adj 5 AKTUÁLIS trendet, ami 2025-2026-ban működik magyar KKV / vállalkozó közönségre a(z) ${platform}-on. Válasz CSAK JSON: {"trends":[{"topic":"","hashtags":["#..."],"hook_examples":["..."],"audience_note":"","score":0-100}]}`;
        const usr = `Platform: ${platform}. Célközönség: ${cfg.target_audience}. Ajánlat: ${cfg.value_props}. Csak reális, jelenleg pörgő trendek — semmi kitalált.`;
        try {
          const out = await aiJson(LOVABLE_API_KEY, sys, usr);
          for (const t of (out.trends || [])) {
            const { data: ins } = await supabase.from("partner_recruitment_trends").insert({
              platform,
              topic: t.topic || "unknown",
              hashtags: t.hashtags || [],
              hook_examples: t.hook_examples || [],
              audience_note: t.audience_note || null,
              score: Number(t.score) || null,
              raw: t,
            }).select().maybeSingle();
            if (ins) results.push(ins);
          }
        } catch (e) { console.error("trends", platform, e); }
      }
      return json({ ok: true, trends: results }, 200, req);
    }

    // ============ WEEKLY PLAN ============
    if (action === "weekly_plan") {
      const platforms = (body?.platforms as string[]) ?? ["facebook", "instagram", "tiktok"];
      const days = Math.max(1, Math.min(14, Number(body?.days) || 7));
      const withImages = body?.with_images !== false;
      const groupId = `week-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;

      const sys = `Te egy content marketing stratéga vagy. Készíts ${days}-napos poszt-tervet 3 platformra. Minden nap KÜLÖNBÖZŐ szög, ne ismételd. Válasz CSAK JSON: {"plan":[{"day":1,"platform":"facebook|instagram|tiktok","angle":"","hook":"","body":"","hashtags":[],"cta":"","image_prompt":"","best_time":"HH:MM"}]}`;
      const usr = `Napok: ${days}. Platformok: ${platforms.join(", ")}. Cél: partner-toborzás.
Hangnem: ${cfg.tone}
Célközönség: ${cfg.target_audience}
Érték-ajánlatok: ${cfg.value_props}
Extra: ${cfg.custom_instructions || "—"}
Adj minden napra minden platformra egy posztot. Ez ${days * platforms.length} poszt összesen. Változatos szögek: sikertörténet, probléma, összehasonlítás, AI feature, gyorsaság, közösségi bizonyíték, FOMO, hogyan-kezdd, before/after.`;

      let plan: any = {};
      try { plan = await aiJson(LOVABLE_API_KEY, sys, usr); } catch (e: any) { return json({ error: e.message }, 500, req); }

      const created: any[] = [];
      const now = new Date();
      for (const item of (plan.plan || [])) {
        if (!platforms.includes(item.platform)) continue;
        const scheduledFor = new Date(now);
        scheduledFor.setDate(now.getDate() + (Number(item.day) || 1) - 1);
        const [h, m] = (item.best_time || "10:00").split(":").map(Number);
        scheduledFor.setHours(h || 10, m || 0, 0, 0);

        const imageUrl = withImages && item.image_prompt ? await generateImage(LOVABLE_API_KEY, item.image_prompt, item.platform, supabase) : null;

        const { data: ins } = await supabase.from("partner_recruitment_posts").insert({
          platform: item.platform,
          title: item.angle || null,
          hook: item.hook || null,
          body: item.body || "",
          hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
          cta: item.cta || null,
          image_prompt: item.image_prompt || null,
          image_url: imageUrl,
          angle: item.angle || null,
          status: "draft",
          generated_by: userId,
          campaign_group: groupId,
          scheduled_for: scheduledFor.toISOString(),
          best_time_hint: item.best_time || null,
        }).select().maybeSingle();
        if (ins) created.push(ins);
      }
      return json({ ok: true, campaign_group: groupId, created }, 200, req);
    }

    // ============ SCHEDULE POST ============
    if (action === "schedule_post") {
      const { post_id, scheduled_for } = body;
      await supabase.from("partner_recruitment_posts").update({ scheduled_for }).eq("id", post_id);
      return json({ ok: true }, 200, req);
    }

    // ============ REGENERATE IMAGE ============
    if (action === "regenerate_image") {
      const postId = body?.post_id;
      if (!postId) return json({ error: "post_id required" }, 400, req);
      const { data: post } = await supabase.from("partner_recruitment_posts").select("*").eq("id", postId).maybeSingle();
      if (!post) return json({ error: "not found" }, 404, req);
      const prompt = body?.prompt || post.image_prompt;
      if (!prompt) return json({ error: "no prompt" }, 400, req);
      const url = await generateImage(LOVABLE_API_KEY, prompt, post.platform, supabase);
      if (!url) return json({ error: "image gen failed" }, 500, req);
      await supabase.from("partner_recruitment_posts").update({ image_url: url, image_prompt: prompt }).eq("id", postId);
      return json({ ok: true, image_url: url }, 200, req);
    }

    // ============ CAMPAIGN MANAGER ============
    if (action === "create_campaign") {
      const { name, goal, budget_huf, target_audience, platforms, start_date, end_date } = body;
      if (!name) return json({ error: "name required" }, 400, req);
      const sys = `Te egy top marketing stratéga vagy. Adj vissza JSON-t: {"kpis":{"target_reach":0,"target_leads":0,"target_signups":0,"target_conversion":0.0},"ai_suggestions":{"optimizations":[""],"channel_mix":{"facebook":0.0,"instagram":0.0,"tiktok":0.0},"cadence":"napi X poszt","risk":""}}`;
      const usr = `Kampány: ${name}. Cél: ${goal || "partner-toborzás"}. Költségkeret: ${budget_huf || 0} HUF. Célközönség: ${target_audience || cfg.target_audience}. Platformok: ${(platforms || ["facebook","instagram","tiktok"]).join(",")}. Kezdés: ${start_date || "most"}. Vége: ${end_date || "nincs"}.`;
      let ai: any = {};
      try { ai = await aiJson(LOVABLE_API_KEY, sys, usr); } catch (e) { console.error("campaign ai", e); }
      const { data: ins, error } = await supabase.from("partner_recruitment_campaigns").insert({
        name, goal: goal || null, budget_huf: budget_huf || 0,
        target_audience: target_audience || cfg.target_audience,
        platforms: platforms || ["facebook","instagram","tiktok"],
        kpis: ai.kpis || {}, ai_suggestions: ai.ai_suggestions || {},
        start_date: start_date || null, end_date: end_date || null,
        status: "draft", created_by: userId,
      }).select().single();
      if (error) return json({ error: error.message }, 500, req);
      return json({ ok: true, campaign: ins }, 200, req);
    }

    // ============ VIDEO STUDIO ============
    if (action === "video_studio") {
      const { topic, platform = "tiktok", duration = 30, post_id } = body;
      const sys = `Te egy virális rövid videó rendező vagy. Készíts komplett videó csomagot. Válasz CSAK JSON:
{
  "script": [{"scene":1,"seconds":"0-2","visual":"","voiceover":"","text_overlay":""}],
  "storyboard": [{"scene":1,"shot":"","camera":"close-up|medium|wide","mood":""}],
  "narration": "teljes narráció szöveg",
  "captions": "sortört felirat (SRT-szerű, egyszerű)",
  "music_suggestion": "hangulat + BPM + kulcsszavak (pl. 'upbeat corporate 120bpm')",
  "thumbnail_prompt": "angol nyelvű vonzó thumbnail prompt"
}`;
      const usr = `Platform: ${platform}. Hossz: ${duration} mp. Téma: ${topic || "Egyszerű de Nagyszerű webshop partnerprogram"}. Hangnem: ${cfg.tone}. Érték: ${cfg.value_props}.`;
      let v: any = {};
      try { v = await aiJson(LOVABLE_API_KEY, sys, usr); } catch (e: any) { return json({ error: e.message }, 500, req); }
      const thumbUrl = v.thumbnail_prompt ? await generateImage(LOVABLE_API_KEY, v.thumbnail_prompt, platform, supabase) : null;
      const { data: ins, error } = await supabase.from("partner_recruitment_videos").insert({
        post_id: post_id || null, platform,
        script: v.script || [], storyboard: v.storyboard || [],
        narration: v.narration || null, captions: v.captions || null,
        music_suggestion: v.music_suggestion || null,
        thumbnail_prompt: v.thumbnail_prompt || null, thumbnail_url: thumbUrl,
        duration_seconds: duration, status: "draft", created_by: userId,
      }).select().single();
      if (error) return json({ error: error.message }, 500, req);
      return json({ ok: true, video: ins }, 200, req);
    }

    // ============ MULTI-LANGUAGE TRANSLATE ============
    if (action === "translate_post") {
      const { post_id, langs } = body;
      if (!post_id || !Array.isArray(langs) || !langs.length) return json({ error: "post_id + langs required" }, 400, req);
      const { data: post } = await supabase.from("partner_recruitment_posts").select("*").eq("id", post_id).maybeSingle();
      if (!post) return json({ error: "not found" }, 404, req);
      const LANG_NAMES: Record<string,string> = { en: "angol", de: "német", ro: "román", sk: "szlovák", hu: "magyar" };
      const out: any[] = [];
      for (const lang of langs) {
        const sys = `Te egy natív ${LANG_NAMES[lang] || lang} copywriter vagy. Fordítsd le a posztot NATURÁLISAN (nem szó szerint), lokalizáld a hashtageket és CTA-t. Válasz CSAK JSON: {"hook":"","body":"","hashtags":["#..."],"cta":""}`;
        const usr = `Eredeti (HU) hook: ${post.hook}\nBody: ${post.body}\nHashtags: ${(post.hashtags||[]).join(" ")}\nCTA: ${post.cta}`;
        try {
          const t = await aiJson(LOVABLE_API_KEY, sys, usr);
          const { data: ins } = await supabase.from("partner_recruitment_translations").upsert({
            post_id, target_lang: lang,
            hook: t.hook || null, body: t.body || "",
            hashtags: Array.isArray(t.hashtags) ? t.hashtags : [],
            cta: t.cta || null, created_by: userId,
          }, { onConflict: "post_id,target_lang" }).select().single();
          if (ins) out.push(ins);
        } catch (e) { console.error("translate", lang, e); }
      }
      return json({ ok: true, translations: out }, 200, req);
    }

    // ============ GROWTH PREDICTOR ============
    if (action === "growth_predict") {
      const { campaign_id } = body;
      let campaign: any = null;
      if (campaign_id) {
        const { data } = await supabase.from("partner_recruitment_campaigns").select("*").eq("id", campaign_id).maybeSingle();
        campaign = data;
      }
      // Historical stats: last 30 days posts
      const since = new Date(Date.now() - 30*24*3600*1000).toISOString();
      const { data: recent } = await supabase.from("partner_recruitment_posts")
        .select("platform, viral_score, status").gte("created_at", since);
      const stats = { total: recent?.length || 0, avg_viral: 0, published: 0 };
      if (recent?.length) {
        stats.avg_viral = Math.round(recent.reduce((s,p:any)=>s+(p.viral_score||0),0) / recent.length);
        stats.published = recent.filter((p:any)=>p.status==="published").length;
      }
      const sys = `Te egy adatvezérelt growth marketing analitikus vagy. Előrejelzést készíts REÁLIS számokkal magyar KKV partnertoborzó kampányra. Válasz CSAK JSON:
{"predicted_reach": 0, "predicted_leads": 0, "predicted_signups": 0, "predicted_conversion": 0.0, "recommended_posts_per_day": 0, "reasoning": "1-2 mondat", "confidence": 0.0}`;
      const usr = `Kampány: ${campaign?.name || "általános toborzás"}. Költségkeret: ${campaign?.budget_huf || 0} HUF. Platformok: ${(campaign?.platforms||["facebook","instagram","tiktok"]).join(",")}. Célközönség: ${campaign?.target_audience || cfg.target_audience}. Előző 30 nap: ${stats.total} poszt, ${stats.published} publikált, átlag virális score ${stats.avg_viral}/100. Adj konzervatív, de bátor előrejelzést.`;
      let p: any = {};
      try { p = await aiJson(LOVABLE_API_KEY, sys, usr); } catch (e: any) { return json({ error: e.message }, 500, req); }
      const { data: ins } = await supabase.from("partner_recruitment_predictions").insert({
        campaign_id: campaign_id || null,
        predicted_reach: Number(p.predicted_reach) || 0,
        predicted_leads: Number(p.predicted_leads) || 0,
        predicted_signups: Number(p.predicted_signups) || 0,
        predicted_conversion: Number(p.predicted_conversion) || 0,
        recommended_posts_per_day: Number(p.recommended_posts_per_day) || 0,
        reasoning: p.reasoning || null,
        confidence: Number(p.confidence) || 0,
        raw: { ai: p, stats },
        created_by: userId,
      }).select().single();
      return json({ ok: true, prediction: ins, historical: stats }, 200, req);
    }

    return json({ error: "unknown action" }, 400, req);
  } catch (e: any) {
    if (e?.message === "rate_limit") return json({ error: "Túl sok AI kérés." }, 429, req);
    if (e?.message === "credits_exhausted") return json({ error: "AI kredit kimerült." }, 402, req);
    return json({ error: e?.message || "internal" }, 500, req);
  }
});
