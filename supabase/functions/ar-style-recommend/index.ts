// Sprint B — AI stílus ajánló
// POST { product_id, product_name, product_category?, product_colors?, occasion? }
// Válasz: { outfit_tip: string, suggestions: [{ category, keywords, why }], matched_products: [...] }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

const SYSTEM = `Te vagy az "Egyszerű de Nagyszerű" streetwear webshop AI stylist-je.
Feladat: adott terméket egészíts ki 3 komplementer darabbal (pl. ha cipő, akkor póló+nadrág+kiegészítő).
Csak JSON választ adj, semmi mást:
{
  "outfit_tip": "1-2 mondat magyar stílus-tanács tegezve",
  "suggestions": [
    { "category": "kategória neve", "keywords": ["kereső", "szavak"], "why": "miért illik hozzá 1 mondat" }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) return new Response(JSON.stringify({ error: 'no_key' }), { status: 500, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { product_id, product_name, product_category, product_colors, occasion } = body || {};
    if (!product_name) {
      return new Response(JSON.stringify({ error: 'missing_product_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userMsg = `Termék: ${product_name}
Kategória: ${product_category || 'ismeretlen'}
Színek: ${(product_colors || []).join(', ') || 'nem megadva'}
Alkalom: ${occasion || 'hétköznapi'}

Adj 3 komplementer darab javaslatot.`;

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
      return new Response(JSON.stringify({ error: 'ai_error', details: t.slice(0, 300) }),
        { status: aiResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await aiResp.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { outfit_tip: raw, suggestions: [] }; }

    // Match suggestions to real products
    const matched: any[] = [];
    for (const s of (parsed.suggestions || []).slice(0, 3)) {
      const kw = (s.keywords || [])[0];
      if (!kw) continue;
      const { data: prods } = await supabase.from('shop_products')
        .select('id, name, price, category, image_url')
        .eq('is_active', true)
        .or(`name.ilike.%${kw}%,category.ilike.%${kw}%,description.ilike.%${kw}%`)
        .limit(2);
      if (prods) matched.push({ suggestion: s, products: prods });
    }

    // Log
    if (product_id) {
      await supabase.from('ar_events').insert({
        event_type: 'style_recommend_generated',
        product_id,
        metadata: { suggestion_count: matched.length, occasion },
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({
      outfit_tip: parsed.outfit_tip || '',
      suggestions: parsed.suggestions || [],
      matched_products: matched,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
