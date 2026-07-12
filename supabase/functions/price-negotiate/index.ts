// 💰 AI Price Negotiation Engine
// Vásárló áralku kérése -> AI javasol -> Rules Engine engedélyez -> Ajánlat
// SOHA nem enged a szabálymotor felett. Minden kérést auditlogol.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'

interface NegotiateBody {
  product_id: string
  cart_value?: number
  user_message?: string
  session_id?: string
}

interface Rule {
  id: string
  name: string
  priority: number
  max_discount_percent: number
  min_margin_percent: number
  min_cart_value: number
  offer_ttl_minutes: number
  allow_on_sale_products: boolean
  allow_on_new_products: boolean
  allow_on_clearance: boolean
  allowed_categories: string[]
  blocked_categories: string[]
  max_offers_per_product_per_day?: number
  max_attempts_per_hour?: number
  max_rejected_per_hour?: number
  coupon_conflict_policy?: 'override' | 'block' | 'ask'
}

// Strukturált input-összefoglaló minden audit sorhoz
function buildInputs(product: any, opts: {
  cart_value: number; is_on_sale: boolean; is_low_stock: boolean;
  is_returning: boolean; past_orders: number; user_message?: string;
}) {
  return {
    product: {
      id: product.id, name: product.name, category: product.category,
      price: Number(product.price), original_price: product.original_price ? Number(product.original_price) : null,
      stock: Number(product.stock ?? 0),
    },
    cart_value: opts.cart_value,
    flags: { is_on_sale: opts.is_on_sale, is_low_stock: opts.is_low_stock, is_returning: opts.is_returning },
    past_orders: opts.past_orders,
    user_message: opts.user_message ?? null,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')

    const admin = createClient(supabaseUrl, serviceKey)

    // Auth (opcionális – vendég is kérhet ajánlatot, de csak session_id-vel logol)
    const authHeader = req.headers.get('Authorization') ?? ''
    let userId: string | null = null
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data } = await userClient.auth.getUser()
      userId = data.user?.id ?? null
    }

    const body = (await req.json()) as NegotiateBody
    if (!body.product_id) return json({ error: 'product_id required' }, 400)

    // === 1. Termék betöltése ===
    const { data: product, error: prodErr } = await admin
      .from('shop_products')
      .select('id, name, price, original_price, category, stock')
      .eq('id', body.product_id)
      .maybeSingle()
    if (prodErr || !product) return json({ error: 'Termék nem található' }, 404)

    const price = Number(product.price)
    const isOnSale = product.original_price && Number(product.original_price) > price
    const stock = Number(product.stock ?? 0)
    const isLowStock = stock > 0 && stock <= 3
    const category = (product.category ?? '').toLowerCase()

    // === 2. Vásárlói előélet (opcionális) ===
    let pastOrders = 0
    if (userId) {
      const { count } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      pastOrders = count ?? 0
    }
    const isReturning = pastOrders > 0

    // === Szabályok betöltése (rate-limit értékek is innen jönnek) ===
    const { data: rulesRaw } = await admin
      .from('ai_pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
    const rules = (rulesRaw as Rule[]) ?? []
    const topRule = rules[0]
    const maxPerProduct = topRule?.max_offers_per_product_per_day ?? 3
    const maxAttemptsHour = topRule?.max_attempts_per_hour ?? 10
    const maxRejectedHour = topRule?.max_rejected_per_hour ?? 6

    const cartValue = body.cart_value ?? price
    const inputs = buildInputs(product, {
      cart_value: cartValue, is_on_sale: !!isOnSale, is_low_stock: isLowStock,
      is_returning: isReturning, past_orders: pastOrders, user_message: body.user_message,
    })

    // === 3. Rate limit + visszaélés-védelem ===
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const since1h = new Date(Date.now() - 3600 * 1000).toISOString()

    // 3a. Termék-szintű rate limit
    if (userId) {
      const { count } = await admin
        .from('ai_price_offers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('product_id', body.product_id)
        .gte('created_at', since24h)
      if ((count ?? 0) >= maxPerProduct) {
        await admin.from('ai_pricing_events').insert({
          user_id: userId, session_id: body.session_id, product_id: body.product_id,
          granted: false, reason: `Rate limit: ${maxPerProduct} ajánlat/24h ugyanarra a termékre`,
          context: { violation_code: 'rate_limit_product', past_offers_24h: count, limit: maxPerProduct, inputs },
        })
        return json({ granted: false, message: 'Ma már kaptál ajánlatot erre a termékre. Próbáld holnap újra! 😊' })
      }
    }

    // 3b. Globális próbálkozás-limit
    const idFilter = userId
      ? admin.from('ai_pricing_events').select('id, granted', { count: 'exact' }).eq('user_id', userId).gte('created_at', since1h)
      : body.session_id
      ? admin.from('ai_pricing_events').select('id, granted', { count: 'exact' }).eq('session_id', body.session_id).gte('created_at', since1h)
      : null
    if (idFilter) {
      const { data: recent, count: recentCount } = await idFilter
      const attempts = recentCount ?? 0
      const rejected = (recent ?? []).filter((r: any) => !r.granted).length
      if (attempts >= maxAttemptsHour || rejected >= maxRejectedHour) {
        try {
          await admin.from('fraud_signals').insert({
            user_id: userId, session_id: body.session_id,
            signal_type: 'ai_pricing_abuse',
            severity: rejected >= maxRejectedHour ? 'high' : 'medium',
            details: { attempts, rejected, product_id: body.product_id, window: '1h' },
          })
        } catch (_e) { /* fraud_signals opcionális */ }
        await admin.from('ai_pricing_events').insert({
          user_id: userId, session_id: body.session_id, product_id: body.product_id,
          granted: false, reason: 'Gyanús próbálkozás: túl sok lekérdezés (blokkolva)',
          context: { violation_code: 'rate_limit_abuse', attempts, rejected, limits: { attempts: maxAttemptsHour, rejected: maxRejectedHour }, inputs },
        })
        return json({ granted: false, message: 'Túl sok próbálkozás. Próbáld később újra. 🚫' })
      }
    }

    // === 4. Alkalmazható szabály kiválasztása ===
    let selectedRule: Rule | null = null
    let rejectReason = ''
    let rejectViolation = 'no_rule'
    for (const r of rules) {
      if (cartValue < r.min_cart_value) { rejectReason = `Kosárérték túl alacsony (min ${r.min_cart_value} Ft)`; rejectViolation = 'cart_minimum'; continue }
      if (isOnSale && !r.allow_on_sale_products) { rejectReason = 'Akciós termékre nem adható további kedvezmény'; rejectViolation = 'on_sale'; continue }
      if (r.blocked_categories?.some(c => category.includes(c.toLowerCase()))) { rejectReason = 'Termékkategória tiltott áralku szempontjából'; rejectViolation = 'category_block'; continue }
      if (r.allowed_categories?.length && !r.allowed_categories.some(c => category.includes(c.toLowerCase()))) { rejectReason = 'Termékkategória nem szerepel az engedélyezett listán'; rejectViolation = 'category_not_allowed'; continue }
      selectedRule = r
      break
    }

    if (!selectedRule) {
      await admin.from('ai_pricing_events').insert({
        user_id: userId, session_id: body.session_id, product_id: body.product_id,
        granted: false, reason: rejectReason || 'Nincs alkalmazható szabály',
        context: { violation_code: rejectViolation, inputs },
      })
      return json({
        granted: false,
        message: 'Sajnos erre a termékre most nem tudok személyes kedvezményt adni. 🙏',
      })
    }


    // === 5. Hard cap: min(max_discount, 100 - min_margin) ===
    const hardCap = Math.min(
      Number(selectedRule.max_discount_percent),
      100 - Number(selectedRule.min_margin_percent),
    )
    if (hardCap <= 0) {
      await admin.from('ai_pricing_events').insert({
        user_id: userId, session_id: body.session_id, product_id: body.product_id,
        rule_id: selectedRule.id, granted: false,
        reason: 'Margin védelem tiltja a kedvezményt (hard cap ≤ 0)',
        context: { hard_cap: hardCap },
      })
      return json({ granted: false, message: 'Erre a termékre most nem tudok kedvezményt ajánlani.' })
    }

    // === 6. AI javaslat (mennyi kedvezmény a hardCap alatt) ===
    let aiPercent = Math.min(5, hardCap) // fallback ha AI nincs
    let aiReasoning = 'Alap személyes ajánlat.'

    if (lovableKey) {
      const aiPrompt = `Egy vásárló áralkut kér. Javasolj egy diszkréten skálázott kedvezmény %-ot (0-tól ${hardCap}-ig, egészre kerekítve).

Kontextus:
- Termék: ${product.name} (${category || 'nincs kat.'})
- Ár: ${price} Ft, kosárérték: ${cartValue} Ft
- Készlet: ${stock} db ${isLowStock ? '(alacsony!)' : ''}
- Akciós termék: ${isOnSale ? 'IGEN' : 'nem'}
- Visszatérő vásárló: ${isReturning ? `IGEN (${pastOrders} korábbi rendelés)` : 'új vásárló'}
- Vásárló üzenete: "${body.user_message ?? '(nem írt)'}"
- Alkalmazott szabály: "${selectedRule.name}", hard cap: ${hardCap}%

Add vissza CSAK ezt a JSON-t:
{"discount_percent": <szám 0-${hardCap}>, "reasoning": "1 mondat magyarázat magyarul"}`

      try {
        const aiResp = await fetch(AI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: 'Áralku tanácsadó vagy egy magyar webshopban. Konzervatív, óvatos ajánlatokat adsz. Csak érvényes JSON-t válaszolsz.' },
              { role: 'user', content: aiPrompt },
            ],
            response_format: { type: 'json_object' },
          }),
        })
        if (aiResp.ok) {
          const aiData = await aiResp.json()
          const content = aiData.choices?.[0]?.message?.content ?? '{}'
          const parsed = JSON.parse(content)
          if (typeof parsed.discount_percent === 'number') {
            aiPercent = Math.max(0, Math.min(hardCap, Math.round(parsed.discount_percent)))
          }
          if (parsed.reasoning) aiReasoning = String(parsed.reasoning).slice(0, 300)
        }
      } catch (e) {
        console.error('AI call failed, using fallback:', e)
      }
    }

    // === 7. Végső hard cap érvényesítés (AI SOHA nem lépheti át) ===
    aiPercent = Math.max(0, Math.min(hardCap, aiPercent))
    if (aiPercent < 1) {
      await admin.from('ai_pricing_events').insert({
        user_id: userId, session_id: body.session_id, product_id: body.product_id,
        rule_id: selectedRule.id, granted: false,
        requested_discount_percent: aiPercent,
        reason: 'AI 0%-ot javasolt (nem éri meg ajánlatot adni)',
        context: { ai_reasoning: aiReasoning },
      })
      return json({ granted: false, message: 'Sajnos most nem tudok kedvezményt adni erre. 🙏' })
    }

    const offeredPrice = Math.round(price * (1 - aiPercent / 100))
    const couponCode = `AI-${aiPercent}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const expiresAt = new Date(Date.now() + selectedRule.offer_ttl_minutes * 60 * 1000).toISOString()

    // === 8. Ajánlat mentése ===
    const { data: offer, error: offerErr } = await admin
      .from('ai_price_offers')
      .insert({
        user_id: userId,
        session_id: body.session_id,
        product_id: body.product_id,
        product_name: product.name,
        original_price: price,
        offered_price: offeredPrice,
        discount_percent: aiPercent,
        rule_id: selectedRule.id,
        coupon_code: couponCode,
        reasoning: aiReasoning,
        cart_value: cartValue,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (offerErr) {
      console.error('offer insert error', offerErr)
      return json({ error: 'Nem sikerült ajánlatot létrehozni' }, 500)
    }

    // === 9. Audit ===
    await admin.from('ai_pricing_events').insert({
      user_id: userId, session_id: body.session_id, product_id: body.product_id,
      rule_id: selectedRule.id, offer_id: offer.id, granted: true,
      requested_discount_percent: aiPercent,
      reason: `Ajánlat engedélyezve "${selectedRule.name}" szabály alapján (hard cap ${hardCap}%)`,
      context: {
        ai_reasoning: aiReasoning, is_on_sale: isOnSale, is_low_stock: isLowStock,
        is_returning: isReturning, past_orders: pastOrders, cart_value: cartValue,
      },
    })

    return json({
      granted: true,
      offer: {
        id: offer.id,
        product_name: product.name,
        original_price: price,
        offered_price: offeredPrice,
        discount_percent: aiPercent,
        coupon_code: couponCode,
        expires_at: expiresAt,
        reasoning: aiReasoning,
      },
      message: `Megnéztem a lehetőségeket. Erre a termékre ${aiPercent}% személyes kedvezményt tudok ajánlani, ami ${selectedRule.offer_ttl_minutes} percig érvényes. Kuponkód: ${couponCode}`,
    })
  } catch (e) {
    console.error('price-negotiate error', e)
    return json({ error: (e as Error).message }, 500)
  }
})
