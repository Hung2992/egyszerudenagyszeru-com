// 🤖 Drop AI Analytics — előrejelzés, timing, executive summary
// POST { drop_id: uuid, insight_types?: string[] }
// Adminok / drops_manager hívhatja
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson } from '../_shared/drop-utils.ts';

const MODEL = 'google/gemini-2.5-flash';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL_VERSION = `${MODEL}@v1`;

type InsightType = 'demand_forecast' | 'timing' | 'executive_summary' | 'stock_recommendation';

async function callAi(system: string, user: string): Promise<{ content: string; parsed: any | null }> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY missing');
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ai_gateway_${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '{}';
  let parsed: any = null;
  try { parsed = JSON.parse(content); } catch { parsed = null; }
  return { content, parsed };
}

async function gatherContext(admin: any, dropId: string) {
  const [dropRes, statsRes, eventsRes, reservationsRes, rafflesRes, similarRes] = await Promise.all([
    admin.from('product_drops').select('*').eq('id', dropId).maybeSingle(),
    admin.from('drop_performance_stats').select('*').eq('drop_id', dropId).maybeSingle(),
    admin.from('drop_events').select('event_type, created_at').eq('drop_id', dropId).order('created_at', { ascending: false }).limit(500),
    admin.from('drop_reservations').select('status, created_at, expires_at').eq('drop_id', dropId).limit(500),
    admin.from('drop_raffle_entries').select('status, created_at').eq('drop_id', dropId).limit(500),
    admin.from('product_drops').select('id, name, drop_type, stock_total, sold_count, opens_at, closes_at, status').neq('id', dropId).in('status', ['closed', 'drawn', 'sold_out']).order('opens_at', { ascending: false }).limit(10),
  ]);

  // Aggregate events by hour-of-day and weekday for timing
  const hourly: Record<number, number> = {};
  const weekday: Record<number, number> = {};
  for (const e of eventsRes.data ?? []) {
    const d = new Date(e.created_at);
    hourly[d.getUTCHours()] = (hourly[d.getUTCHours()] ?? 0) + 1;
    weekday[d.getUTCDay()] = (weekday[d.getUTCDay()] ?? 0) + 1;
  }

  const eventCounts: Record<string, number> = {};
  for (const e of eventsRes.data ?? []) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  }

  return {
    drop: dropRes.data,
    stats: statsRes.data,
    event_counts: eventCounts,
    hourly_activity: hourly,
    weekday_activity: weekday,
    reservations_count: reservationsRes.data?.length ?? 0,
    raffle_entries_count: rafflesRes.data?.length ?? 0,
    similar_drops: similarRes.data ?? [],
  };
}

const PROMPTS: Record<InsightType, { system: string; schema: string }> = {
  demand_forecast: {
    system: 'Te egy streetwear drop analitikai szakértő vagy. Elemzed a drop keresleti adatait és előrejelzést készítesz. Válaszolj MAGYARUL, JSON formátumban.',
    schema: `Válasz JSON séma:
{
  "demand_score": 0-100 közötti szám,
  "expected_sellout_minutes": becsült elfogyási idő percben (vagy null ha nem alkalmazható),
  "recommended_stock_units": ajánlott készlet a következő drophoz,
  "recommended_stock_change_pct": százalékos változtatás a jelenlegihez képest,
  "demand_level": "very_low"|"low"|"medium"|"high"|"very_high",
  "summary": rövid magyar magyarázat (max 3 mondat)
}`,
  },
  timing: {
    system: 'Te egy drop timing szakértő vagy. Vizsgálod, mikor voltak a legaktívabb időpontok és javaslatot teszel a következő drop indulásához. Válaszolj MAGYARUL, JSON formátumban.',
    schema: `Válasz JSON séma:
{
  "best_hour_utc": 0-23,
  "best_weekday": 0-6 (0=vasárnap),
  "recommended_launch_iso": következő javasolt indulási időpont ISO-ban (opcionális),
  "expected_uplift_pct": várható javulás százalékban a jelenlegihez képest,
  "summary": magyar magyarázat (max 3 mondat)
}`,
  },
  stock_recommendation: {
    system: 'Te egy készlet-optimalizáló szakértő vagy streetwear dropokhoz. Válaszolj MAGYARUL, JSON formátumban.',
    schema: `Válasz JSON séma:
{
  "recommended_stock_units": ajánlott darabszám,
  "confidence": 0-100,
  "risk_flags": ["low_conversion"|"bot_risk"|"insufficient_data"|...],
  "summary": magyar magyarázat (max 3 mondat)
}`,
  },
  executive_summary: {
    system: 'Te egy vezetői elemzést készítő AI vagy streetwear dropokhoz. Elemezd mi működött, mi nem, és mit változtass a következő dropnál. Válaszolj MAGYARUL, JSON formátumban.',
    schema: `Válasz JSON séma:
{
  "what_worked": [3-5 pont, magyar],
  "what_did_not_work": [3-5 pont, magyar],
  "next_time_recommendations": [3-5 konkrét akció, magyar],
  "overall_grade": "A"|"B"|"C"|"D"|"F",
  "summary": 2-3 mondatos vezetői összefoglaló magyarul
}`,
  },
};

async function generateInsight(admin: any, dropId: string, type: InsightType, context: any) {
  const cfg = PROMPTS[type];
  const userMsg = `${cfg.schema}\n\nDrop adatok:\n${JSON.stringify(context, null, 2)}`;
  const { content, parsed } = await callAi(cfg.system, userMsg);

  // Confidence heuristika
  const dataPoints = (context.event_counts && Object.values(context.event_counts).reduce((a: number, b: any) => a + Number(b), 0)) || 0;
  const confidence = Math.min(95, 30 + Math.log10(Math.max(dataPoints, 1)) * 20);

  const summary = parsed?.summary ?? content.slice(0, 300);

  const { data, error } = await admin.from('drop_ai_insights').insert({
    drop_id: dropId,
    insight_type: type,
    prediction: parsed ?? { raw: content },
    summary,
    confidence_score: Number(confidence.toFixed(2)),
    model_version: MODEL_VERSION,
    input_snapshot: {
      event_counts: context.event_counts,
      stats: context.stats,
      similar_drops_count: context.similar_drops?.length ?? 0,
    },
  }).select('*').single();

  if (error) throw new Error(`insight_insert_${type}: ${error.message}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: dropCors });
  if (req.method !== 'POST') return dropJson({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return dropJson({ error: 'unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) return dropJson({ error: 'unauthorized' }, 401);

    const admin = createClient(url, service);
    const { data: canManage } = await admin.rpc('can_manage_drops', { _user_id: userData.user.id });
    if (!canManage) return dropJson({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const dropId: string = body?.drop_id;
    if (!dropId) return dropJson({ error: 'drop_id_required' }, 400);

    const requested: InsightType[] = Array.isArray(body?.insight_types) && body.insight_types.length > 0
      ? body.insight_types
      : ['demand_forecast', 'timing', 'stock_recommendation', 'executive_summary'];

    const context = await gatherContext(admin, dropId);
    if (!context.drop) return dropJson({ error: 'drop_not_found' }, 404);

    const results: any[] = [];
    const errors: any[] = [];
    for (const t of requested) {
      try {
        const insight = await generateInsight(admin, dropId, t, context);
        results.push(insight);
      } catch (e) {
        console.error('insight_error', t, e);
        errors.push({ type: t, error: (e as Error).message });
      }
    }

    return dropJson({ ok: true, drop_id: dropId, insights: results, errors });
  } catch (e) {
    console.error('drop-ai-analyze fatal', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
