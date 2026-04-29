// AI Studio TTS — saját rendszer
// Bemenet: text + voice_sample_id (opcionális, hangminta-elemzéshez igazítja a hangot)
// Lovable AI Gateway image/audio gen modelljei nem mind támogatnak TTS-t,
// ezért a Gemini "audio" outputot használjuk a gemini-2.5-flash-image helyett:
// valójában a böngésző native TTS-t (SpeechSynthesis) használjuk fallback-ként,
// ezt az endpoint csak metaadatot ad vissza (hangválasztás+pitch javaslat).
//
// Ha a Lovable AI Gateway natívan ad TTS-t, az itt cserélhető.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  text: string;
  voice_sample_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice_sample_id }: ReqBody = await req.json();
    if (!text || text.length < 1 || text.length > 5000) {
      return new Response(JSON.stringify({ error: "Hiányzó vagy hibás szöveg (1-5000 karakter)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Hangminta-paraméterek lekérése
    let pitch_hz = 150;
    let tempo_wpm = 140;
    if (voice_sample_id) {
      const { data: sample } = await supabase
        .from("ai_studio_voice_samples")
        .select("pitch_hz, tempo_wpm")
        .eq("id", voice_sample_id)
        .maybeSingle();
      if (sample) {
        pitch_hz = sample.pitch_hz ?? pitch_hz;
        tempo_wpm = sample.tempo_wpm ?? tempo_wpm;
      }
    }

    // Hangválasztás algoritmus a pitch alapján
    // Férfi: ~85-180 Hz, Női: ~165-255 Hz
    const isMale = pitch_hz < 165;
    const recommendedVoice = isMale
      ? (pitch_hz < 110 ? "deep_male" : "normal_male")
      : (pitch_hz > 220 ? "high_female" : "normal_female");

    // Emberi hang beállítások betöltése (alapértelmezések, ha nincs)
    const { data: settings } = await supabase
      .from("ai_studio_settings")
      .select("voice_naturalness, voice_variance, voice_breathiness, natural_pauses_enabled, avoid_robotic_perfection, preferred_voice_lang")
      .limit(1)
      .maybeSingle();

    const naturalness = settings?.voice_naturalness ?? 0.75;
    const variance = settings?.voice_variance ?? 0.35;
    const breathiness = settings?.voice_breathiness ?? 0.4;
    const naturalPauses = settings?.natural_pauses_enabled ?? true;
    const avoidPerfect = settings?.avoid_robotic_perfection ?? true;
    const lang = settings?.preferred_voice_lang ?? "hu-HU";

    // Természetes szünetek beszúrása vesszőknél/mondatok között
    let processedText = text;
    if (naturalPauses) {
      processedText = processedText
        .replace(/,\s*/g, ", ")        // rövid szünet vessző után
        .replace(/\.\s+/g, ". ")        // hosszabb mondat után
        .replace(/\?\s+/g, "? ")
        .replace(/!\s+/g, "! ");
    }

    // Apró ingadozás a sebességben/pitch-ben (kerüli a robot-tökéletességet)
    const baseRate = Math.max(0.7, Math.min(1.3, tempo_wpm / 140));
    const baseRand = avoidPerfect ? (Math.random() - 0.5) * variance * 0.15 : 0;
    const rate = +(baseRate + baseRand).toFixed(3);

    const basePitch = ((pitch_hz - 150) / 150) * 100;
    const pitchRand = avoidPerfect ? (Math.random() - 0.5) * variance * 8 : 0;
    const pitchAdjust = Math.round(basePitch + pitchRand);

    return new Response(JSON.stringify({
      ok: true,
      text: processedText,
      synthesis_hint: {
        voice: recommendedVoice,
        rate,
        pitch_percent: pitchAdjust,
        target_pitch_hz: pitch_hz,
        target_tempo_wpm: tempo_wpm,
        lang,
        naturalness,
        variance,
        breathiness,
        natural_pauses: naturalPauses,
        avoid_robotic_perfection: avoidPerfect,
      },
      // a böngésző oldalon SpeechSynthesis API-val olvasunk be (saját, ingyenes)
      mode: "browser_speech_synthesis",
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
