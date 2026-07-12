// Product Embedding indexer - admin-triggered. Indexes one product or a batch.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  product_id?: string;
  batch?: boolean;    // process next N missing
  limit?: number;
  force?: boolean;    // re-embed even if exists
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Bejelentkezés szükséges' }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    const uid = userData.user?.id;
    if (!uid) return json({ error: 'Érvénytelen token' }, 401);
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'Csak admin' }, 403);

    const body: Body = await req.json().catch(() => ({}));
    let products: any[] = [];

    if (body.product_id) {
      const { data } = await admin
        .from('shop_products')
        .select('id,name,category,brand,short_description,image_url,ai_hero_image_url')
        .eq('id', body.product_id).limit(1);
      products = data ?? [];
    } else if (body.batch) {
      // find products without ready embedding
      const limit = body.limit ?? 20;
      const { data } = await admin.rpc('exec', {}).then(() => ({ data: null })).catch(() => ({ data: null }));
      // Fallback simple query
      const { data: allP } = await admin
        .from('shop_products')
        .select('id,name,category,brand,short_description,image_url,ai_hero_image_url')
        .not('image_url', 'is', null)
        .limit(200);
      const { data: existing } = await admin
        .from('product_embeddings')
        .select('product_id').eq('status', 'ready');
      const done = new Set((existing ?? []).map(r => r.product_id));
      products = (allP ?? []).filter(p => body.force || !done.has(p.id)).slice(0, limit);
    } else {
      return json({ error: 'product_id vagy batch szükséges' }, 400);
    }

    const results: any[] = [];
    for (const p of products) {
      const img = p.ai_hero_image_url || p.image_url;
      if (!img) { results.push({ id: p.id, skipped: 'nincs kép' }); continue; }

      // Upsert pending
      await admin.from('product_embeddings').upsert({
        product_id: p.id,
        image_url: img,
        status: 'processing',
      }, { onConflict: 'product_id,image_url' });

      const text = [p.name, p.category, p.brand, p.short_description].filter(Boolean).join(' | ');

      try {
        // Fetch image bytes and convert to data URL (Gemini needs image content)
        const imgRes = await fetch(img);
        if (!imgRes.ok) throw new Error(`kép letöltés: ${imgRes.status}`);
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${b64(buf)}`;

        const embedRes = await fetch(`${GATEWAY}/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
          body: JSON.stringify({
            model: 'google/gemini-embedding-2',
            input: [{
              content: [
                { type: 'text', text: text || p.name || 'product' },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            }],
          }),
        });
        if (!embedRes.ok) throw new Error(`embed ${embedRes.status}: ${await embedRes.text()}`);
        const embedJson = await embedRes.json();
        const vector = embedJson.data?.[0]?.embedding;
        if (!Array.isArray(vector)) throw new Error('üres vektor');

        await admin.from('product_embeddings').update({
          embedding: vector as any,
          visual_tags: { text, category: p.category, brand: p.brand },
          status: 'ready',
          error: null,
        }).eq('product_id', p.id).eq('image_url', img);

        results.push({ id: p.id, status: 'ready' });
      } catch (e: any) {
        console.error('embed error', p.id, e);
        await admin.from('product_embeddings').update({
          status: 'error',
          error: String(e?.message ?? e),
        }).eq('product_id', p.id).eq('image_url', img);
        results.push({ id: p.id, status: 'error', error: String(e?.message ?? e) });
      }
    }

    return json({ processed: results.length, results });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? 'Ismeretlen hiba' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function b64(bytes: Uint8Array): string {
  let s = ''; for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
