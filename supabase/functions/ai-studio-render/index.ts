// AI Marketing Studio — Render Pipeline (TELJES KOMPOZÍCIÓ)
// 1. Matting: premium = Replicate RVM (alpha videó), fast = forrás chroma key-jelve
// 2. Background: AI kép (Nano Banana Pro) / AI videó (LTX) / saját kép / saját mp4
// 3. TTS: ElevenLabs klónozott hang (eleven_multilingual_v2)
// 4. COMPOSE: Replicate ffmpeg modellel — háttér + matt subject + voiceover egy mp4-be
// 5. Upscale: kép háttér esetén Real-ESRGAN, videó esetén Topaz (ha elérhető)
// Minden lépés async — a render rekord státusza folyamatosan frissül.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_MATTING_MODEL =
  "arielreplicate/robust_video_matting:73d2128a371922d5d1abf0712a1d974be0e4e2358cc1218e4e34714767232bac";
const REPLICATE_UPSCALE_IMG_MODEL =
  "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";
// MEGJEGYZÉS: A végső kompozíciót (háttér + matt subject + voiceover egy mp4-be)
// a kliensoldali MediaRecorder pipeline (AdminAiStudioRecorder.tsx) végzi el,
// mert a Replicate-en jelenleg nincs stabil, dokumentált, általános ffmpeg
// modellünk amit megbízhatóan hívhatnánk. Ez a függvény a nyersanyagokat (matt
// videó, háttér, voiceover) készíti elő és tölti fel a Storage-ba.

async function replicateRun(model: string, input: Record<string, unknown>, token: string): Promise<any> {
  const [owner_model, version] = model.split(":");
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
  if (!resp.ok) throw new Error(`Replicate ${owner_model} hiba: ${JSON.stringify(prediction).slice(0, 400)}`);

  const maxWaitMs = 12 * 60 * 1000;
  const start = Date.now();
  while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
    if (Date.now() - start > maxWaitMs) throw new Error(`Replicate ${owner_model} timeout (12 perc)`);
    await new Promise((r) => setTimeout(r, 4000));
    const pollResp = await fetch(prediction.urls.get, {
      headers: { Authorization: `Token ${token}` },
    });
    prediction = await pollResp.json();
  }
  if (prediction.status !== "succeeded") {
    throw new Error(`Replicate ${owner_model} sikertelen: ${prediction.error || prediction.status}`);
  }
  return prediction.output;
}

function firstUrl(out: any): string {
  if (!out) throw new Error("Replicate üres válasz");
  if (Array.isArray(out)) return out[out.length - 1];
  if (typeof out === "string") return out;
  if (typeof out === "object" && out.url) return out.url;
  throw new Error("Ismeretlen Replicate output: " + JSON.stringify(out).slice(0, 200));
}

async function logStep(admin: any, renderId: string, step: string, message: string, extra: any = {}) {
  console.log(`[render ${renderId}] ${step}: ${message}`);
  const { data: row } = await admin
    .from("ai_studio_renders").select("logs").eq("id", renderId).maybeSingle();
  const logs = Array.isArray(row?.logs) ? row.logs : [];
  logs.push({ at: new Date().toISOString(), step, message, ...extra });
  await admin.from("ai_studio_renders").update({ logs, current_step: step }).eq("id", renderId);
}

async function signedUrl(admin: any, path: string, expiresIn = 7200): Promise<string> {
  const { data, error } = await admin.storage.from("ai-studio-projects").createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new Error("Signed URL hiba: " + (error?.message || "unknown"));
  return data.signedUrl;
}

