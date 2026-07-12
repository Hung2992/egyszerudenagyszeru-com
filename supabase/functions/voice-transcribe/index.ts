// Hangalapú vásárlás – Speech-to-Text (Lovable AI Gateway)
// Fogad WAV/webm/mp4/mp3 fájlt multipart/form-data-ban -> visszaad JSON { text }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'

const AI_URL = 'https://ai.gateway.lovable.dev/v1/audio/transcriptions'
const MODEL = 'openai/gpt-4o-mini-transcribe'
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const MIN_BYTES = 2048 // néma / üres felvétel elleni védelem

// Egyszerű memória-alapú rate limit (per user / IP, 20 kérés / 5 perc)
const rateBuckets = new Map<string, { count: number; reset: number }>()
function rateLimited(key: string) {
  const now = Date.now()
  const b = rateBuckets.get(key)
  if (!b || b.reset < now) {
    rateBuckets.set(key, { count: 1, reset: now + 5 * 60 * 1000 })
    return false
  }
  b.count += 1
  return b.count > 20
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'lovable_api_key_missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Azonosító (nem kötelező bejelentkezés a hangkereséshez, de rate limithez kell)
    const authHeader = req.headers.get('Authorization') ?? ''
    let key = req.headers.get('x-forwarded-for') ?? 'anon'
    if (authHeader.startsWith('Bearer ')) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data } = await admin.auth.getClaims(authHeader.replace('Bearer ', ''))
      if (data?.claims?.sub) key = data.claims.sub
    }
    if (rateLimited(key)) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'Túl sok kérés. Próbáld pár perc múlva.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File) && !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'missing_file' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const size = (file as any).size ?? 0
    if (size < MIN_BYTES) {
      return new Response(JSON.stringify({ error: 'audio_empty', message: 'A felvétel túl rövid vagy néma. Próbáld újra.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'audio_too_large' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const upstream = new FormData()
    upstream.append('model', MODEL)
    const name = (file as any).name || 'recording.wav'
    upstream.append('file', file, name)

    const resp = await fetch(AI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    })
    const body = await resp.text()
    if (!resp.ok) {
      console.error(`voice-transcribe upstream [${resp.status}]: ${body}`)
      return new Response(JSON.stringify({ error: 'transcription_failed', status: resp.status, details: body }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    let text = ''
    try { text = (JSON.parse(body).text ?? '').trim() } catch { text = body.trim() }
    if (!text) {
      return new Response(JSON.stringify({ error: 'empty_transcript', message: 'Nem sikerült szöveget felismerni.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('voice-transcribe error', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
