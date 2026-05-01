// Saját TTS Gateway — multi-provider, multi-modell
// Támogatott providerek: Replicate (XTTS-v2, F5-TTS, Chatterbox), ElevenLabs, custom GPU
// Bemenet: { voice_id, text, voice_settings }
// Kimenet: { audio_base64, mime, audio_storage_path, generation_id, provider, model_slug, generation_time_ms }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API = "https://api.replicate.com/v1";

async function replicateRun(modelRef: string, input: any, token: string): Promise<string> {
  // model_ref lehet "owner/name:version" vagy csak "owner/name"
  const isVersioned = modelRef.includes(":");
  const url = isVersioned
    ? `${REPLICATE_API}/predictions`
    : `${REPLICATE_API}/models/${modelRef}/predictions`;

  const body = isVersioned
    ? { version: modelRef.split(":")[1], input }
    : { input };

  const start = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify(body),
  });
  const startJson = await start.json();
  if (!start.ok) throw new Error(`Replicate start: ${JSON.stringify(startJson).slice(0, 300)}`);

  let prediction = startJson;
  // Poll ha még nem kész
  const maxWait = Date.now() + 5 * 60 * 1000; // 5 perc
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled" &&
    Date.now() < maxWait
  ) {
    await new Promise((r) => setTimeout(r, 2500));
    const r = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    prediction = await r.json();
  }
  if (prediction.status !== "succeeded") {
    throw new Error(`Replicate ${prediction.status}: ${prediction.error || "unknown"}`);
  }
  // Az output általában URL string, vagy {audio_out: url}
  const out = prediction.output;
  if (typeof out === "string") return out;
  if (Array.isArray(out)) return out[0];
  if (out?.audio_out) return out.audio_out;
  if (out?.audio) return out.audio;
  throw new Error("Replicate output formátum ismeretlen: " + JSON.stringify(out).slice(0, 200));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  let generationId: string | null = null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { voice_id, text, voice_settings = {} } = body || {};
    if (!voice_id || !text) throw new Error("voice_id és text kötelező");
    if (text.length > 5000) throw new Error("Max 5000 karakter / kérés");

    // Voice + model lekérdezés
    const { data: voice, error: vErr } = await admin
      .from("tts_voices_v2")
      .select("*, model:tts_models(*)")
      .eq("id", voice_id)
      .maybeSingle();
    if (vErr || !voice) throw new Error("Hang nem található");
    if (voice.status !== "ready") throw new Error(`Hang nem kész: ${voice.status}`);
    let model = (voice as any).model;
    if (!model) throw new Error("Modell nincs hozzárendelve a hanghoz");

    // Globális kill switch: custom_gpu felülbírálás
    const { data: ttsSettings } = await admin.from("tts_settings").select("*").eq("id", 1).maybeSingle();
    if (ttsSettings?.use_custom_gpu && ttsSettings?.custom_gpu_endpoint) {
      // Kényszerítjük custom_gpu provider-re az endpointot a settings-ből
      model = {
        ...model,
        provider: "custom_gpu",
        config: {
          ...(model.config || {}),
          endpoint: ttsSettings.custom_gpu_endpoint,
          api_key_secret: ttsSettings.custom_gpu_secret_name || "CUSTOM_GPU_TTS_TOKEN",
          original_provider: model.provider,
          original_slug: model.slug,
        },
      };
    }

    // Generation rekord létrehozása
    const { data: genRow } = await admin.from("tts_generations_v2").insert({
      voice_id,
      model_id: model.id,
      text,
      voice_settings,
      provider: model.provider,
      status: "running",
      created_by: userData.user.id,
    }).select().single();
    generationId = genRow!.id;

    const startTime = Date.now();
    let audioBuf: Uint8Array;

    // ============== PROVIDER ROUTING ==============
    if (model.provider === "replicate") {
      const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
      if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN missing");

      // Sample fájl signed URL (ha van)
      let speakerUrl: string | null = null;
      if (voice.sample_storage_path) {
        const { data: signed } = await admin.storage
          .from("tts-voices-v2")
          .createSignedUrl(voice.sample_storage_path, 60 * 60);
        speakerUrl = signed?.signedUrl || null;
      }

      let input: any;
      if (model.slug === "xtts-v2") {
        input = {
          text,
          speaker: speakerUrl,
          language: voice_settings.language || "hu",
          cleanup_voice: false,
        };
      } else if (model.slug === "f5-tts") {
        input = {
          gen_text: text,
          ref_audio: speakerUrl,
          ref_text: voice_settings.ref_text || "",
          remove_silence: true,
        };
      } else if (model.slug === "chatterbox") {
        input = {
          prompt: text,
          audio_prompt: speakerUrl,
          exaggeration: voice_settings.style ?? 0.5,
          cfg: voice_settings.cfg ?? 0.5,
        };
      } else {
        input = { text, speaker: speakerUrl };
      }

      const audioUrl = await replicateRun(model.config.replicate_model, input, REPLICATE_API_TOKEN);
      const audioResp = await fetch(audioUrl);
      audioBuf = new Uint8Array(await audioResp.arrayBuffer());
    } else if (model.provider === "elevenlabs") {
      const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      if (!EL_KEY) throw new Error("ELEVENLABS_API_KEY missing");
      if (!voice.provider_voice_id) throw new Error("Hang nincs ElevenLabs-on regisztrálva");

      const ttsResp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.provider_voice_id}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: model.config.model_id || "eleven_multilingual_v2",
            voice_settings: {
              stability: voice_settings.stability ?? 0.5,
              similarity_boost: voice_settings.similarity_boost ?? 0.85,
              style: voice_settings.style ?? 0.3,
              use_speaker_boost: true,
              speed: voice_settings.speed ?? 1.0,
            },
          }),
        },
      );
      if (!ttsResp.ok) throw new Error(`ElevenLabs HTTP ${ttsResp.status}: ${(await ttsResp.text()).slice(0, 200)}`);
      audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
    } else if (model.provider === "custom_gpu") {
      // Saját GPU szerver hívása — endpoint a model.config-ból
      const endpoint = model.config.endpoint;
      const apiKey = Deno.env.get(model.config.api_key_secret || "CUSTOM_GPU_API_KEY");
      if (!endpoint) throw new Error("custom_gpu modellnek endpoint kötelező");

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          text,
          voice_id: voice.provider_voice_id,
          ...voice_settings,
        }),
      });
      if (!resp.ok) throw new Error(`Custom GPU HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      audioBuf = new Uint8Array(await resp.arrayBuffer());
    } else {
      throw new Error(`Ismeretlen provider: ${model.provider}`);
    }

    // Mentés storage-ba
    const audioPath = `generations/${userData.user.id}/${Date.now()}_${model.slug}.mp3`;
    await admin.storage.from("tts-voices-v2").upload(audioPath, audioBuf, {
      contentType: "audio/mpeg", upsert: false,
    });

    const elapsed = Date.now() - startTime;

    await admin.from("tts_generations_v2").update({
      audio_storage_path: audioPath,
      generation_time_ms: elapsed,
      status: "completed",
    }).eq("id", generationId);

    const audioB64 = base64Encode(audioBuf);

    return new Response(JSON.stringify({
      audio_base64: audioB64,
      mime: "audio/mpeg",
      audio_storage_path: audioPath,
      generation_id: generationId,
      provider: model.provider,
      model_slug: model.slug,
      generation_time_ms: elapsed,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("tts-gateway error", e);
    if (generationId) {
      await admin.from("tts_generations_v2").update({
        status: "failed",
        error_message: e instanceof Error ? e.message.slice(0, 500) : String(e),
      }).eq("id", generationId);
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
