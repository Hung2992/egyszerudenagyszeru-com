// Visual Search: uploaded image -> Gemini vision analysis + embedding -> similarity search
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  storage_path?: string;   // path in visual-search-uploads bucket
  image_data_url?: string; // fallback: inline base64 data URL
  session_id?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const started = Date.now();

  try {
    const body: Body = await req.json();
    if (!body.storage_path && !body.image_data_url) {
      return json({ error: 'Kép hiányzik' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Identify user (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = data.user?.id ?? null;
    }

    // Get image bytes
    let dataUrl: string;
    let publicUrl: string | null = null;
    if (body.storage_path) {
      const { data, error } = await admin.storage
        .from('visual-search-uploads')
        .download(body.storage_path);
      if (error || !data) return json({ error: 'Nem sikerült letölteni a képet' }, 400);
      const buf = new Uint8Array(await data.arrayBuffer());
      if (buf.byteLength > 8 * 1024 * 1024) return json({ error: 'A kép túl nagy (max 8MB)' }, 400);
      const mime = data.type || 'image/jpeg';
      dataUrl = `data:${mime};base64,${b64(buf)}`;
      const { data: signed } = await admin.storage
        .from('visual-search-uploads')
        .createSignedUrl(body.storage_path, 3600);
      publicUrl = signed?.signedUrl ?? null;
    } else {
      dataUrl = body.image_data_url!;
    }

    // 1) Vision analysis
    const visionRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-lite',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Elemezd a képet és adj vissza JSON-t az alábbi kulcsokkal (magyar értékek):
{
  "category": "cipő / póló / telefon tok / stb.",
  "colors": ["fehér","fekete"],
  "style": "minimalista / streetwear / sport",
  "material": "bőr / textil / szintetikus",
  "shape": "rövid leírás a formáról",
  "brand_hint": "látható márka jelzés vagy null",
  "search_text": "1 mondat angolul a képen látottakról, kereséshez",
  "description_hu": "1 barátságos magyar mondat a vásárlónak"
}
Csak a JSON-t add vissza, kódblokkok nélkül.` },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    if (!visionRes.ok) {
      const t = await visionRes.text();
      console.error('vision failed', visionRes.status, t);
      return json({ error: 'AI vizuális elemzés hiba', details: t }, visionRes.status);
    }
    const visionJson = await visionRes.json();
    const rawContent: string = visionJson.choices?.[0]?.message?.content ?? '{}';
    const cleaned = rawContent.replace(/^```json\s*|\s*```$/g, '').trim();
    let analysis: any = {};
    try { analysis = JSON.parse(cleaned); } catch { analysis = { search_text: cleaned }; }

    // 2) Embedding of the image (multimodal)
    const embedRes = await fetch(`${GATEWAY}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: 'google/gemini-embedding-2',
        input: [{
          content: [
            { type: 'text', text: analysis.search_text || analysis.description_hu || 'product image' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    if (!embedRes.ok) {
      const t = await embedRes.text();
      console.error('embed failed', embedRes.status, t);
      return json({ error: 'AI embedding hiba', details: t }, embedRes.status);
    }
    const embedJson = await embedRes.json();
    const vector: number[] = embedJson.data?.[0]?.embedding;
    if (!Array.isArray(vector)) return json({ error: 'Üres embedding' }, 500);

    // 3) Similarity search
    const { data: matches, error: matchErr } = await admin.rpc('match_product_images', {
      query_embedding: vector as any,
      match_count: body.limit ?? 12,
      min_similarity: 0.5,
    });
    if (matchErr) console.error('match err', matchErr);

    // Fetch product details
    const productIds = [...new Set((matches ?? []).map((m: any) => m.product_id))];
    let products: any[] = [];
    if (productIds.length) {
      const { data } = await admin
        .from('shop_products')
        .select('id,name,slug,price,image_url,category,brand,short_description')
        .in('id', productIds);
      products = data ?? [];
    }
    const results = (matches ?? []).map((m: any) => {
      const p = products.find(x => x.id === m.product_id);
      return p ? { ...p, similarity: Number(m.similarity), matched_image: m.image_url } : null;
    }).filter(Boolean);

    // 4) Log query
    const latency = Date.now() - started;
    const { data: logRow } = await admin.from('visual_search_queries').insert({
      user_id: userId,
      session_id: body.session_id ?? null,
      uploaded_image_url: publicUrl,
      detected_category: analysis.category ?? null,
      detected_colors: analysis.colors ?? null,
      visual_tags: analysis,
      ai_description: analysis.description_hu ?? null,
      top_matches: results.slice(0, 5).map((r: any) => ({ id: r.id, similarity: r.similarity })),
      result_count: results.length,
      top_similarity: results[0]?.similarity ?? null,
      no_results: results.length === 0,
      latency_ms: latency,
    }).select('id').single();

    return json({
      query_id: logRow?.id ?? null,
      analysis,
      results,
      latency_ms: latency,
    });
  } catch (e: any) {
    console.error('visual-search error', e);
    return json({ error: e?.message ?? 'Ismeretlen hiba' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
