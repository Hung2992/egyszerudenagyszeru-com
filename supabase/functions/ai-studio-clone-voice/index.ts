import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) {
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

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string) || "Saját hang";
    const description = (form.get("description") as string) || "Egyedi klónozott hang";
    if (!file) throw new Error("Hangminta (mp3/wav/m4a) kötelező");
    if (file.size > 25 * 1024 * 1024) throw new Error("A fájl max 25MB lehet");
    if (file.size < 10 * 1024) throw new Error("A fájl túl kicsi (min 10KB) — tölts fel hosszabb mintát");

    // Normalize extension & MIME (ElevenLabs supports mp3/wav/m4a/flac/ogg/webm)
    const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const allowedExts = ["mp3", "wav", "m4a", "mp4", "flac", "ogg", "webm", "aac"];
    const ext = allowedExts.includes(rawExt) ? rawExt : "mp3";
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      mp4: "audio/mp4",
      aac: "audio/aac",
      flac: "audio/flac",
      ogg: "audio/ogg",
      webm: "audio/webm",
    };
    const mime = mimeMap[ext] || file.type || "audio/mpeg";

    const buf = new Uint8Array(await file.arrayBuffer());
    const samplePath = `samples/${userData.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("ai-studio-voices")
      .upload(samplePath, buf, { contentType: mime, upsert: false });
    if (upErr) throw new Error("Storage hiba: " + upErr.message);

    console.log("[clone-voice]", { user: userData.user.id, name, ext, mime, size: file.size });

    // Insert pending row
    const { data: voiceRow, error: insErr } = await admin
      .from("ai_studio_voices")
      .insert({
        name,
        description,
        sample_storage_path: samplePath,
        status: "cloning",
        created_by: userData.user.id,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // Send to ElevenLabs Instant Voice Clone
    const elFd = new FormData();
    elFd.append("name", name);
    elFd.append("description", description);
    elFd.append("remove_background_noise", "true");
    elFd.append("files", new Blob([buf], { type: file.type || "audio/mpeg" }), file.name);

    const elResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFd,
    });
    const elJson = await elResp.json().catch(() => ({}));
    if (!elResp.ok) {
      await admin.from("ai_studio_voices").update({
        status: "error",
        error_message: JSON.stringify(elJson).slice(0, 500),
      }).eq("id", voiceRow.id);
      throw new Error("ElevenLabs hiba: " + (elJson?.detail?.message || elResp.status));
    }

    const elevenVoiceId = elJson.voice_id;
    const { data: updated } = await admin
      .from("ai_studio_voices")
      .update({ status: "ready", elevenlabs_voice_id: elevenVoiceId })
      .eq("id", voiceRow.id)
      .select()
      .single();

    return new Response(JSON.stringify({ voice: updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clone-voice error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
