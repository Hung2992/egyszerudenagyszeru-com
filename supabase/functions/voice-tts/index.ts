// Hangalapú vásárlás – Text-to-Speech (Lovable AI Gateway, SSE streaming)
// Body: { text: string, voice?: string }  ->  audio/mpeg fájl (mp3)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const AI_URL = 'https://ai.gateway.lovable.dev/v1/audio/speech'
const MODEL = 'openai/gpt-4o-mini-tts'
const MAX_INPUT = 1500 // biztonságos karakter-cap (chunkolást a hívó vagy magasabb réteg végzi)

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
    const { text, voice } = await req.json().catch(() => ({}))
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_text' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const input = text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text

    const resp = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        voice: voice || 'alloy',
        response_format: 'mp3',
        // stream_format kihagyva -> egyetlen mp3 fájlt kapunk
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error(`voice-tts upstream [${resp.status}]: ${body}`)
      return new Response(JSON.stringify({ error: 'tts_failed', status: resp.status, details: body }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Az mp3 body pass-through
    return new Response(resp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('voice-tts error', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
