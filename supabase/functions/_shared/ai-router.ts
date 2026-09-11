// APEX AI Router — saját (self-hosted, ingyenes) AI szerverek + felhő tartalék.
// Képességek: prioritásos routing, cooldown/circuit breaker, újrapróbálkozás,
// késleltetés-mérés, több felhő modell tartalék, részletes statisztika.
//
// Használat:
//   import { aiChat } from "../_shared/ai-router.ts";
//   const { content, source } = await aiChat({ system, user, jsonMode: true });
import { createClient } from "npm:@supabase/supabase-js@2";

export interface AiChatOptions {
  system: string;
  user: string;
  jsonMode?: boolean;
  /** Felhő fallback modell (Lovable AI Gateway). */
  cloudModel?: string;
  maxTokens?: number;
  /** Hívó függvény neve (naplózáshoz). */
  functionName?: string;
}

export interface AiChatResult {
  content: string;
  /** "local" = saját szerver, "cloud" = Lovable AI Gateway */
  source: "local" | "cloud";
  provider: string;
  latencyMs: number;
  attempts: number;
}

interface LocalEndpoint {
  id: string;
  name: string;
  base_url: string;
  api_style: "openai" | "ollama";
  model: string;
  api_key: string | null;
  timeout_ms: number;
  supports_json: boolean;
  max_retries?: number;
  cooldown_until?: string | null;
  avg_latency_ms?: number;
}

const CLOUD_FALLBACK_MODELS = [
  "google/gemini-3.8-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.1-flash-lite",
];

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function trimUrl(u: string) {
  return u.replace(/\/+$/, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hibaüzenet tisztítása: ne szivárogjon kulcs vagy belső részlet. */
function safeError(raw: string) {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .replace(/(api[_-]?key"?\s*[:=]\s*"?)[^",\s]+/gi, "$1***")
    .slice(0, 240);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(5000, Math.min(timeoutMs, 300000)));
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Egy saját végpont meghívása (OpenAI-kompatibilis vagy Ollama natív API). */
export async function callLocalEndpoint(
  ep: LocalEndpoint,
  opts: AiChatOptions,
): Promise<string> {
  const messages = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];
  const base = trimUrl(ep.base_url);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ep.api_key) headers["Authorization"] = `Bearer ${ep.api_key}`;

  if (ep.api_style === "ollama") {
    const res = await fetchWithTimeout(`${base}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: ep.model,
        messages,
        stream: false,
        ...(opts.jsonMode && ep.supports_json ? { format: "json" } : {}),
        options: { num_predict: opts.maxTokens ?? 2048 },
      }),
    }, ep.timeout_ms);
    if (!res.ok) throw new Error(safeError(`local_${res.status}: ${await res.text()}`));
    const j = await res.json();
    const text = j?.message?.content ?? "";
    if (!text) throw new Error("local_empty_response");
    return text;
  }

  const res = await fetchWithTimeout(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: ep.model,
      messages,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.jsonMode && ep.supports_json ? { response_format: { type: "json_object" } } : {}),
    }),
  }, ep.timeout_ms);
  if (!res.ok) throw new Error(safeError(`local_${res.status}: ${await res.text()}`));
  const j = await res.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("local_empty_response");
  return text;
}

async function callCloudOnce(model: string, opts: AiChatOptions): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (res.status === 403) throw new Error("ai_blocked");
  if (res.status === 401) throw new Error("ai_unauthorized");
  if (!res.ok) throw new Error(`ai_error_${res.status}`);
  const j = await res.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("ai_empty_response");
  return text;
}

/** Felhő hívás modell-tartalékkal: átmeneti hibáknál másik modellre vált. */
async function callCloud(opts: AiChatOptions): Promise<{ content: string; model: string }> {
  const models = [opts.cloudModel, ...CLOUD_FALLBACK_MODELS].filter(
    (m, i, arr): m is string => !!m && arr.indexOf(m) === i,
  );
  let lastErr: Error | null = null;
  for (const model of models) {
    try {
      return { content: await callCloudOnce(model, opts), model };
    } catch (e) {
      const msg = (e as Error).message;
      lastErr = e as Error;
      // Terminális hibák: nincs értelme másik modellt próbálni.
      if (msg === "credits_exhausted" || msg === "ai_blocked" || msg === "ai_unauthorized" ||
          msg === "LOVABLE_API_KEY missing") {
        throw e;
      }
      if (msg === "rate_limit") await sleep(800);
    }
  }
  throw lastErr ?? new Error("ai_error_unknown");
}

export async function aiChat(opts: AiChatOptions): Promise<AiChatResult> {
  const db = admin();
  const started = Date.now();
  let attempts = 0;
  let preferLocal = true;
  let allowCloud = true;
  let endpoints: LocalEndpoint[] = [];

  try {
    const [{ data: settings }, { data: eps }] = await Promise.all([
      db.from("ai_routing_settings").select("prefer_local, allow_cloud_fallback").eq("id", true).maybeSingle(),
      db.from("ai_local_endpoints")
        .select("id, name, base_url, api_style, model, api_key, timeout_ms, supports_json, max_retries, cooldown_until, avg_latency_ms")
        .eq("enabled", true)
        .order("priority", { ascending: true }),
    ]);
    if (settings) {
      preferLocal = settings.prefer_local !== false;
      allowCloud = settings.allow_cloud_fallback !== false;
    }
    endpoints = (eps as LocalEndpoint[]) || [];
  } catch (e) {
    console.warn("ai-router config load failed:", safeError((e as Error).message));
  }

  const errors: string[] = [];

  if (preferLocal) {
    const now = Date.now();
    // A hibás (cooldown alatti) szervereket kihagyjuk.
    const usable = endpoints.filter(
      (ep) => !ep.cooldown_until || new Date(ep.cooldown_until).getTime() <= now,
    );
    for (const ep of usable) {
      const retries = Math.max(0, Math.min(ep.max_retries ?? 1, 3));
      for (let attempt = 0; attempt <= retries; attempt++) {
        attempts++;
        const t0 = Date.now();
        try {
          const content = await callLocalEndpoint(ep, opts);
          const latency = Date.now() - t0;
          db.rpc("ai_endpoint_record", { _id: ep.id, _ok: true, _latency_ms: latency, _error: null })
            .then(() => {}, () => {});
          return { content, source: "local", provider: ep.name, latencyMs: Date.now() - started, attempts };
        } catch (e) {
          const msg = safeError((e as Error).message || "unknown");
          if (attempt === retries) {
            errors.push(`${ep.name}: ${msg}`);
            db.rpc("ai_endpoint_record", { _id: ep.id, _ok: false, _latency_ms: null, _error: msg })
              .then(() => {}, () => {});
          } else {
            await sleep(400 * (attempt + 1));
          }
        }
      }
    }
  }

  if (!allowCloud) {
    throw new Error(
      errors.length ? `local_ai_unavailable: ${errors.join(" | ")}` : "no_local_ai_configured",
    );
  }

  attempts++;
  const { content, model } = await callCloud(opts);
  return { content, source: "cloud", provider: model, latencyMs: Date.now() - started, attempts };
}
