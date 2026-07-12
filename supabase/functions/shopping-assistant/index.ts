// AI Shopping Assistant - természetes nyelvű termékkeresés
// Cache (1h) + napi kvóta (50/user) + monitoring integrálva
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import {
  getFromCache, saveToCache, checkQuota, incrementQuota, logMonitoring, getUserIdFromRequest,
} from '../_shared/ai-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-ai-cache, x-ai-quota-used, x-ai-quota-limit',
}

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'
const FN_NAME = 'shopping-assistant'
const DAILY_LIMIT = 50

const SYSTEM = `Te egy segítőkész vásárlási asszisztens vagy az "Egyszerű de Nagyszerű" webshopon.
Feladataid:
- Termékkeresés: használd a search_products toolt, max 4-5 termékkel válaszolj.
- Rendelés-információk: ha a vásárló SAJÁT rendeléséről kérdez ("hol a rendelésem", "mikor érkezik", "milyen méretet vettem", "cserélhetem"), használd a get_my_orders toolt. Ha konkrét rendelés részlete kell, get_order_details tool.
- Csere/visszaküldés kérdésre magyarázd el: 14 napon belül lehet, /profile oldalon indítható.
- Ha a felhasználó nincs belépve (a tool ezt jelzi), kérd meg hogy jelentkezzen be és irányítsd a /auth oldalra.
Legyél barátságos, tegezz, rövid, mobilra optimalizált válaszokat adj magyarul.
SOHA ne találj ki rendelési adatokat, kizárólag a tool által visszaadottakat használd.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Termékek keresése a webshopban szűrőkkel',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }, category: { type: 'string' }, color: { type: 'string' },
          size: { type: 'string' }, max_price: { type: 'number' }, min_price: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_orders',
      description: 'A bejelentkezett vásárló utolsó rendeléseit adja vissza (státusz, dátum, tételek, szállítási követés). CSAK a saját rendelését látja.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'max 10, alapértelmezés 5' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_details',
      description: 'Egy konkrét rendelés részletei (a bejelentkezett vásárló saját rendelése).',
      parameters: {
        type: 'object',
        properties: { order_id: { type: 'string', description: 'A rendelés UUID-ja' } },
        required: ['order_id'],
      },
    },
  },
]

async function searchProducts(supabase: any, args: any) {
  let q = supabase.from('shop_products')
    .select('id, name, description, price, original_price, category, sizes, colors, image_url, stock')
    .eq('is_active', true).limit(args.limit || 5)
  if (args.query) q = q.or(`name.ilike.%${args.query}%,description.ilike.%${args.query}%,category.ilike.%${args.query}%`)
  if (args.category) q = q.ilike('category', `%${args.category}%`)
  if (args.color) q = q.contains('colors', [args.color])
  if (args.size) q = q.contains('sizes', [args.size])
  if (args.max_price) q = q.lte('price', args.max_price)
  if (args.min_price) q = q.gte('price', args.min_price)
  const { data } = await q
  return data || []
}

const STATUS_HU: Record<string, string> = {
  pending: 'Feldolgozás alatt',
  paid: 'Kifizetve',
  processing: 'Előkészítés alatt',
  shipped: 'Feladva',
  delivered: 'Kézbesítve',
  cancelled: 'Törölve',
  refunded: 'Visszatérítve',
  failed: 'Sikertelen fizetés',
}

async function getMyOrders(admin: any, authedUserId: string | null, args: any) {
  if (!authedUserId) return { error: 'not_authenticated', message: 'A vásárlónak be kell jelentkeznie a rendelései megtekintéséhez.' }
  const limit = Math.min(Math.max(1, args?.limit ?? 5), 10)
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, status, total_amount, created_at, items, payment_method, procurement_status, shipping_name, shipping_city')
    .eq('user_id', authedUserId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { error: 'db_error', message: error.message }
  if (!orders?.length) return { orders: [], message: 'Még nincs rendelésed.' }

  const ids = orders.map((o: any) => o.id)
  const { data: shipments } = await admin
    .from('shipments')
    .select('order_id, carrier_code, tracking_number, tracking_url, status, shipped_at, delivered_at')
    .in('order_id', ids)
  const shipMap = new Map<string, any>()
  ;(shipments ?? []).forEach((s: any) => shipMap.set(s.order_id, s))

  return {
    orders: orders.map((o: any) => ({
      id: o.id,
      short_id: o.id.slice(0, 8).toUpperCase(),
      status: STATUS_HU[o.status] ?? o.status,
      status_code: o.status,
      total: o.total_amount,
      created_at: o.created_at,
      created_days_ago: Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86400000),
      items_summary: Array.isArray(o.items)
        ? o.items.map((it: any) => ({ name: it.name, qty: it.quantity ?? it.qty ?? 1, size: it.size, color: it.color })).slice(0, 6)
        : [],
      shipping_city: o.shipping_city,
      shipment: shipMap.get(o.id) ? {
        carrier: shipMap.get(o.id).carrier_code,
        tracking_number: shipMap.get(o.id).tracking_number,
        tracking_url: shipMap.get(o.id).tracking_url,
        status: shipMap.get(o.id).status,
        shipped_at: shipMap.get(o.id).shipped_at,
        delivered_at: shipMap.get(o.id).delivered_at,
      } : null,
    })),
  }
}

async function getOrderDetails(admin: any, authedUserId: string | null, args: any) {
  if (!authedUserId) return { error: 'not_authenticated', message: 'A vásárlónak be kell jelentkeznie.' }
  if (!args?.order_id) return { error: 'missing_order_id' }
  const { data: order, error } = await admin
    .from('orders')
    .select('id, user_id, status, total_amount, discount_amount, coupon_code, created_at, items, payment_method, procurement_status, shipping_name, shipping_address, shipping_city, shipping_zip')
    .eq('id', args.order_id)
    .maybeSingle()
  if (error) return { error: 'db_error', message: error.message }
  if (!order) return { error: 'not_found', message: 'Nincs ilyen rendelés.' }
  // 🔒 tulajdonos-ellenőrzés
  if (order.user_id !== authedUserId) return { error: 'forbidden', message: 'Ez nem a te rendelésed.' }

  const { data: shipment } = await admin
    .from('shipments')
    .select('carrier_code, tracking_number, tracking_url, status, shipped_at, delivered_at')
    .eq('order_id', order.id)
    .maybeSingle()

  return {
    id: order.id,
    short_id: order.id.slice(0, 8).toUpperCase(),
    status: STATUS_HU[order.status] ?? order.status,
    status_code: order.status,
    total: order.total_amount,
    discount: order.discount_amount,
    coupon: order.coupon_code,
    created_at: order.created_at,
    items: order.items,
    payment_method: order.payment_method,
    shipping: {
      name: order.shipping_name, address: order.shipping_address,
      city: order.shipping_city, zip: order.shipping_zip,
    },
    shipment,
    return_deadline_days: Math.max(0, 14 - Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000)),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY hiányzik' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json()
    const userMessages = Array.isArray(body?.messages) ? body.messages : []
    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Nincs üzenet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const lastUserMsg = userMessages[userMessages.length - 1]?.content || ''
    const userId = await getUserIdFromRequest(supabase, req)

    // 🚦 KVÓTA ELLENŐRZÉS
    const quota = await checkQuota(supabase, userId, FN_NAME, DAILY_LIMIT)
    if (!quota.allowed) {
      await logMonitoring(supabase, FN_NAME, 'warning', 'rate_limit',
        `User ${userId} elérte a napi ${DAILY_LIMIT} kérés limitet`, { userId })
      return new Response(JSON.stringify({
        error: `Elérted a napi ${DAILY_LIMIT} kérés limitet. Próbáld meg holnap!`,
        quota,
      }), {
        status: 429,
        headers: {
          ...corsHeaders, 'Content-Type': 'application/json',
          'x-ai-quota-used': String(quota.used), 'x-ai-quota-limit': String(quota.limit),
        },
      })
    }

    // 🎯 CACHE ELLENŐRZÉS — csak név-nélküli, egyszeri kérdésekre (rendelés-lekérdezésnél NEM)
    const RESTRICTED_PATTERNS = /(rendel|csomag|szállít|követés|tracking|cser[eé]|visszakü|méret|order)/i
    const cacheEligible = userMessages.length === 1 && !RESTRICTED_PATTERNS.test(lastUserMsg)
    if (cacheEligible) {
      const cached = await getFromCache(supabase, FN_NAME, lastUserMsg)
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: {
            ...corsHeaders, 'Content-Type': 'application/json', 'x-ai-cache': 'hit',
            'x-ai-quota-used': String(quota.used), 'x-ai-quota-limit': String(quota.limit),
          },
        })
      }
    }

    const messages: any[] = [{ role: 'system', content: SYSTEM }, ...userMessages]
    let recommendedIds: string[] = []
    let recommendedProducts: any[] = []
    let filters: any = null
    let totalTokens = 0

    for (let step = 0; step < 3; step++) {
      const startTs = Date.now()
      const aiResp = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, stream: false }),
      })
      const latency = Date.now() - startTs

      if (!aiResp.ok) {
        const errText = await aiResp.text()
        const severity = aiResp.status >= 500 ? 'error' : 'warning'
        await logMonitoring(supabase, FN_NAME, severity, 'provider_error',
          `AI provider ${aiResp.status}`, { status: aiResp.status, error: errText.slice(0, 500), latency })
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: 'Túl sok kérés, várj egy percet.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: 'AI kredit elfogyott.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ error: 'AI hiba', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const data = await aiResp.json()
      totalTokens += data?.usage?.total_tokens || 0
      // Riasztás lassú hívásra
      if (latency > 8000) {
        await logMonitoring(supabase, FN_NAME, 'warning', 'high_latency',
          `AI válaszidő ${latency}ms`, { latency, model: MODEL })
      }

      const choice = data.choices?.[0]
      const message = choice?.message
      if (!message) break
      messages.push(message)

      const toolCalls = message.tool_calls || []
      if (toolCalls.length === 0) {
        supabase.from('ai_shopping_conversations').insert({
          user_id: userId, user_message: lastUserMsg,
          assistant_message: message.content || '',
          recommended_product_ids: recommendedIds, filters,
        }).then(() => {}, () => {})

        const responsePayload = { reply: message.content || '', products: recommendedProducts }

        // Cache mentés (csak egyszerű kérdésre)
        if (userMessages.length === 1) {
          saveToCache(supabase, FN_NAME, lastUserMsg, responsePayload).catch(() => {})
        }
        // Kvóta növelés
        incrementQuota(supabase, userId, FN_NAME, totalTokens, totalTokens * 0.00002).catch(() => {})

        return new Response(JSON.stringify(responsePayload), {
          headers: {
            ...corsHeaders, 'Content-Type': 'application/json', 'x-ai-cache': 'miss',
            'x-ai-quota-used': String(quota.used + 1), 'x-ai-quota-limit': String(quota.limit),
          },
        })
      }

      for (const tc of toolCalls) {
        if (tc.function?.name === 'search_products') {
          const args = JSON.parse(tc.function.arguments || '{}')
          filters = args
          const products = await searchProducts(supabase, args)
          recommendedProducts = products
          recommendedIds = products.map((p: any) => p.id)
          messages.push({
            role: 'tool', tool_call_id: tc.id,
            content: JSON.stringify(products.map((p: any) => ({
              id: p.id, name: p.name, price: p.price, category: p.category,
              colors: p.colors, sizes: p.sizes, stock: p.stock,
            }))),
          })
        }
      }
    }

    return new Response(JSON.stringify({
      reply: 'Sajnos most nem sikerült megfelelő választ adni. Próbáld máshogy megfogalmazni!',
      products: recommendedProducts,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('shopping-assistant fatal:', err)
    try {
      const supa = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
      await logMonitoring(supa, FN_NAME, 'error', 'function_error', err.message || 'unknown', { stack: err.stack?.slice(0, 500) })
    } catch {}
    return new Response(JSON.stringify({ error: err.message || 'Ismeretlen hiba' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