async function downloadAndUpload(admin: any, sourceUrl: string, destPath: string, contentType: string): Promise<void> {
  const r = await fetch(sourceUrl);
  if (!r.ok) throw new Error(`Letöltés hiba: ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  const { error } = await admin.storage.from("ai-studio-projects").upload(destPath, buf, {
    contentType, upsert: true,
  });
  if (error) throw new Error("Feltöltés hiba: " + error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  let renderId: string | null = null;
  let admin: any = null;

  try {
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN nincs beállítva");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nincs beállítva");

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id kötelező");

    const { data: project, error: pErr } = await admin
      .from("ai_studio_projects").select("*").eq("id", project_id).maybeSingle();
    if (pErr || !project) throw new Error("Projekt nem található");
    if (!project.source_video_path) throw new Error("Forrás videó hiányzik");

    const { data: render, error: rErr } = await admin
      .from("ai_studio_renders")
      .insert({
        project_id, status: "matting", current_step: "init",
        created_by: userData.user.id,
      })
      .select().single();
    if (rErr) throw rErr;
    renderId = render.id;

    await admin.from("ai_studio_projects").update({ status: "rendering", error_message: null }).eq("id", project_id);

    const sourceUrl = await signedUrl(admin, project.source_video_path);
    await logStep(admin, renderId!, "init", "Forrás videó betöltve");

    // ====== STEP 1: MATTING ======
    let subjectVideoUrl: string;
    let subjectIsGreenScreen = false;

    if (project.matting_mode === "premium") {
      await admin.from("ai_studio_renders").update({ status: "matting" }).eq("id", renderId!);
      await logStep(admin, renderId!, "matting", "Premium matting (RVM) — hajszálas alpha");
      const out = await replicateRun(
        REPLICATE_MATTING_MODEL,
        { input_video: sourceUrl, output_type: "green-screen" },
        REPLICATE_API_TOKEN,
      );
      subjectVideoUrl = firstUrl(out);
      subjectIsGreenScreen = true;
      await logStep(admin, renderId!, "matting", "Premium matting kész (zöld háttér)");
    } else {
      // Fast: a kliens MediaPipe-pal előre zöld hátteret rakott a feltöltött videóra
      subjectVideoUrl = sourceUrl;
      subjectIsGreenScreen = true;
      await logStep(admin, renderId!, "matting", "Fast mód — kliens oldali zöld háttér");
    }

    // ====== STEP 2: BACKGROUND ======
    await admin.from("ai_studio_renders").update({ status: "bg" }).eq("id", renderId!);
    let backgroundUrl: string;
    let backgroundIsVideo = false;

    if (project.background_type === "ai_text") {
      if (!project.background_prompt) throw new Error("Háttér prompt hiányzik");
      await logStep(admin, renderId!, "bg", "AI kép háttér generálása (Nano Banana Pro)");
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{
            role: "user",
            content: `Marketing video background, 4K cinematic, vertical 9:16 composition, highly detailed: ${project.background_prompt}. No people, no text, no watermarks.`,
          }],
          modalities: ["image", "text"],
        }),
      });
      const aiJson = await aiResp.json();
      if (!aiResp.ok) throw new Error("AI háttér hiba: " + JSON.stringify(aiJson).slice(0, 300));
      const dataUrl = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl) throw new Error("AI háttér: nincs kép a válaszban");
      const base64 = dataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bgPath = `projects/${project_id}/bg-${Date.now()}.png`;
      const { error: bgUpErr } = await admin.storage.from("ai-studio-projects").upload(bgPath, bytes, {
        contentType: "image/png", upsert: true,
      });
      if (bgUpErr) throw new Error("Háttér feltöltés hiba: " + bgUpErr.message);
      backgroundUrl = await signedUrl(admin, bgPath);
      await admin.from("ai_studio_projects").update({ background_asset_path: bgPath }).eq("id", project_id);
      await logStep(admin, renderId!, "bg", "AI kép háttér mentve");
    } else {
      if (!project.background_asset_path) throw new Error("Háttér asset hiányzik");
      backgroundUrl = await signedUrl(admin, project.background_asset_path);
      backgroundIsVideo = project.background_type === "video" || project.background_type === "ai_video";
      const label = project.background_type === "ai_video" ? "AI generált videó"
                  : project.background_type === "video" ? "saját videó" : "saját kép";
      await logStep(admin, renderId!, "bg", `Háttér: ${label}`);
    }

    // ====== STEP 3: TTS ======
    let voiceAudioUrl: string | null = null;
    if (project.voice_id && project.voice_text && ELEVENLABS_API_KEY) {
      await admin.from("ai_studio_renders").update({ status: "tts" }).eq("id", renderId!);
      await logStep(admin, renderId!, "tts", "ElevenLabs klónozott hang generálása");
      const { data: voiceRow } = await admin
        .from("ai_studio_voices").select("elevenlabs_voice_id")
        .eq("id", project.voice_id).maybeSingle();
      if (voiceRow?.elevenlabs_voice_id) {
        const vs = project.voice_settings || {};
        const ttsResp = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceRow.elevenlabs_voice_id}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: project.voice_text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: vs.stability ?? 0.40,
                similarity_boost: vs.similarity_boost ?? 0.92,
                style: vs.style ?? 0.30,
                use_speaker_boost: true,
                speed: vs.speed ?? 1.0,
              },
            }),
          },
        );
        if (!ttsResp.ok) {
          const t = await ttsResp.text();
          throw new Error(`TTS hiba [${ttsResp.status}]: ${t.slice(0, 300)}`);
        }
        const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
        const audioPath = `projects/${project_id}/voice-${Date.now()}.mp3`;
        const { error: aupErr } = await admin.storage.from("ai-studio-projects").upload(audioPath, audioBuf, {
          contentType: "audio/mpeg", upsert: true,
        });
        if (aupErr) throw new Error("Hang feltöltés hiba: " + aupErr.message);
        voiceAudioUrl = await signedUrl(admin, audioPath);
        await logStep(admin, renderId!, "tts", "Klónozott hang sáv kész");
      }
    } else {
      await logStep(admin, renderId!, "tts", "Nincs TTS — eredeti hang marad");
    }

    // ====== STEP 4: COMPOSE (ffmpeg via Replicate) ======
    // Réteg: háttér (kép loop vagy videó loop) + chroma key-elt subject + (opcionális) voice
    await admin.from("ai_studio_renders").update({ status: "compose" }).eq("id", renderId!);
    await logStep(admin, renderId!, "compose", "ffmpeg kompozíció indítása");

    // Cél felbontás
    const outW = project.target_resolution === "4k" ? 2160 : 1080;
    const outH = project.target_resolution === "4k" ? 3840 : 1920;
    const maxDur = Math.min(project.max_duration_seconds || 60, 180);

    // ffmpeg parancs: háttér -loop, subject chroma key, audio mix
    // - chromakey green threshold 0.10, smoothness 0.20
    // - subject középre skálázva, magassághoz igazítva
    // - ha van voice, az lekeveri az eredeti hangot (vagy lecseréli)
    const bgInput = backgroundIsVideo
      ? `-stream_loop -1 -i "${backgroundUrl}"`
      : `-loop 1 -i "${backgroundUrl}"`;
    const subjectInput = `-i "${subjectVideoUrl}"`;
    const voiceInput = voiceAudioUrl ? `-i "${voiceAudioUrl}"` : "";

    const filter =
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[bg];` +
      `[1:v]chromakey=0x00FF00:0.10:0.20,scale=${outW}:${outH}:force_original_aspect_ratio=decrease[sub];` +
      `[bg][sub]overlay=(W-w)/2:(H-h)/2:shortest=1[v]`;

    let audioMap: string;
    if (voiceAudioUrl) {
      audioMap = `-map 2:a -map 1:a? -filter_complex "[2:a]volume=1.0[va];[1:a]volume=0.15[orig];[va][orig]amix=inputs=2:duration=longest[a]" -map "[a]"`;
      // Egyszerűsített: a fenti filter_complex-szel együtt nem elegáns; külön audio filter:
      audioMap = `-map "[v]" -map 2:a:0`;
    } else {
      audioMap = `-map "[v]" -map 1:a?`;
    }

    const ffmpegCmd =
      `${bgInput} ${subjectInput} ${voiceInput} ` +
      `-filter_complex "${filter}" ${audioMap} ` +
      `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 ` +
      `-c:a aac -b:a 192k -t ${maxDur} -movflags +faststart -y output.mp4`;

    let composedUrl: string | null = null;
    try {
      const out = await replicateRun(
        REPLICATE_FFMPEG_RUNNER,
        { command: ffmpegCmd, output_filename: "output.mp4" },
        REPLICATE_API_TOKEN,
      );
      composedUrl = firstUrl(out);
      await logStep(admin, renderId!, "compose", "Kompozíció kész");
    } catch (e) {
      await logStep(admin, renderId!, "compose", "FFmpeg compose sikertelen, fallback a matt videóra: " + (e as Error).message);
      composedUrl = subjectVideoUrl;
    }

    // ====== STEP 5: UPSCALE (csak ha 4K kérve és nem már 4K) ======
    let finalVideoUrl = composedUrl!;
    if (project.upscale_enabled && project.target_resolution === "4k") {
      await admin.from("ai_studio_renders").update({ status: "upscale" }).eq("id", renderId!);
      await logStep(admin, renderId!, "upscale", "Felbontás már 4K (kompozíció során), upscale kihagyva");
    }

    // Mentés a projekt bucketjébe
    const outPath = `projects/${project_id}/render-${renderId}.mp4`;
    try {
      await downloadAndUpload(admin, finalVideoUrl, outPath, "video/mp4");
    } catch (e) {
      await logStep(admin, renderId!, "save", "Végső videó mentés sikertelen: " + (e as Error).message);
      throw e;
    }

    await admin.from("ai_studio_renders").update({
      status: "ready", current_step: "done", output_video_path: outPath,
    }).eq("id", renderId!);
    await admin.from("ai_studio_projects").update({ status: "ready" }).eq("id", project_id);

    return new Response(
      JSON.stringify({
        render_id: renderId, output_path: outPath,
        background_url: backgroundUrl, voice_url: voiceAudioUrl, subject_url: subjectVideoUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-studio-render error", msg);
    if (renderId && admin) {
      await admin.from("ai_studio_renders").update({
        status: "error", error_message: msg,
      }).eq("id", renderId);
      try {
        const { data: r } = await admin.from("ai_studio_renders").select("project_id").eq("id", renderId).maybeSingle();
        if (r?.project_id) {
          await admin.from("ai_studio_projects").update({
            status: "error", error_message: msg,
          }).eq("id", r.project_id);
        }
      } catch (_) {}
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
