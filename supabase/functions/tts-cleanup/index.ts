// TTS cleanup — törli a lejárt mintákat és generálásokat (DB + storage)
// Cron-on fut naponta, de manuálisan is hívható az adminból.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // 1. Gyűjtsd össze a törlendő storage path-okat ELŐSZÖR
    const { data: expVoices } = await admin
      .from("tts_voices_v2")
      .select("id, sample_storage_path")
      .lt("expires_at", new Date().toISOString())
      .limit(500);

    const { data: expGens } = await admin
      .from("tts_generations_v2")
      .select("id, audio_storage_path")
      .lt("expires_at", new Date().toISOString())
      .limit(1000);

    const voicePaths = (expVoices || [])
      .map((v: any) => v.sample_storage_path)
      .filter((p: string) => !!p);
    const genPaths = (expGens || [])
      .map((g: any) => g.audio_storage_path)
      .filter((p: string) => !!p);

    // 2. Storage törlés batch-ekben
    let storageDeleted = 0;
    const allPaths = [...voicePaths, ...genPaths];
    for (let i = 0; i < allPaths.length; i += 100) {
      const batch = allPaths.slice(i, i + 100);
      const { error } = await admin.storage.from("tts-voices-v2").remove(batch);
      if (!error) storageDeleted += batch.length;
    }

    // 3. DB törlés (tts_cleanup_expired RPC)
    const { data: rpcResult, error: rpcErr } = await admin.rpc("tts_cleanup_expired");
    if (rpcErr) throw rpcErr;

    return new Response(JSON.stringify({
      success: true,
      storage_files_deleted: storageDeleted,
      ...rpcResult,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("tts-cleanup error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
