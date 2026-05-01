// Saját TTS klónozó — multi-provider + tartalom-/víruscheck
// XTTS-v2 / F5-TTS / Chatterbox / custom_gpu: csak feltöltjük a mintát
// ElevenLabs: regisztráljuk és tároljuk a voice_id-t

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

// AI-alapú tartalommoderáció (Gemini Flash) — szöveges leírás alapján flag-eli
async function aiModerateSample(name: string, description: string, durationSec: number) {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { ok: true, reason: "no_key" };
  const prompt = `Te egy hangminta-moderátor vagy. Egy felhasználó hangmintát tölt fel klónozáshoz.
Adatok:
- Név: "${name}"
- Leírás: "${description}"
- Hossz: ${durationSec.toFixed(1)} másodperc

Csak akkor utasítsd el (block:true), ha a NÉV vagy LEÍRÁS egyértelműen:
- híresség / politikus megszemélyesítésére utal névvel
- szándékos deepfake célt jelez
- gyűlöletbeszédet, fenyegetést, illegális tartalmat tartalmaz

Egyébként hagyd jóvá. Csak JSON: {"block":boolean,"reason":"rövid magyarul"}`;

  try {
    const resp = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) return { ok: true, reason: "ai_unavailable" };
    const j = await resp.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    return { ok: !parsed.block, reason: parsed.reason || "ok" };
  } catch (e) {
    return { ok: true, reason: "ai_error:" + String(e).slice(0, 80) };
  }
}

