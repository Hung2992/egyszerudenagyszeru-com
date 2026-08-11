// AI Memory shared helpers — signal recording and querying for Multi-Agent Memory
import { createClient } from "npm:@supabase/supabase-js@2";

export interface RecordSignalOpts {
  signalType: string;
  featureKey: string;
  featureValue?: string;
  context?: Record<string, unknown>;
  successScore?: number;
  confidence?: number;
  sourceCount?: number;
}

export async function recordSignal(supabase: any, opts: RecordSignalOpts): Promise<void> {
  try {
    const key = String(opts.featureKey || "").trim().slice(0, 240);
    const value = String(opts.featureValue || "").trim().slice(0, 240);
    const context = opts.context || {};
    const successScore = typeof opts.successScore === "number" ? Math.max(0, Math.min(100, opts.successScore)) : null;
    const confidence = typeof opts.confidence === "number" ? Math.max(0, Math.min(100, opts.confidence)) : null;
    const sourceCount = Math.max(1, opts.sourceCount ?? 1);

    if (!key) return;

    const { data: existing } = await supabase
      .from("ai_agent_memory_signals")
      .select("id,sample_count,source_count,success_score,confidence,context,first_seen_at,last_seen_at")
      .eq("signal_type", opts.signalType)
      .eq("feature_key", key)
      .eq("feature_value", value)
      .maybeSingle();

    if (existing) {
      const newSamples = (existing.sample_count || 0) + 1;
      const newSources = (existing.source_count || 0) + sourceCount;
      const newSuccess = successScore == null
        ? existing.success_score
        : existing.success_score == null
          ? successScore
          : Math.round((existing.success_score * (existing.sample_count || 1) + successScore) / newSamples);
      const newConfidence = confidence == null
        ? existing.confidence
        : existing.confidence == null
          ? confidence
          : Math.round((existing.confidence * (existing.sample_count || 1) + confidence) / newSamples);
      const mergedContext = { ...(existing.context || {}), ...context };
      await supabase.from("ai_agent_memory_signals").update({
        sample_count: newSamples,
        source_count: newSources,
        success_score: newSuccess,
        confidence: newConfidence,
        context: mergedContext,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("ai_agent_memory_signals").insert({
        signal_type: opts.signalType,
        feature_key: key,
        feature_value: value,
        context,
        sample_count: 1,
        source_count: sourceCount,
        success_score: successScore,
        confidence: confidence,
      });
    }
  } catch (e) {
    console.warn("[ai-memory] recordSignal failed:", (e as Error).message);
  }
}

export interface QuerySignalsOpts {
  signalTypes?: string[];
  projectType?: string;
  limit?: number;
  minConfidence?: number;
  activeOnly?: boolean;
}

export async function querySignals(supabase: any, opts: QuerySignalsOpts = {}): Promise<any[]> {
  try {
    let q = supabase.from("ai_agent_memory_signals").select("*");
    if (opts.activeOnly !== false) q = q.eq("is_active", true);
    if (opts.signalTypes?.length) q = q.in("signal_type", opts.signalTypes);
    if (opts.projectType) {
      q = q.or(`context->>project_type.eq.${opts.projectType},context->>project_type.is.null`);
    }
    if (typeof opts.minConfidence === "number") q = q.gte("confidence", opts.minConfidence);
    q = q.order("success_score", { ascending: false }).order("sample_count", { ascending: false });
    if (opts.limit) q = q.limit(opts.limit);
    const { data } = await q;
    return data || [];
  } catch (e) {
    console.warn("[ai-memory] querySignals failed:", (e as Error).message);
    return [];
  }
}

export function buildMemoryHint(signals: any[]): string {
  if (!signals.length) return "";
  const byType: Record<string, any[]> = {};
  for (const s of signals) {
    const t = s.signal_type || "egyéb";
    byType[t] = byType[t] || [];
    byType[t].push(s);
  }
  const lines: string[] = [];
  lines.push("PLATFORM-MEMÓRIA (anonimizált, összesített tanulási jelek — csak minta, ne másold szó szerint):");
  for (const [type, list] of Object.entries(byType)) {
    const top = list.slice(0, 5);
    lines.push(`- ${type}: ${top.map((s) => `${s.feature_key}${s.feature_value ? "=" + s.feature_value : ""} (${s.sample_count} minta, ${s.success_score ?? "?"}/100)`).join("; ")}`);
  }
  return lines.join("\n");
}

export async function collectAllSignals(supabase: any): Promise<{ collected: number; errors: string[] }> {
  const errors: string[] = [];
  let collected = 0;

  try {
    const [{ data: storefronts }, { data: buttonEvents }, { data: workflows }, { data: abTests }, { data: snapshots }] = await Promise.all([
      supabase.from("partner_storefronts").select("primary_color,accent_color,bg_color,text_color,font_heading,font_body,hero_cta_text,project_type,partner_id,id,display_name").limit(500),
      supabase.from("partner_storefront_button_events").select("event_type,url_type,partner_id,created_at").limit(2000),
      supabase.from("partner_workflow_runs").select("status,trigger_event,partner_id,created_at").limit(2000),
      supabase.from("partner_ab_tests").select("test_type,status,winner_variant,partner_id,created_at").limit(500),
      supabase.from("partner_ai_build_snapshots").select("quality_score,project_type,partner_id,created_at").limit(500),
    ]);

    const seen = new Set<string>();
    const upsert = async (opts: RecordSignalOpts) => {
      const key = `${opts.signalType}:${opts.featureKey}:${opts.featureValue || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      await recordSignal(supabase, opts);
      collected++;
    };

    for (const sf of storefronts || []) {
      const pt = String(sf.project_type || "webshop");
      const ctx = { project_type: pt };
      if (sf.primary_color) await upsert({ signalType: "design_color_primary", featureKey: sf.primary_color, featureValue: sf.text_color, context: ctx, successScore: 50 });
      if (sf.accent_color) await upsert({ signalType: "design_color_accent", featureKey: sf.accent_color, featureValue: sf.bg_color, context: ctx, successScore: 50 });
      if (sf.font_heading) await upsert({ signalType: "design_font_heading", featureKey: sf.font_heading, featureValue: sf.font_body, context: ctx, successScore: 50 });
      if (sf.hero_cta_text) await upsert({ signalType: "cta_text", featureKey: sf.hero_cta_text, context: ctx, successScore: 50 });
    }

    if (buttonEvents?.length) {
      const stats: Record<string, { total: number; clicks: number }> = {};
      for (const ev of buttonEvents) {
        const k = `${ev.url_type || "egyéb"}:${ev.event_type || "egyéb"}`;
        stats[k] = stats[k] || { total: 0, clicks: 0 };
        stats[k].total++;
        if (String(ev.event_type || "").toLowerCase() === "click") stats[k].clicks++;
      }
      for (const [k, v] of Object.entries(stats)) {
        const [urlType, eventType] = k.split(":");
        const score = v.total ? Math.round((v.clicks / v.total) * 100) : 0;
        await upsert({ signalType: "cta_url_type", featureKey: urlType, featureValue: eventType, context: {}, successScore: score, sourceCount: v.total });
      }
    }

    if (workflows?.length) {
      const stats: Record<string, { total: number; success: number }> = {};
      for (const w of workflows) {
        const k = String(w.trigger_event || "manual");
        stats[k] = stats[k] || { total: 0, success: 0 };
        stats[k].total++;
        if (String(w.status || "").toLowerCase() === "completed") stats[k].success++;
      }
      for (const [k, v] of Object.entries(stats)) {
        const score = v.total ? Math.round((v.success / v.total) * 100) : 0;
        await upsert({ signalType: "workflow_trigger", featureKey: k, context: {}, successScore: score, sourceCount: v.total });
      }
    }

    if (abTests?.length) {
      const winners: Record<string, { count: number; samples: number }> = {};
      for (const t of abTests) {
        if (String(t.status || "").toLowerCase() === "winner_selected" && t.winner_variant) {
          winners[t.winner_variant] = winners[t.winner_variant] || { count: 0, samples: 0 };
          winners[t.winner_variant].count++;
          winners[t.winner_variant].samples++;
        }
      }
      for (const [variant, v] of Object.entries(winners)) {
        await upsert({ signalType: "ab_winner", featureKey: variant, context: {}, successScore: 90, confidence: 80, sourceCount: v.samples });
      }
    }

    if (snapshots?.length) {
      const byProject: Record<string, { total: number; score: number; count: number }> = {};
      for (const s of snapshots) {
        const pt = String(s.project_type || "general");
        if (!byProject[pt]) byProject[pt] = { total: 0, score: 0, count: 0 };
        if (s.quality_score != null && s.quality_score >= 70) {
          byProject[pt].total++;
          byProject[pt].score += Number(s.quality_score);
          byProject[pt].count++;
        }
      }
      for (const [pt, v] of Object.entries(byProject)) {
        if (v.count > 0) {
          const avg = Math.round(v.score / v.count);
          await upsert({ signalType: "project_type_score", featureKey: pt, context: {}, successScore: avg, sourceCount: v.count });
        }
      }
    }
  } catch (e) {
    errors.push((e as Error).message);
    console.warn("[ai-memory] collectAllSignals failed:", (e as Error).message);
  }

  return { collected, errors };
}
