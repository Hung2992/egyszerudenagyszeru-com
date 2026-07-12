// 🤖 Sprint A.4 — AI Drop Copilot
// Admin conversational asszisztens drop-tervezéshez.
// POST { messages: [{role, content}], focus_drop_id?: uuid }
// Csak admin / drops_manager hívhatja.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson } from '../_shared/drop-utils.ts';

const MODEL = 'google/gemini-2.5-flash';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const SYSTEM_PROMPT = `Te vagy az "Egyszerű de Nagyszerű" streetwear webshop **Drop Copilot**-ja: egy adatvezérelt AI tanácsadó, aki drop-ok tervezésében segít az adminnak.

Feladataid:
- Javaslat készletszintre, indulási időpontra, drop típusra (first_come vs raffle), foglalási időre.
- Korábbi dropok teljesítményének értelmezése (konverzió, sellout sebesség, bot-terhelés).
- Konkrét, számokra épülő válaszok — SOHA ne találj ki adatot, csak a mellékelt kontextusból dolgozz.
- Ha nincs elég adat, mondd ki nyíltan, és javasolj konzervatív értékeket.

Stílus:
- Magyarul, tegezve, tömören.
- Használj markdown listát ha több javaslatod van.
- Ha konkrét számot mondasz, indokold meg 1 mondatban ("Az előző 3 hasonló drop átlaga alapján...").
- Zárd le a választ 1 konkrét cselekvési javaslattal.`;

async function gatherContext(admin: any, focusDropId?: string) {
  const [recentRes, statsRes, insightsRes, focusRes] = await Promise.all([
    admin.from('product_drops')
      .select('id, name, slug, drop_type, status, starts_at, total_units, reserved_count, sold_count')
      .order('starts_at', { ascending: false }).limit(15),
    admin.from('drop_performance_stats').select('*').limit(15),
    admin.from('drop_ai_insights')
      .select('drop_id, insight_type, summary, prediction, confidence_score, generated_at')
      .order('generated_at', { ascending: false }).limit(20),
    focusDropId
      ? admin.from('product_drops').select('*').eq('id', focusDropId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    recent_drops: recentRes.data ?? [],
    performance_stats: statsRes.data ?? [],
    recent_insights: insightsRes.data ?? [],
    focus_drop: focusRes.data ?? null,
  };
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
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) return dropJson({ error: 'messages_required' }, 400);

    const context = await gatherContext(admin, body?.focus_drop_id);

    const contextMsg = `Aktuális rendszer-kontextus (JSON, csak ebből dolgozz):\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return dropJson({ error: 'LOVABLE_API_KEY missing' }, 500);

    const aiResp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: contextMsg },
          ...messages,
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return dropJson({ error: 'Túl sok kérés, várj egy percet.' }, 429);
      if (aiResp.status === 402) return dropJson({ error: 'AI kredit elfogyott.' }, 402);
      return dropJson({ error: `ai_gateway_${aiResp.status}`, details: t.slice(0, 300) }, 500);
    }

    const data = await aiResp.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';
    const tokens = data?.usage?.total_tokens ?? 0;

    // fire-and-forget log
    admin.from('drop_events').insert({
      drop_id: body?.focus_drop_id ?? null,
      event_type: 'copilot_query',
      metadata: { user_id: userData.user.id, tokens, question: messages[messages.length - 1]?.content?.slice(0, 500) },
    }).then(() => {}, () => {});

    return dropJson({ ok: true, reply, tokens });
  } catch (e) {
    console.error('drop-copilot fatal', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
