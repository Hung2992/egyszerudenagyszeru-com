// AI Agent Bus — közös context store + event bus helper
// Bármelyik edge function importálhatja: import { publish, setContext, getContext, listRecentEvents } from "../_shared/agent-bus.ts"

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface PublishOpts {
  source: string;
  eventType: string;
  payload?: Record<string, unknown>;
  target?: string;
  severity?: "info" | "warning" | "error" | "critical";
  correlationId?: string;
}

export async function publish(supabase: SupabaseLike, opts: PublishOpts): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("ai_agent_bus_events").insert({
      event_type: opts.eventType,
      source_agent: opts.source,
      target_agent: opts.target ?? null,
      severity: opts.severity ?? "info",
      payload: opts.payload ?? {},
      correlation_id: opts.correlationId ?? null,
    }).select("id").maybeSingle();
    if (error) { console.warn("[agent-bus] publish failed:", error.message); return null; }
    return data?.id ?? null;
  } catch (e) { console.warn("[agent-bus] publish exception:", e); return null; }
}

export interface SetContextOpts {
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  producedBy: string;
  ttlSeconds?: number;
}

export async function setContext(supabase: SupabaseLike, opts: SetContextOpts): Promise<void> {
  try {
    const { error } = await supabase.from("ai_agent_bus_context").upsert({
      namespace: opts.namespace,
      key: opts.key,
      value: opts.value,
      produced_by: opts.producedBy,
      ttl_seconds: opts.ttlSeconds ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "namespace,key" });
    if (error) console.warn("[agent-bus] setContext failed:", error.message);
  } catch (e) { console.warn("[agent-bus] setContext exception:", e); }
}

export async function getContext(
  supabase: SupabaseLike, namespace: string, key?: string
): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
  try {
    let q = supabase.from("ai_agent_bus_context").select("key,value,produced_by,updated_at,expires_at").eq("namespace", namespace);
    if (key) {
      const { data } = await q.eq("key", key).maybeSingle();
      if (!data) return null;
      if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
      return data.value as Record<string, unknown>;
    }
    const { data } = await q;
    return (data || []).filter((r: any) => !r.expires_at || new Date(r.expires_at) >= new Date());
  } catch (e) { console.warn("[agent-bus] getContext exception:", e); return null; }
}

export async function listRecentEvents(
  supabase: SupabaseLike, opts: { agent?: string; eventTypePrefix?: string; since?: string; limit?: number } = {}
): Promise<any[]> {
  try {
    let q = supabase.from("ai_agent_bus_events").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 50);
    if (opts.agent) q = q.or(`source_agent.eq.${opts.agent},target_agent.eq.${opts.agent}`);
    if (opts.eventTypePrefix) q = q.like("event_type", `${opts.eventTypePrefix}%`);
    if (opts.since) q = q.gte("created_at", opts.since);
    const { data } = await q;
    return data || [];
  } catch { return []; }
}

/** Consume events: return unconsumed events for `agent`, then mark them consumed. */
export async function consumeEvents(
  supabase: SupabaseLike, agent: string, opts: { eventTypePrefix?: string; limit?: number } = {}
): Promise<any[]> {
  try {
    let q = supabase.from("ai_agent_bus_events").select("*")
      .not("consumed_by", "cs", `{${agent}}`)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 20);
    if (opts.eventTypePrefix) q = q.like("event_type", `${opts.eventTypePrefix}%`);
    const { data } = await q;
    const events = data || [];
    if (events.length) {
      const ids = events.map((e: any) => e.id);
      // Append agent to consumed_by array
      for (const ev of events) {
        const next = Array.from(new Set([...(ev.consumed_by || []), agent]));
        await supabase.from("ai_agent_bus_events").update({ consumed_by: next }).eq("id", ev.id);
      }
      await supabase.from("ai_agent_bus_subscriptions")
        .update({ last_consumed_at: new Date().toISOString() })
        .eq("agent_name", agent);
    }
    return events;
  } catch { return []; }
}
