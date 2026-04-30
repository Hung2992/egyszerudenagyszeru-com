import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authed.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      voice_id,
      text,
      stability = 0.45,
      similarity_boost = 0.85,
      style = 0.35,
      speed = 1.0,
      model_id = "eleven_multilingual_v2",
      save = true,
    } = body || {};
    if (!voice_id || !text) throw new Error("voice_id és text kötelező");
    if (text.length > 5000) throw new Error("Max 5000 karakter / kérés");

    const { data: voiceRow, error: vErr } = await admin
      .from("ai_studio_voices")
      .select("*")
      .eq("id", voice_id)
      .maybeSingle();
    if (vErr || !voiceRow?.elevenlabs_voice_id) {
      throw new Error("Hang nem található vagy nincs klónozva");
    }

    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceRow.elevenlabs_voice_id}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability,
            similarity_boost,
            style,
            use_speaker_boost: true,
            speed,
          },
        }),
      },
    );

    if (!ttsResp.ok) {
      const errTxt = await ttsResp.text();
      throw new Error(`ElevenLabs TTS hiba [${ttsResp.status}]: ${errTxt.slice(0, 300)}`);
    }
    const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
    const audioB64 = base64Encode(audioBuf);

    let audioPath: string | null = null;
    if (save) {
      audioPath = `tts/${userData.user.id}/${Date.now()}.mp3`;
      await admin.storage
        .from("ai-studio-voices")
        .upload(audioPath, audioBuf, { contentType: "audio/mpeg", upsert: false });

      await admin.from("ai_studio_tts_renders").insert({
        voice_id,
        text,
        model_id,
        stability,
        similarity_boost,
        style,
        speed,
        audio_storage_path: audioPath,
        created_by: userData.user.id,
      });
    }

    return new Response(
      JSON.stringify({
        audio_base64: audioB64,
        mime: "audio/mpeg",
        audio_storage_path: audioPath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("tts error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
