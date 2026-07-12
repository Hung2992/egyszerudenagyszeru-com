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
Feladatod: a felhasználó természetes nyelvű kérése alapján használd a search_products toolt,
majd max 4-5 termékkel válaszolj röviden magyarul. Legyél barátságos, tegezz.
Ha nincs pontos találat, javasolj hasonlót. Válaszod legyen rövid, tömör, jól olvasható mobilon.`

const TOOLS = [{
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
}]

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

    // 🎯 CACHE ELLENŐRZÉS (csak egyetlen user üzenet esetén, folytatásoknál nem)
    if (userMessages.length === 1) {
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
