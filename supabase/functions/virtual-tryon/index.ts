// Sprint B.4 — Virtual Try-On (AI Outfit Preview)
// POST { photo_base64 (data URL or raw base64), photo_mime, product_id, product_source, product_name, product_image_url, session_id? }
// Response: { image_base64, generation_id }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash-image';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) return json({ error: 'no_key' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth check
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
    if (!userId) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      photo_base64, photo_mime, product_id, product_source,
      product_name, product_image_url, session_id,
    } = body;

    if (!photo_base64 || !product_name) {
      return json({ error: 'missing_fields' }, 400);
    }

    // Normalize the user photo to a data URL
    const userPhotoUrl = photo_base64.startsWith('data:')
      ? photo_base64
      : `data:${photo_mime || 'image/jpeg'};base64,${photo_base64}`;

    // Rate limit: max 5 generations / 10 min per user
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('tryon_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if ((recentCount ?? 0) >= 5) {
      return json({ error: 'rate_limited', retry_after: 600 }, 429);
    }

    // Insert generation record (pending)
    const { data: gen, error: genErr } = await supabase
      .from('tryon_generations')
      .insert({
        user_id: userId,
        session_id: session_id ?? null,
        product_id: product_id ?? null,
        product_source: product_source ?? null,
        status: 'pending',
        ai_model: MODEL,
        prompt: `Try-on: ${product_name}`,
      })
      .select()
      .single();
    if (genErr) return json({ error: 'db_error', details: genErr.message }, 500);

    const prompt = `Készíts fotorealisztikus virtuális próbaképet: az első képen látható személyre "öltöztesd fel" a második képen látható terméket (${product_name}). Tartsd meg a személy arcát, testalkatát, pózát és hátterét. A ruhadarab illeszkedjen természetesen, valós árnyékokkal és megvilágítással. Csak a képet add vissza, semmi szöveg.`;

    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: userPhotoUrl } },
        ],
      },
    ];
    if (product_image_url) {
      messages[0].content.push({
        type: 'image_url',
        image_url: { url: product_image_url },
      });
    }

    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      await supabase.from('tryon_generations').update({
        status: 'failed', error: t.slice(0, 500),
      }).eq('id', gen.id);
      if (aiResp.status === 429) return json({ error: 'ai_rate_limited' }, 429);
      if (aiResp.status === 402) return json({ error: 'ai_credits_exhausted' }, 402);
      return json({ error: 'ai_error', details: t.slice(0, 300) }, 500);
    }

    const data = await aiResp.json();
    // Gemini image response: message.images[].image_url.url (data URL)
    const imgUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
      || data.choices?.[0]?.message?.content?.match?.(/data:image\/[^"]+/)?.[0]
      || null;

    if (!imgUrl) {
      await supabase.from('tryon_generations').update({
        status: 'failed', error: 'no_image_in_response',
      }).eq('id', gen.id);
      return json({ error: 'no_image' }, 500);
    }

    await supabase.from('tryon_generations').update({
      status: 'completed',
      output_image_url: imgUrl,
      tokens_used: data.usage?.total_tokens ?? null,
    }).eq('id', gen.id);

    // Log event
    await supabase.from('tryon_events').insert({
      session_id: session_id ?? null,
      user_id: userId,
      product_id: product_id ?? null,
      product_source: product_source ?? null,
      event_type: 'tryon_generated',
      metadata: { generation_id: gen.id },
    });

    return json({ image_base64: imgUrl, generation_id: gen.id });
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
