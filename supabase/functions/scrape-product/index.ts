import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const BodySchema = z.object({
  url: z.string().url().max(2000),
})

const BatchBodySchema = z.object({
  urls: z.array(z.string().url().max(2000)).min(1).max(20),
})

async function scrapeOneUrl(url: string, LOVABLE_API_KEY: string): Promise<{ success: boolean; data?: any; error?: string; url?: string }> {
  try {
    // Try multiple user agents for better compatibility
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ]

    // Try mobile version for sites like Shein (often has more data in HTML)
    let mobileUrl = url
    if (url.includes('shein.com') && !url.includes('m.shein.com')) {
      mobileUrl = url.replace('www.shein.com', 'm.shein.com')
    }

    let html = ''
    let fetchSuccess = false

    // Try mobile URL first for supported sites, then original
    const urlsToTry = mobileUrl !== url ? [mobileUrl, url] : [url]
    
    for (const tryUrl of urlsToTry) {
      for (const ua of userAgents) {
        try {
          const pageRes = await fetch(tryUrl, {
            headers: {
              'User-Agent': ua,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
              'Accept-Encoding': 'identity',
              'Cache-Control': 'no-cache',
            },
            redirect: 'follow',
          })

          if (pageRes.ok) {
            html = await pageRes.text()
            if (html.length > 1000) {
              fetchSuccess = true
              break
            }
          }
        } catch { /* try next */ }
      }
      if (fetchSuccess) break
    }

    if (!fetchSuccess || !html) {
      return { success: false, error: `Failed to fetch page`, url }
    }

    // Extract meaningful parts: title, meta, og tags, JSON-LD, price patterns, image tags
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const metaMatches = html.match(/<meta[^>]*(property|name|content)[^>]*>/gi) || []
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []
    const pricePatterns = html.match(/("price"|"amount"|"priceCurrency"|"lowPrice"|"highPrice"|"offerPrice"|"salePrice"|"retailPrice"|data-price|data-sale)[^}]{0,200}/gi) || []
    
    // Extract image URLs from og:image, product images, etc.
    const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:image"/i)
    const imgMatches = html.match(/<img[^>]*src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))[^"]*"[^>]*>/gi)?.slice(0, 10) || []
    
    // Look for price in various formats
    const scriptPriceMatches = html.match(/(retail_price|sale_price|price|amount)\s*[:=]\s*["']?(\d+[.,]?\d*)/gi) || []
    
    // Look for currency indicators
    const currencyMatches = html.match(/(EUR|USD|HUF|GBP|Ft|€|\$|£|¥|CNY)\s*\d|\d[.,]?\d*\s*(EUR|USD|HUF|GBP|Ft|€|\$|£|¥|CNY)/gi) || []

    const extractedParts = [
      titleMatch ? `<title>${titleMatch[1]}</title>` : '',
      ogImageMatch ? `OG_IMAGE: ${ogImageMatch[1]}` : '',
      metaMatches.slice(0, 40).join('\n'),
      jsonLdMatches.slice(0, 5).join('\n'),
      pricePatterns.slice(0, 15).join('\n'),
      scriptPriceMatches.slice(0, 10).join('\n'),
      currencyMatches.slice(0, 5).join('\n'),
      imgMatches.slice(0, 5).join('\n'),
    ].filter(Boolean).join('\n\n')

    // Use extracted structured data + bigger chunk of HTML for better extraction
    const truncatedHtml = extractedParts + '\n\n--- RAW HTML EXCERPT ---\n' + html.substring(0, 16000)

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a product data extractor for online shops (Shein, AliExpress, Zara, H&M, About You, ASOS, Temu, Amazon, eBay, etc.).

CRITICAL INSTRUCTIONS:
- Always find the PRICE. Check JSON-LD, meta tags (og:price, product:price), data attributes (data-price, data-sale), JavaScript variables (retail_price, sale_price, price), and raw text patterns.
- Always find the IMAGE URL. Check og:image meta tag, JSON-LD image, and <img> tags. Return ABSOLUTE URLs only.
- For Shein: prices are often in JavaScript objects like "retail_price" or "sale_price" in EUR/USD cents or whole numbers.
- Convert any price from cents to whole units if clearly in cents (e.g., 899 cents = 8.99).

Return ONLY valid JSON (no markdown, no backticks):
{
  "product_name": "string - full product name/title",
  "unit_cost": number - price as a decimal number (e.g., 8.99),
  "currency": "string - EUR, USD, HUF, GBP, etc.",
  "product_sku": "string or null - SKU/article/item number if found",
  "supplier_name": "string - store/brand name (e.g. SHEIN, Zara, H&M)",
  "image_url": "string or null - main product image URL (must be absolute https:// URL)",
  "category": "string or null - product category if detectable",
  "description": "string or null - short product description (max 200 chars)",
  "sizes_available": "string or null - comma-separated available sizes if found",
  "colors_available": "string or null - comma-separated available colors if found"
}
If price is truly not found, set unit_cost to 0. Never guess prices.`
          },
          {
            role: 'user',
            content: `Extract product info from this page (URL: ${url}):\n\n${truncatedHtml}`
          }
        ],
        temperature: 0.05,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('AI Gateway error:', errText)
      return { success: false, error: 'AI extraction failed', url }
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || ''

    let productData
    try {
      // Try to extract JSON from various formats
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const rawJson = jsonMatch ? jsonMatch[1].trim() : content.trim()
      productData = JSON.parse(rawJson)
    } catch {
      // Try to find JSON object in the response
      try {
        const objMatch = content.match(/\{[\s\S]*\}/)
        if (objMatch) {
          productData = JSON.parse(objMatch[0])
        } else {
          console.error('Failed to parse AI response:', content)
          return { success: false, error: 'Could not parse product data', url }
        }
      } catch {
        console.error('Failed to parse AI response:', content)
        return { success: false, error: 'Could not parse product data', url }
      }
    }

    return { success: true, data: productData, url }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', url }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    // Batch mode
    if (body.urls) {
      const parsed = BatchBodySchema.safeParse(body)
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: 'Invalid URLs', details: parsed.error.flatten() }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Batch scraping ${parsed.data.urls.length} URLs`)
      const results = await Promise.all(
        parsed.data.urls.map(url => scrapeOneUrl(url, LOVABLE_API_KEY))
      )

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Single mode
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid URL', details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { url } = parsed.data
    console.log('Scraping product URL:', url)
    const result = await scrapeOneUrl(url, LOVABLE_API_KEY)

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Extracted product:', result.data)
    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
