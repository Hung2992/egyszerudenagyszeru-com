// APEX Média Router — saját (self-hosted, ingyenes) kép/videó szerverek + felhő tartalék.
// Támogatott saját API stílusok:
//   - "a1111"      : Stable Diffusion WebUI (AUTOMATIC1111) /sdapi/v1/txt2img
//   - "openai"     : OpenAI-kompatibilis /v1/images/generations (pl. LocalAI, vLLM proxy)
//   - "apex_media" : egyszerű saját híd — POST {base}/generate {kind, prompt, ...}
//                    válasz: { b64 } vagy { url }
import { createClient } from "npm:@supabase/supabase-js@2";

export type MediaKind = "image" | "video";

export interface MediaOptions {
  kind: MediaKind;
  prompt: string;
  width?: number;
  height?: number;
  /** videónál másodperc */
  seconds?: number;
}

export interface MediaResult {
  bytes: Uint8Array;
  contentType: string;
  source: "local" | "cloud";
  provider: string;
  latencyMs: number;
}

interface MediaEndpoint {
  id: string;
  name: string;
  base_url: string;
  api_style: string;
  model: string;
  api_key: string | null;
  timeout_ms: number;
  cooldown_until?: string | null;
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

const trimUrl = (u: string) => u.replace(/\/+$/, "");

function safeError(raw: string) {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .replace(/(api[_-]?key"?\s*[:=]\s*"?)[^",\s]+/gi, "$1***")
    .slice(0, 240);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(10000, Math.min(timeoutMs, 600000)));
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function urlToBytes(url: string, timeoutMs: number): Promise<Uint8Array> {
  const res = await fetchWithTimeout(url, {}, timeoutMs);
  if (!res.ok) throw new Error(`media_download_${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function callLocalMedia(ep: MediaEndpoint, opts: MediaOptions): Promise<{ bytes: Uint8Array; contentType: string }> {
  const base = trimUrl(ep.base_url);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ep.api_key) headers["Authorization"] = `Bearer ${ep.api_key}`;
  const width = Math.min(Math.max(opts.width ?? 1024, 256), 2048);
  const height = Math.min(Math.max(opts.height ?? 1024, 256), 2048);

  if (ep.api_style === "a1111") {
    if (opts.kind !== "image") throw new Error("a1111_image_only");
    const res = await fetchWithTimeout(`${base}/sdapi/v1/txt2img`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: opts.prompt,
        negative_prompt: "lowres, blurry, watermark, text artifacts, deformed",
        width,
        height,
        steps: 28,
        cfg_scale: 6.5,
        sampler_name: "DPM++ 2M Karras",
      }),
    }, ep.timeout_ms);
    if (!res.ok) throw new Error(safeError(`local_${res.status}: ${await res.text()}`));
    const j = await res.json();
    const b64 = j?.images?.[0];
    if (!b64) throw new Error("local_empty_image");
    return { bytes: b64ToBytes(b64), contentType: "image/png" };
  }

  if (ep.api_style === "openai") {
    if (opts.kind !== "image") throw new Error("openai_image_only");
    const res = await fetchWithTimeout(`${base}/v1/images/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: ep.model,
        prompt: opts.prompt,
        size: `${width}x${height}`,
        n: 1,
        response_format: "b64_json",
      }),
    }, ep.timeout_ms);
    if (!res.ok) throw new Error(safeError(`local_${res.status}: ${await res.text()}`));
    const j = await res.json();
    const item = j?.data?.[0];
    if (item?.b64_json) return { bytes: b64ToBytes(item.b64_json), contentType: "image/png" };
    if (item?.url) return { bytes: await urlToBytes(item.url, ep.timeout_ms), contentType: "image/png" };
    throw new Error("local_empty_image");
  }

  // apex_media: saját híd (ComfyUI wrapper, AnimateDiff, LTX, stb.)
  const res = await fetchWithTimeout(`${base}/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind: opts.kind,
      model: ep.model,
      prompt: opts.prompt,
      width,
      height,
      seconds: Math.min(Math.max(opts.seconds ?? 5, 2), 20),
    }),
  }, ep.timeout_ms);
  if (!res.ok) throw new Error(safeError(`local_${res.status}: ${await res.text()}`));
  const j = await res.json();
  const contentType = j?.content_type || (opts.kind === "video" ? "video/mp4" : "image/png");
  if (j?.b64) return { bytes: b64ToBytes(j.b64), contentType };
  if (j?.url) return { bytes: await urlToBytes(j.url, ep.timeout_ms), contentType };
  throw new Error("local_empty_media");
}

async function callCloudImage(prompt: string): Promise<{ bytes: Uint8Array; contentType: string; provider: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("no_cloud_ai");
  const model = "google/gemini-3-pro-image-preview";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (res.status === 403) throw new Error("ai_blocked");
  if (res.status === 401) throw new Error("ai_unauthorized");
  if (!res.ok) throw new Error(`ai_error_${res.status}`);
  const j = await res.json();
  const dataUrl = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl || !dataUrl.startsWith("data:image/")) throw new Error("ai_empty_image");
  const contentType = dataUrl.slice(5, dataUrl.indexOf(";"));
  return { bytes: b64ToBytes(dataUrl), contentType, provider: model };
}

/** Média generálás: először saját ingyenes szerver, majd (ha engedélyezett) felhő tartalék. */
export async function generateMedia(opts: MediaOptions): Promise<MediaResult> {
  const db = admin();
  const started = Date.now();
  let preferLocal = true;
  let allowCloud = true;
  let endpoints: MediaEndpoint[] = [];

  try {
    const [{ data: settings }, { data: eps }] = await Promise.all([
      db.from("ai_routing_settings").select("prefer_local, allow_cloud_fallback").eq("id", true).maybeSingle(),
      db.from("ai_local_endpoints")
        .select("id, name, base_url, api_style, model, api_key, timeout_ms, cooldown_until")
        .eq("enabled", true)
        .eq("kind", opts.kind)
        .order("priority", { ascending: true }),
    ]);
    if (settings) {
      preferLocal = settings.prefer_local !== false;
      allowCloud = settings.allow_cloud_fallback !== false;
    }
    endpoints = (eps as MediaEndpoint[]) || [];
  } catch (e) {
    console.warn("media-router config load failed:", safeError((e as Error).message));
  }

  const errors: string[] = [];
  if (preferLocal) {
    const now = Date.now();
    const usable = endpoints.filter((ep) => !ep.cooldown_until || new Date(ep.cooldown_until).getTime() <= now);
    for (const ep of usable) {
      const t0 = Date.now();
      try {
        const { bytes, contentType } = await callLocalMedia(ep, opts);
        db.rpc("ai_endpoint_record", { _id: ep.id, _ok: true, _latency_ms: Date.now() - t0, _error: null })
          .then(() => {}, () => {});
        return { bytes, contentType, source: "local", provider: ep.name, latencyMs: Date.now() - started };
      } catch (e) {
        const msg = safeError((e as Error).message || "unknown");
        errors.push(`${ep.name}: ${msg}`);
        db.rpc("ai_endpoint_record", { _id: ep.id, _ok: false, _latency_ms: null, _error: msg })
          .then(() => {}, () => {});
      }
    }
  }

  if (opts.kind === "video") {
    throw new Error(
      errors.length
        ? `local_video_unavailable: ${errors.join(" | ")}`
        : "no_local_video_server",
    );
  }

  if (!allowCloud) {
    throw new Error(errors.length ? `local_media_unavailable: ${errors.join(" | ")}` : "no_local_media_server");
  }

  const cloud = await callCloudImage(opts.prompt);
  return { ...cloud, source: "cloud", latencyMs: Date.now() - started };
}
