// Smart Cart Suggestions - AI-alapú kosár-kiegészítő ajánlatok
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { rateLimit } from '../_shared/internal-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, key: 'smart-cart' })
  if (limited) return limited

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const cart_product_ids: string[] = Array.isArray(body?.cart_product_ids)
      ? body.cart_product_ids.filter((id: unknown) => typeof id === 'string' && UUID_RE.test(id)).slice(0, 50)
      : []

    // 1. Aktív bundle-ök keresése amikben a kosár termékei szerepelnek
    const { data: bundles } = await supabase
      .from('product_bundles')
      .select('*')
      .eq('active', true)
      .limit(10)

    const matchingBundles = (bundles || []).filter((b: any) => {
      if (!cart_product_ids.length) return false
      const overlap = b.product_ids.filter((id: string) => cart_product_ids.includes(id)).length
      return overlap >= 1 && overlap < b.product_ids.length
    })

    // 2. Gyakran együtt vásárolt párok
    let frequentIds: string[] = []
    if (cart_product_ids.length > 0) {
      const { data: pairs } = await supabase
        .from('product_frequent_pairs')
        .select('product_a, product_b, co_occurrence')
        .or(cart_product_ids.map((id: string) => `product_a.eq.${id},product_b.eq.${id}`).join(','))
        .order('co_occurrence', { ascending: false })
        .limit(10)

      const set = new Set<string>()
      for (const p of pairs || []) {
        if (!cart_product_ids.includes(p.product_a)) set.add(p.product_a)
        if (!cart_product_ids.includes(p.product_b)) set.add(p.product_b)
      }
      frequentIds = Array.from(set).slice(0, 4)
    }

    // 3. Fallback: legkedveltebb aktív termékek (kivéve amiket már a kosárban)
    let suggestedIds = frequentIds
    if (suggestedIds.length < 4) {
      const { data: popular } = await supabase
        .from('shop_products')
        .select('id')
        .eq('is_active', true)
        .not('id', 'in', `(${[...cart_product_ids, ...suggestedIds].map(id => `"${id}"`).join(',') || '""'})`)
        .order('created_at', { ascending: false })
        .limit(6 - suggestedIds.length)
      suggestedIds = [...suggestedIds, ...(popular || []).map((p: any) => p.id)]
    }

    // 4. Termék adatok betöltése
    const { data: products } = suggestedIds.length > 0
      ? await supabase.from('shop_products')
          .select('id, name, price, original_price, image_url, category')
          .in('id', suggestedIds)
          .eq('is_active', true)
      : { data: [] }

    return new Response(JSON.stringify({
      suggestions: products || [],
      bundles: matchingBundles,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('smart-cart error:', err)
    return new Response(JSON.stringify({ error: err.message, suggestions: [], bundles: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
