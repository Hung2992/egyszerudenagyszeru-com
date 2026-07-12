// Sprint B.3 — AI AR Commerce Optimizer
// Elemzi az ar_events, orders és shop_products összefüggéseit,
// konkrét, számokra épülő optimalizálási javaslatokat ad az adminnak.
// POST — admin only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';
import { dropCors, dropJson } from '../_shared/drop-utils.ts';

const MODEL = 'google/gemini-2.5-flash';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const SYSTEM_PROMPT = `Te vagy az "Egyszerű de Nagyszerű" streetwear webshop **AR Commerce Optimizer**-je.
A feladatod: a mellékelt AR használati, rendelési és termékadatokból konkrét, számokra épülő optimalizálási javaslatokat generálni.

Három kategóriát tölts:
1. product — konkrét termékekhez kötött javaslat (pl. "A fekete sneakernél magas az AR, alacsony a kosárba tétel — csökkentsd az árat 8%-kal, vagy javítsd a leírást").
2. asset — 3D asset minőségi/UX javaslat (pl. "Kevés az AR indítás a 3D nézetből — helyezd feljebb a CTA-t").
3. marketing — kampány/megjelenítési javaslat (pl. "Ezt a 2 terméket emeld ki AR kampányban").

Szabályok:
- SOHA ne találj ki adatot. Csak a kontextusból dolgozz.
- Minden javaslat tartalmazzon: title (rövid, max 60 char), reasoning (1-2 mondat, konkrét számmal), action (1 mondat, cselekvés), impact (low|medium|high).
- Ha valamelyik kategóriához nincs elég adat, adj vissza üres tömböt és egy note-ot.
- Válaszod SZIGORÚAN JSON: { "product": [...], "asset": [...], "marketing": [...], "summary": "1-2 mondatos vezetői összefoglaló", "generated_at": ISO }`;

async function gatherContext(admin: any) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [eventsRes, ordersRes, assetsRes, productsRes] = await Promise.all([
    admin.from('ar_events')
      .select('product_id, event_type, device_type, session_id, created_at')
      .gte('created_at', since)
      .limit(5000),
    admin.from('orders')
      .select('id, session_id, total_amount, items, created_at')
      .gte('created_at', since)
      .limit(2000),
    admin.from('product_3d_assets')
      .select('product_id, glb_url, usdz_url, poster_url, ar_enabled, is_active, created_at')
      .eq('is_active', true),
    admin.from('shop_products')
      .select('id, name, category, price, stock, is_active')
      .eq('is_active', true)
      .limit(500),
  ]);

  const events = (eventsRes.data ?? []) as any[];
  const orders = (ordersRes.data ?? []) as any[];
  const assets = (assetsRes.data ?? []) as any[];
  const products = (productsRes.data ?? []) as any[];

  // Termékenkénti AR metrikák
  const perProduct = new Map<string, { views: number; ar: number; style: number; sessions: Set<string> }>();
  events.forEach((e) => {
    if (!e.product_id) return;
    if (!perProduct.has(e.product_id)) perProduct.set(e.product_id, { views: 0, ar: 0, style: 0, sessions: new Set() });
    const p = perProduct.get(e.product_id)!;
    if (e.session_id) p.sessions.add(e.session_id);
    if (e.event_type === '3d_view_open') p.views++;
    if (e.event_type === 'ar_launch') p.ar++;
    if (e.event_type?.startsWith('style_recommend')) p.style++;
  });

  // AR használó session-ök -> vásárláshoz kötés
  const arSessions = new Set<string>();
  events.forEach((e) => {
    if (e.session_id && (e.event_type === '3d_view_open' || e.event_type === 'ar_launch')) arSessions.add(e.session_id);
  });
  let arRevenue = 0, arOrders = 0, otherRevenue = 0, otherOrders = 0;
  orders.forEach((o) => {
    const amt = Number(o.total_amount) || 0;
    if (o.session_id && arSessions.has(o.session_id)) { arRevenue += amt; arOrders++; }
    else { otherRevenue += amt; otherOrders++; }
  });

  const productStats = Array.from(perProduct.entries()).map(([pid, s]) => {
    const prod = products.find((p) => p.id === pid);
    return {
      product_id: pid,
      name: prod?.name ?? 'ismeretlen',
      category: prod?.category,
      price: prod?.price,
      stock: prod?.stock,
      views_3d: s.views,
      ar_launches: s.ar,
      style_opens: s.style,
      unique_sessions: s.sessions.size,
      ar_conversion: s.views > 0 ? +(s.ar / s.views).toFixed(3) : 0,
    };
  }).sort((a, b) => b.views_3d - a.views_3d).slice(0, 30);

  return {
    window: '30 nap',
    totals: {
      ar_events: events.length,
      unique_ar_sessions: arSessions.size,
      active_3d_assets: assets.length,
      total_orders: orders.length,
    },
    ar_vs_other: {
      ar_orders: arOrders,
      ar_revenue: arRevenue,
      ar_aov: arOrders ? Math.round(arRevenue / arOrders) : 0,
      other_orders: otherOrders,
      other_aov: otherOrders ? Math.round(otherRevenue / otherOrders) : 0,
    },
    top_products: productStats,
    assets_missing_usdz: assets.filter((a) => !a.usdz_url).length,
    assets_missing_poster: assets.filter((a) => !a.poster_url).length,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: dropCors });
  if (req.method !== 'POST') return dropJson({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return dropJson({ error: 'unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) return dropJson({ error: 'unauthorized' }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    if (!isAdmin) return dropJson({ error: 'forbidden' }, 403);

    const context = await gatherContext(admin);

    if (context.totals.ar_events === 0) {
      return dropJson({
        ok: true,
        insights: {
          product: [],
          asset: [],
          marketing: [],
          summary: 'Az elmúlt 30 napban nincs AR esemény — először tölts fel legalább 1 aktív 3D modellt és várj némi forgalmat.',
          generated_at: new Date().toISOString(),
        },
        context_summary: context.totals,
      });
    }

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return dropJson({ error: 'LOVABLE_API_KEY missing' }, 500);

    const aiResp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Kontextus (JSON):\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nAdj JSON választ a megadott sémával.` },
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
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    let insights: any = {};
    try { insights = JSON.parse(raw); } catch { insights = { summary: raw, product: [], asset: [], marketing: [] }; }
    if (!insights.generated_at) insights.generated_at = new Date().toISOString();

    // naplózás
    admin.from('ai_events').insert({
      event_type: 'ar_commerce_optimizer_run',
      user_id: userData.user.id,
      metadata: {
        tokens: data?.usage?.total_tokens ?? 0,
        product_count: insights?.product?.length ?? 0,
        asset_count: insights?.asset?.length ?? 0,
        marketing_count: insights?.marketing?.length ?? 0,
      },
    }).then(() => {}, () => {});

    return dropJson({ ok: true, insights, context_summary: context.totals, tokens: data?.usage?.total_tokens ?? 0 });
  } catch (e) {
    console.error('ar-commerce-optimizer fatal', e);
    return dropJson({ error: (e as Error).message }, 500);
  }
});
