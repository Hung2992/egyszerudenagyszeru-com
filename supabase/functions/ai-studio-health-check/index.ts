import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Check = {
  name: string;
  category: "secret" | "endpoint" | "storage" | "external";
  status: "ok" | "fail" | "warn";
  detail: string;
  duration_ms: number;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: any; ms: number }> {
  const t = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - t };
  } catch (error) {
    return { error, ms: Date.now() - t };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const checks: Check[] = [];
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // Auth + admin check
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

    // 1) SECRETS
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    checks.push({
      name: "ELEVENLABS_API_KEY",
      category: "secret",
      status: ELEVENLABS_API_KEY ? "ok" : "fail",
      detail: ELEVENLABS_API_KEY ? "Konfigurálva" : "Hiányzik",
      duration_ms: 0,
    });
    checks.push({
      name: "REPLICATE_API_TOKEN",
      category: "secret",
      status: REPLICATE_API_TOKEN ? "ok" : "fail",
      detail: REPLICATE_API_TOKEN ? "Konfigurálva" : "Hiányzik",
      duration_ms: 0,
    });
    checks.push({
      name: "LOVABLE_API_KEY",
      category: "secret",
      status: LOVABLE_API_KEY ? "ok" : "fail",
      detail: LOVABLE_API_KEY ? "Konfigurálva" : "Hiányzik",
      duration_ms: 0,
    });

    // 2) EXTERNAL APIs - élő hitelesítés
    if (ELEVENLABS_API_KEY) {
      const r = await timed(async () => {
        const resp = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        });
        const txt = await resp.text();
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        const j = JSON.parse(txt);
        return `Tier: ${j.tier ?? "?"} • Karakter: ${j.character_count ?? 0}/${j.character_limit ?? 0}`;
      });
      checks.push({
        name: "ElevenLabs API (élő hitelesítés)",
        category: "external",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    if (REPLICATE_API_TOKEN) {
      const r = await timed(async () => {
        const resp = await fetch("https://api.replicate.com/v1/account", {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        });
        const txt = await resp.text();
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        const j = JSON.parse(txt);
        return `Account: ${j.username ?? j.name ?? "ok"}`;
      });
      checks.push({
        name: "Replicate API (élő hitelesítés)",
        category: "external",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    if (LOVABLE_API_KEY) {
      const r = await timed(async () => {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        const txt = await resp.text();
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        return "Válasz OK";
      });
      checks.push({
        name: "Lovable AI Gateway (élő ping)",
        category: "external",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    // 3) STORAGE bucket
    {
      const r = await timed(async () => {
        const { data, error } = await admin.storage.getBucket("ai-studio-voices");
        if (error) throw error;
        return `Bucket: ${data?.name} • public: ${data?.public}`;
      });
      checks.push({
        name: "Storage: ai-studio-voices",
        category: "storage",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    // 4) DB táblák léte
    for (const table of ["ai_studio_voices", "ai_studio_renders", "ai_studio_tts_renders"]) {
      const r = await timed(async () => {
        const { error, count } = await admin
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return `${count ?? 0} sor`;
      });
      checks.push({
        name: `DB tábla: ${table}`,
        category: "storage",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    // 5) Edge functions deploy state — invoke OPTIONS / HEAD
    const fnBase = `${SUPABASE_URL}/functions/v1`;
    const fns = [
      "ai-studio-clone-voice",
      "ai-studio-tts",
      "ai-studio-render",
      "ai-studio-generate-bg",
      "ai-studio-generate-bg-video",
    ];
    for (const fn of fns) {
      const r = await timed(async () => {
        const resp = await fetch(`${fnBase}/${fn}`, {
          method: "OPTIONS",
          headers: { "Access-Control-Request-Method": "POST" },
        });
        if (resp.status >= 500) throw new Error(`HTTP ${resp.status}`);
        return `Deploy OK (${resp.status})`;
      });
      checks.push({
        name: `Edge function: ${fn}`,
        category: "endpoint",
        status: r.error ? "fail" : "ok",
        detail: r.error ? String(r.error?.message || r.error) : (r.result as string),
        duration_ms: r.ms,
      });
    }

    const summary = {
      total: checks.length,
      ok: checks.filter((c) => c.status === "ok").length,
      fail: checks.filter((c) => c.status === "fail").length,
      warn: checks.filter((c) => c.status === "warn").length,
    };

    return new Response(JSON.stringify({ summary, checks, ran_at: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-check error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", checks }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
