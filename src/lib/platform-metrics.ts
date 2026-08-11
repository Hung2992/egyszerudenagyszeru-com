// Platform mérési réteg — fire-and-forget, sose blokkolja a UX-et.
import { supabase } from "@/integrations/supabase/untyped-client";

export type PlatformMetricType = "ai_build" | "ai_optimize" | "human_edit" | "publish_request" | "went_live";

export interface PlatformMetricInput {
  partnerId: string;
  metricType: PlatformMetricType;
  sessionId?: string | null;
  projectType?: string | null;
  qualityScore?: number | null;
  qaPassed?: boolean | null;
  applied?: boolean;
  durationMs?: number | null;
  patchFields?: number;
  metadata?: Record<string, unknown>;
}

export const logPlatformMetric = async (m: PlatformMetricInput): Promise<void> => {
  try {
    await supabase.from("platform_build_metrics").insert({
      partner_id: m.partnerId,
      session_id: m.sessionId ?? null,
      project_type: m.projectType ?? null,
      metric_type: m.metricType,
      quality_score: m.qualityScore ?? null,
      qa_passed: m.qaPassed ?? null,
      applied: m.applied ?? false,
      duration_ms: m.durationMs ?? null,
      patch_fields: m.patchFields ?? 0,
      metadata: m.metadata ?? {},
    });
  } catch {
    /* a mérés sosem törheti el az appot */
  }
};

// ── KPI számítás (tiszta függvények, tesztelhetők) ──────────────

export interface MetricRow {
  partner_id: string | null;
  metric_type: string;
  is_first_pass: boolean;
  quality_score: number | null;
  qa_passed: boolean | null;
  applied: boolean;
  duration_ms: number | null;
  ai_tokens: number;
  ai_cost_credits: number | string;
  created_at: string;
}

export interface PilotRow {
  partner_id: string | null;
  status: string;
  joined_at: string;
  first_live_at: string | null;
  churned_at: string | null;
}

const AI_TYPES = ["ai_build", "ai_optimize"];

/** 1. Time-to-live: átlagos idő az első AI beszélgetéstől az első élesítésig (óra). */
export const calcTimeToLive = (rows: MetricRow[], pilots: PilotRow[]): { avgHours: number | null; samples: number } => {
  const firstBuild = new Map<string, number>();
  for (const r of rows) {
    if (!r.partner_id || !AI_TYPES.includes(r.metric_type)) continue;
    const t = new Date(r.created_at).getTime();
    const prev = firstBuild.get(r.partner_id);
    if (prev === undefined || t < prev) firstBuild.set(r.partner_id, t);
  }
  const deltas: number[] = [];
  for (const p of pilots) {
    if (!p.partner_id || !p.first_live_at) continue;
    const start = firstBuild.get(p.partner_id) ?? new Date(p.joined_at).getTime();
    const delta = new Date(p.first_live_at).getTime() - start;
    if (delta > 0) deltas.push(delta / 3_600_000);
  }
  if (!deltas.length) return { avgHours: null, samples: 0 };
  return { avgHours: deltas.reduce((a, b) => a + b, 0) / deltas.length, samples: deltas.length };
};

/** 2. First-pass QA: hány százalék éri el 90+ pontot már az első generálásra. */
export const calcFirstPassQa = (rows: MetricRow[]) => {
  const first = rows.filter((r) => AI_TYPES.includes(r.metric_type) && r.is_first_pass);
  const pass = first.filter((r) => (r.quality_score ?? 0) >= 90).length;
  return { pct: first.length ? (pass / first.length) * 100 : null, total: first.length, pass };
};

/** 3. Human correction rate: kézi javítások aránya az összes módosításhoz képest. */
export const calcHumanCorrectionRate = (rows: MetricRow[]) => {
  const ai = rows.filter((r) => AI_TYPES.includes(r.metric_type)).length;
  const human = rows.filter((r) => r.metric_type === "human_edit").length;
  const total = ai + human;
  return { pct: total ? (human / total) * 100 : null, human, ai };
};

/** 4. AI költség / projekt (kredit) + token átlag. */
export const calcAiCostPerProject = (rows: MetricRow[]) => {
  const byPartner = new Map<string, { cost: number; tokens: number }>();
  for (const r of rows) {
    if (!r.partner_id || !AI_TYPES.includes(r.metric_type)) continue;
    const cur = byPartner.get(r.partner_id) ?? { cost: 0, tokens: 0 };
    cur.cost += Number(r.ai_cost_credits || 0);
    cur.tokens += Number(r.ai_tokens || 0);
    byPartner.set(r.partner_id, cur);
  }
  const list = [...byPartner.values()];
  if (!list.length) return { avgCost: null, avgTokens: null, projects: 0, totalCost: 0 };
  const totalCost = list.reduce((a, b) => a + b.cost, 0);
  return {
    avgCost: totalCost / list.length,
    avgTokens: list.reduce((a, b) => a + b.tokens, 0) / list.length,
    projects: list.length,
    totalCost,
  };
};

/** 5. Conversion uplift: A/B tesztek nyertes vs. kontroll konverziójának átlagos különbsége (%). */
export interface AbRow {
  variant_a_impressions: number | null;
  variant_b_impressions: number | null;
  variant_a_conversions: number | null;
  variant_b_conversions: number | null;
  status: string;
}
export const calcConversionUplift = (tests: AbRow[]) => {
  const deltas: number[] = [];
  for (const t of tests) {
    const ai = Number(t.variant_a_impressions || 0);
    const bi = Number(t.variant_b_impressions || 0);
    if (ai < 30 || bi < 30) continue;
    const a = Number(t.variant_a_conversions || 0) / ai;
    const b = Number(t.variant_b_conversions || 0) / bi;
    if (a <= 0) continue;
    deltas.push(((b - a) / a) * 100);
  }
  if (!deltas.length) return { pct: null, samples: 0 };
  return { pct: deltas.reduce((x, y) => x + y, 0) / deltas.length, samples: deltas.length };
};

/** 6. Partner retention: 1 / 3 / 6 hónap után aktív partnerek aránya. */
export const calcRetention = (pilots: PilotRow[], now: Date = new Date()) => {
  const months = [1, 3, 6];
  return months.map((m) => {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - m);
    const cohort = pilots.filter((p) => new Date(p.joined_at) <= cutoff);
    const retained = cohort.filter((p) => !p.churned_at || new Date(p.churned_at) > cutoff);
    return { month: m, cohort: cohort.length, retained: retained.length, pct: cohort.length ? (retained.length / cohort.length) * 100 : null };
  });
};