// ClamAV REST scan — opcionális, ha a settings-ben be van állítva endpoint
async function clamScan(buf: Uint8Array, endpoint: string) {
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: buf,
    });
    if (!resp.ok) return { clean: true, reason: "clamav_unavailable" };
    const j = await resp.json().catch(() => ({}));
    // Standard clamav-rest válasz: { Status: "OK" } vagy { Status: "FOUND", Description: "..." }
    if (j.Status === "FOUND" || j.infected === true) {
      return { clean: false, reason: j.Description || "infected" };
    }
    return { clean: true, reason: "ok" };
  } catch (e) {
    return { clean: true, reason: "clamav_error:" + String(e).slice(0, 80) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
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

    // TTS settings
    const { data: settings } = await admin.from("tts_settings").select("*").eq("id", 1).maybeSingle();
    const maxBytes = (settings?.max_sample_size_mb ?? 25) * 1024 * 1024;
    const allowedMimes: string[] = settings?.allowed_mime_types ?? [
      "audio/wav","audio/mpeg","audio/mp3","audio/x-m4a","audio/mp4","audio/ogg","audio/webm",
    ];

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string) || "Új hang";
    const description = (form.get("description") as string) || "";
    const modelSlug = (form.get("model_slug") as string) || "xtts-v2";

    if (!file) throw new Error("Hangminta fájl kötelező");

    // ============== 1. MÉRET / MIME CHECK ==============
    if (settings?.enable_size_check !== false) {
      if (file.size > maxBytes) throw new Error(`Túl nagy fájl (max ${settings?.max_sample_size_mb ?? 25}MB)`);
      if (file.size < 10 * 1024) throw new Error("Min 10KB — tölts fel hosszabb mintát");
      // MIME ellenőrzés (laza — ha üres, engedjük)
      if (file.type && !allowedMimes.includes(file.type)) {
        throw new Error(`MIME típus nem engedélyezett: ${file.type}`);
      }
    }

    // Modell lekérdezés
    const { data: model } = await admin.from("tts_models")
      .select("*").eq("slug", modelSlug).eq("is_active", true).maybeSingle();
    if (!model) throw new Error(`Modell nem található: ${modelSlug}`);

    // Fájl normalizálás
    const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const allowedExts = ["mp3", "wav", "m4a", "mp4", "flac", "ogg", "webm", "aac"];
    const ext = allowedExts.includes(rawExt) ? rawExt : "mp3";
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", mp4: "audio/mp4",
      aac: "audio/aac", flac: "audio/flac", ogg: "audio/ogg", webm: "audio/webm",
    };
    const mime = mimeMap[ext] || "audio/mpeg";
    const buf = new Uint8Array(await file.arrayBuffer());

    // Becsült hossz (durva: bitráta alapján — kb. 128kbps)
    const estDuration = file.size / 16000; // ~128kbps audio
    if (settings?.enable_size_check !== false && estDuration > (settings?.max_sample_duration_sec ?? 60) * 2) {
      throw new Error(`Túl hosszú hangminta (becslés: ${estDuration.toFixed(0)}s, max ${settings?.max_sample_duration_sec ?? 60}s)`);
    }

    // ============== 2. CLAMAV VÍRUSCHECK ==============
    let virusScanStatus = "skipped";
    if (settings?.enable_clamav_scan && settings?.clamav_endpoint) {
      const r = await clamScan(buf, settings.clamav_endpoint);
      virusScanStatus = r.clean ? "clean" : "infected";
      if (!r.clean) throw new Error(`Vírus észlelve: ${r.reason}`);
    }

    // ============== 3. AI MODERÁCIÓ ==============
    let moderationStatus = "skipped";
    let moderationNotes = "";
    if (settings?.enable_ai_moderation !== false) {
      const m = await aiModerateSample(name, description, estDuration);
      moderationStatus = m.ok ? "approved" : "rejected";
      moderationNotes = m.reason;
      if (!m.ok) throw new Error(`AI moderáció elutasította: ${m.reason}`);
    }

    // Storage upload
    const samplePath = `samples/${userData.user.id}/${Date.now()}_${modelSlug}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("tts-voices-v2")
      .upload(samplePath, buf, { contentType: mime, upsert: false });
    if (upErr) throw new Error("Storage hiba: " + upErr.message);

    // Voice rekord
    const { data: voiceRow, error: insErr } = await admin
      .from("tts_voices_v2")
      .insert({
        name, description, model_id: model.id,
        sample_storage_path: samplePath,
        status: "cloning", created_by: userData.user.id,
        moderation_status: moderationStatus,
        moderation_notes: moderationNotes,
        virus_scan_status: virusScanStatus,
        audio_duration_seconds: estDuration,
        file_size_bytes: file.size,
      }).select().single();
    if (insErr) throw insErr;

    // ============== PROVIDER ACTIONS ==============
    let providerVoiceId: string | null = null;
    let providerMetadata: any = {};

    if (model.provider === "replicate" || model.provider === "custom_gpu") {
      providerMetadata = { ref_audio_path: samplePath };
    } else if (model.provider === "elevenlabs") {
      const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      if (!EL_KEY) throw new Error("ELEVENLABS_API_KEY missing");

      const elFd = new FormData();
      elFd.append("name", name);
      elFd.append("description", description);
      elFd.append("remove_background_noise", "true");
      elFd.append("files", new Blob([buf], { type: mime }), `sample.${ext}`);

      const elResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: { "xi-api-key": EL_KEY, Accept: "application/json" },
        body: elFd,
      });
      const elText = await elResp.text();
      const elJson = (() => { try { return JSON.parse(elText); } catch { return { raw: elText }; } })();
      if (!elResp.ok) {
        const detail = elJson?.detail?.message || elJson?.detail?.[0]?.msg || elJson?.message || elJson?.raw || `HTTP ${elResp.status}`;
        await admin.from("tts_voices_v2").update({
          status: "error", error_message: String(detail).slice(0, 500),
        }).eq("id", voiceRow.id);
        throw new Error("ElevenLabs: " + detail);
      }
      providerVoiceId = elJson.voice_id;
      providerMetadata = { elevenlabs_response: elJson };
    } else {
      throw new Error(`Provider nem támogatott: ${model.provider}`);
    }

    const { data: updated } = await admin.from("tts_voices_v2")
      .update({
        status: "ready",
        provider_voice_id: providerVoiceId,
        provider_metadata: providerMetadata,
      })
      .eq("id", voiceRow.id).select("*, model:tts_models(*)").single();

    return new Response(JSON.stringify({ voice: updated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tts-clone-voice-v2 error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
