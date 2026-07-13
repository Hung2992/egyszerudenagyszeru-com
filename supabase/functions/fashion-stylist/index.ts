// Sprint B.5 — Fashion Stylist AI
// POST { occasion, style?, budget_max?, gender?, size?, user_prompt?, session_id? }
// Response: { session_id, outfit_tip, items: [{ slot, description, keywords, why, products:[...] }], total_price }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

const SYSTEM = `Te vagy az "Egyszerű de Nagyszerű" streetwear webshop AI Fashion Stylist-je.
Feladat: adott alkalomra, stílusra és költségkeretre állíts össze egy TELJES outfitet (3-5 darab: pl. felső, alsó, cipő, kiegészítő, felsőruházat).
Tegezz, magyarul beszélj, konkrét legyél. Csak JSON választ adj:
{
  "outfit_tip": "1-2 mondat, miért ez a szett — konkrét, stylist-hang.",
  "items": [
    { "slot": "felső|alsó|cipő|kiegészítő|felsőruházat", "description": "rövid leírás", "keywords": ["kereső","szavak","magyarul"], "why": "miért illik a szettbe és az alkalomhoz" }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) return json({ error: 'no_key' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const { occasion, style, budget_max, gender, size, user_prompt, session_id } = body;

    if (!occasion && !user_prompt) {
      return json({ error: 'missing_input' }, 400);
    }

    // Rate limit: max 10 stylist requests / 10 min / user (or IP fallback)
    if (userId) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('ai_stylist_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since);
      if ((count ?? 0) >= 10) return json({ error: 'rate_limited', retry_after: 600 }, 429);
    }

    const userMsg = `Alkalom: ${occasion || 'nem megadva'}
Stílus: ${style || 'nem megadva'}
Nem: ${gender || 'unisex'}
Méret: ${size || 'nem megadva'}
Költségkeret (Ft): ${budget_max ? `max ${budget_max}` : 'nincs korlát'}
Extra kérés: ${user_prompt || '-'}

Adj egy teljes szettet 3-5 darabbal.`;

    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return json({ error: 'ai_rate_limited' }, 429);
      if (aiResp.status === 402) return json({ error: 'ai_credits_exhausted' }, 402);
      return json({ error: 'ai_error', details: t.slice(0, 300) }, 500);
    }

    const data = await aiResp.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { outfit_tip: '', items: [] }; }

    const items: any[] = Array.isArray(parsed.items) ? parsed.items : [];

    // Match each item to real products from shop_products
    let totalPrice = 0;
    const enriched: any[] = [];
    for (const it of items.slice(0, 5)) {
      const kws: string[] = Array.isArray(it.keywords) ? it.keywords.filter(Boolean) : [];
      let products: any[] = [];
      if (kws.length) {
        const orFilter = kws.slice(0, 3).map(k => {
          const safe = String(k).replace(/[%,()]/g, ' ').slice(0, 40);
          return `name.ilike.%${safe}%,category.ilike.%${safe}%,description.ilike.%${safe}%`;
        }).join(',');
        let q = supabase.from('shop_products')
          .select('id, name, price, category, image_url, description')
          .eq('is_active', true)
          .or(orFilter)
          .limit(3);
        if (budget_max) q = q.lte('price', Number(budget_max));
        const { data: prods } = await q;
        products = prods ?? [];
      }
      if (products[0]?.price) totalPrice += Number(products[0].price);
      enriched.push({ ...it, products });
    }

    // Log session
    const { data: sess } = await supabase.from('ai_stylist_sessions').insert({
      user_id: userId,
      session_id: session_id ?? null,
      occasion, style, budget_max, gender, size,
      user_prompt: user_prompt ?? null,
      ai_outfit: { outfit_tip: parsed.outfit_tip, items },
      matched_products: enriched,
      total_price: totalPrice,
      tokens_used: data.usage?.total_tokens ?? null,
      status: 'completed',
    }).select('id').single();

    return json({
      session_id: sess?.id ?? null,
      outfit_tip: parsed.outfit_tip || '',
      items: enriched,
      total_price: totalPrice,
    });
  } catch (e) {
    return json({ error: 'internal', details: String(e).slice(0, 300) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
