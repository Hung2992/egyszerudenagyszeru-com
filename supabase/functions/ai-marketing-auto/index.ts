// AI Marketing Automation - vásárlói szegmentáció + auto kampány javaslat
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'API kulcs hiányzik' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const svc = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims } = await supabase.auth.getClaims(token)
    const userId = claims?.claims?.sub
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Admin only' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 1. Számold ki a szegmenseket rendelések és profilok alapján
    const now = new Date()
    const dayMs = 86400000
    const days30 = new Date(now.getTime() - 30 * dayMs).toISOString()
    const days90 = new Date(now.getTime() - 90 * dayMs).toISOString()

    const { data: allOrders } = await svc.from('orders').select('user_id, total_amount, created_at').limit(5000)
    const { data: totalProfiles } = await svc.from('profiles').select('id', { count: 'exact', head: true })

    const byUser: Record<string, { count: number; total: number; last: string }> = {}
    for (const o of allOrders || []) {
      if (!o.user_id) continue
      const u = byUser[o.user_id] || { count: 0, total: 0, last: '1970' }
      u.count++
      u.total += Number(o.total_amount) || 0
      if (o.created_at > u.last) u.last = o.created_at
      byUser[o.user_id] = u
    }

    const vip = Object.entries(byUser).filter(([, v]) => v.count >= 3 || v.total >= 100000).length
    const dormant = Object.entries(byUser).filter(([, v]) => v.last < days90).length
    const new30 = Object.entries(byUser).filter(([, v]) => v.count === 1 && v.last >= days30).length
    const active30 = Object.entries(byUser).filter(([, v]) => v.last >= days30).length

    const segments = [
      { key: 'vip', name: 'VIP vásárlók', description: '3+ rendelés vagy 100k+ költés', user_count: vip },
      { key: 'dormant', name: 'Alvó vásárlók', description: 'Több mint 90 napja nem vásárolt', user_count: dormant },
      { key: 'new', name: 'Új vásárlók', description: 'Első rendelés 30 napon belül', user_count: new30 },
      { key: 'active', name: 'Aktív vásárlók', description: 'Vásárolt az utóbbi 30 napban', user_count: active30 },
    ]

    // 2. Kérjük az AI-t hogy javasoljon kampányt minden szegmensre
    const prompt = `Vásárlói szegmensek:
${segments.map(s => `- ${s.name} (${s.user_count} fő): ${s.description}`).join('\n')}

Minden szegmenshez adj vissza EGY konkrét e-mail kampány javaslatot magyarul, streetwear webshop kontextusában.
Formátum: strictly JSON, kulcs = segment_key, érték = { subject: string, content: string (max 300 karakter), suggested_discount_percent: number, cta_text: string }.
CSAK a JSON-t add vissza, semmi mást.`

    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })

    let campaigns: Record<string, any> = {}
    if (aiResp.ok) {
      const data = await aiResp.json()
      const text = data.choices?.[0]?.message?.content || '{}'
      try { campaigns = JSON.parse(text) } catch { campaigns = {} }
    }

    // 3. Mentsük az adatokat marketing_segments táblába
    for (const s of segments) {
      await svc.from('marketing_segments').upsert({
        segment_key: s.key,
        name: s.name,
        description: s.description,
        user_count: s.user_count,
        criteria: { auto_generated: true },
        suggested_campaign: campaigns[s.key] || null,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'segment_key' })
    }

    return new Response(JSON.stringify({ segments, campaigns }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('ai-marketing-auto error:', err)
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
