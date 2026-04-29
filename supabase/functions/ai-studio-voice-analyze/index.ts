// AI Studio Voice Analyze
// Bemenet: voice_sample_id, pitch_hz, tempo_wpm, duration_sec (a böngésző elemezte WebAudio-val)
// Csak elmentjük az adatbázisba — nincs külső API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { voice_sample_id, pitch_hz, tempo_wpm, duration_sec, analysis_data } = body;

    if (!voice_sample_id) {
      return new Response(JSON.stringify({ error: "voice_sample_id kötelező" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("ai_studio_voice_samples")
      .update({
        pitch_hz: pitch_hz ?? null,
        tempo_wpm: tempo_wpm ?? null,
        duration_sec: duration_sec ?? null,
        analysis_status: "ready",
        analysis_data: analysis_data ?? {},
      })
      .eq("id", voice_sample_id);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
