// APEX AI Router — saját (self-hosted, ingyenes) AI szerverek + felhő tartalék.
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
}

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
    if (!res.ok) throw new Error(`local_${res.status}: ${(await res.text()).slice(0, 200)}`);
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
  if (!res.ok) throw new Error(`local_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("local_empty_response");
  return text;
}

async function callCloud(opts: AiChatOptions): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.cloudModel || "google/gemini-3.8-flash",
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
  return j?.choices?.[0]?.message?.content ?? "";
}

/**
 * Fő belépési pont: először a saját AI szervereket próbálja prioritás szerint,
 * majd (ha engedélyezett) a felhő tartalékot.
 */
export async function aiChat(opts: AiChatOptions): Promise<AiChatResult> {
  const db = admin();

  let preferLocal = true;
  let allowCloud = true;
  let endpoints: LocalEndpoint[] = [];

  try {
    const [{ data: settings }, { data: eps }] = await Promise.all([
      db.from("ai_routing_settings").select("prefer_local, allow_cloud_fallback").eq("id", true).maybeSingle(),
      db.from("ai_local_endpoints")
        .select("id, name, base_url, api_style, model, api_key, timeout_ms, supports_json")
        .eq("enabled", true)
        .order("priority", { ascending: true }),
    ]);
    if (settings) {
      preferLocal = settings.prefer_local !== false;
      allowCloud = settings.allow_cloud_fallback !== false;
    }
    endpoints = (eps as LocalEndpoint[]) || [];
  } catch (e) {
    console.warn("ai-router config load failed:", (e as Error).message);
  }

  const errors: string[] = [];

  if (preferLocal) {
    for (const ep of endpoints) {
      try {
        const content = await callLocalEndpoint(ep, opts);
        db.from("ai_local_endpoints").update({
          last_status: "ok",
          last_checked_at: new Date().toISOString(),
          last_error: null,
          success_count: undefined,
        }).eq("id", ep.id).then(() => {}, () => {});
        db.rpc("noop_placeholder").then(() => {}, () => {});
        return { content, source: "local", provider: ep.name };
      } catch (e) {
        const msg = (e as Error).message?.slice(0, 300) || "unknown";
        errors.push(`${ep.name}: ${msg}`);
        db.from("ai_local_endpoints").update({
          last_status: "error",
          last_checked_at: new Date().toISOString(),
          last_error: msg,
        }).eq("id", ep.id).then(() => {}, () => {});
      }
    }
  }

  if (!allowCloud) {
    throw new Error(errors.length ? `local_ai_unavailable: ${errors.join(" | ")}` : "no_local_ai_configured");
  }

  const content = await callCloud(opts);
  return { content, source: "cloud", provider: opts.cloudModel || "google/gemini-3.8-flash" };
}
