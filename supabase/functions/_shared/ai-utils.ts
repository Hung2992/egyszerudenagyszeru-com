// Közös AI segédfüggvények edge functionshöz: cache, kvóta, monitoring
// Használat: import { getFromCache, saveToCache, checkQuota, logMonitoring } from "../_shared/ai-utils.ts"

const CACHE_TTL_MINUTES = 60;
const DEFAULT_DAILY_LIMIT = 50;

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePrompt(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,!?;:"']/g, "");
}

export async function getCacheKey(functionName: string, prompt: string): Promise<string> {
  return await sha256(`${functionName}::${normalizePrompt(prompt)}`);
}

export async function getFromCache(
  supabase: any, functionName: string, prompt: string
): Promise<any | null> {
  try {
    const key = await getCacheKey(functionName, prompt);
    const { data } = await supabase
      .from("ai_response_cache")
      .select("id, response_data, expires_at, hit_count")
      .eq("cache_key", key)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!data) return null;
    // Increment hit count (fire-and-forget)
    supabase.from("ai_response_cache")
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq("id", data.id)
      .then(() => {}, () => {});
    return data.response_data;
  } catch {
    return null;
  }
}

export async function saveToCache(
  supabase: any, functionName: string, prompt: string, response: any
): Promise<void> {
  try {
    const key = await getCacheKey(functionName, prompt);
    const promptHash = await sha256(prompt);
    const expires = new Date(Date.now() + CACHE_TTL_MINUTES * 60_000).toISOString();
    await supabase.from("ai_response_cache").upsert({
      cache_key: key,
      function_name: functionName,
      prompt_hash: promptHash,
      response_data: response,
      expires_at: expires,
      hit_count: 0,
    }, { onConflict: "cache_key" });
  } catch (err) {
    console.warn("cache save failed:", err);
  }
}

export async function checkQuota(
  supabase: any, userId: string | null, functionName: string, dailyLimit = DEFAULT_DAILY_LIMIT
): Promise<{ allowed: boolean; used: number; limit: number }> {
  if (!userId) return { allowed: true, used: 0, limit: dailyLimit }; // anon: no per-user quota
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("ai_usage_quota")
      .select("request_count")
      .eq("user_id", userId).eq("function_name", functionName).eq("usage_date", today)
      .maybeSingle();
    const used = data?.request_count || 0;
    return { allowed: used < dailyLimit, used, limit: dailyLimit };
  } catch {
    return { allowed: true, used: 0, limit: dailyLimit };
  }
}

export async function incrementQuota(
  supabase: any, userId: string | null, functionName: string, tokens = 0, costCredits = 0
): Promise<void> {
  if (!userId) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Upsert with atomic increment via RPC-like pattern
    const { data: existing } = await supabase
      .from("ai_usage_quota")
      .select("id, request_count, token_count, estimated_cost_credits")
      .eq("user_id", userId).eq("function_name", functionName).eq("usage_date", today)
      .maybeSingle();
    if (existing) {
      await supabase.from("ai_usage_quota").update({
        request_count: (existing.request_count || 0) + 1,
        token_count: (existing.token_count || 0) + tokens,
        estimated_cost_credits: Number(existing.estimated_cost_credits || 0) + costCredits,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("ai_usage_quota").insert({
        user_id: userId, function_name: functionName, usage_date: today,
        request_count: 1, token_count: tokens, estimated_cost_credits: costCredits,
      });
    }
  } catch (err) {
    console.warn("quota increment failed:", err);
  }
}

export async function logMonitoring(
  supabase: any,
  functionName: string,
  severity: "info" | "warning" | "error" | "critical",
  eventType: string,
  message: string,
  metadata: any = {}
): Promise<void> {
  try {
    await supabase.from("ai_monitoring_events").insert({
      function_name: functionName,
      severity,
      event_type: eventType,
      message,
      metadata,
    });
  } catch (err) {
    console.warn("monitoring log failed:", err);
  }
}

export async function getUserIdFromRequest(supabase: any, req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const { data } = await supabase.auth.getUser(token);
    return data?.user?.id || null;
  } catch {
    return null;
  }
}
