// AI Shopping Assistant - természetes nyelvű termékkeresés
// Használ: Lovable AI Gateway (google/gemini-3-flash-preview) + tool calling
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'

const SYSTEM = `Te egy segítőkész vásárlási asszisztens vagy az "Egyszerű de Nagyszerű" webshopon.
Feladatod: a felhasználó természetes nyelvű kérése (pl. "fekete cipő 44-es 20 ezer alatt") alapján
használd a search_products toolt, majd max 4-5 termékkel válaszolj röviden magyarul.
Legyél barátságos, tegezz. Ha nincs pontos találat, javasolj hasonlót.
Ha a felhasználó nem termékkeresést, hanem tanácsot kér ("mi illik ehhez a nadrághoz?"),
akkor általános stílustanácsot adj + hívd a toolt kiegészítő termékekért.
Válaszod legyen rövid, tömör, jól olvasható mobilon.`

const TOOLS = [{
  type: 'function',
  function: {
    name: 'search_products',
    description: 'Termékek keresése a webshopban szűrőkkel',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keresési szöveg (név, kategória, stílus)' },
        category: { type: 'string', description: 'Kategória, pl. cipő, póló, nadrág' },
        color: { type: 'string', description: 'Szín magyarul, pl. fekete, fehér' },
        size: { type: 'string', description: 'Méret, pl. 44, M, L' },
        max_price: { type: 'number', description: 'Maximum ár HUF-ban' },
        min_price: { type: 'number', description: 'Minimum ár HUF-ban' },
        limit: { type: 'number', description: 'Maximum találatok száma, default 5' },
      },
    },
  },
}]

async function searchProducts(supabase: any, args: any) {
  let q = supabase
    .from('shop_products')
    .select('id, name, description, price, original_price, category, sizes, colors, image_url, stock')
    .eq('is_active', true)
    .limit(args.limit || 5)

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

    const messages: any[] = [{ role: 'system', content: SYSTEM }, ...userMessages]
    let recommendedIds: string[] = []
    let recommendedProducts: any[] = []
    let filters: any = null

    // Multi-step tool loop (max 3 iterations)
    for (let step = 0; step < 3; step++) {
      const aiResp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: TOOLS,
          stream: false,
        }),
      })

      if (!aiResp.ok) {
        const errText = await aiResp.text()
        console.error('AI error:', aiResp.status, errText)
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: 'Túl sok kérés, várj egy percet.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: 'AI kredit elfogyott.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ error: 'AI hiba', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const data = await aiResp.json()
      const choice = data.choices?.[0]
      const message = choice?.message
      if (!message) break

      messages.push(message)

      const toolCalls = message.tool_calls || []
      if (toolCalls.length === 0) {
        // Final text answer
        const anonUser = null
        supabase.from('ai_shopping_conversations').insert({
          user_id: anonUser,
          user_message: userMessages[userMessages.length - 1]?.content || '',
          assistant_message: message.content || '',
          recommended_product_ids: recommendedIds,
          filters,
        }).then(() => {}, () => {})

        return new Response(JSON.stringify({
          reply: message.content || '',
          products: recommendedProducts,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Execute tool calls
      for (const tc of toolCalls) {
        if (tc.function?.name === 'search_products') {
          const args = JSON.parse(tc.function.arguments || '{}')
          filters = args
          const products = await searchProducts(supabase, args)
          recommendedProducts = products
          recommendedIds = products.map((p: any) => p.id)
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
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
    return new Response(JSON.stringify({ error: err.message || 'Ismeretlen hiba' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
