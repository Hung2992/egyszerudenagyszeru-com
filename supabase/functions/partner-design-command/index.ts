// AI Command Engine — természetes nyelvű design parancs értelmezése.
// Az AI CSAK strukturált token-javaslatot ad vissza; semmit nem ír az adatbázisba.
// A tényleges alkalmazás a partner jóváhagyása után, kliensoldali validáció mögött történik.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiChat } from "../_shared/ai-router.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `Te egy webshop DESIGN TOKEN fordító vagy. A felhasználó magyarul mond egy dizájn kérést,
te pedig KIZÁRÓLAG a megadott design tokenek módosítását javaslod. Nem írsz CSS-t, nem találsz ki új tokent,
nem módosítasz tartalmat, árat, terméket vagy szöveget.

MÓDOSÍTHATÓ TOKENEK ÉS ÉRTÉKEK:
- radius: szám 0-32 (sarokkerekítés px)
- spacing: "compact" | "comfortable" | "spacious"
- shadow: "none" | "soft" | "elevated"
- buttonShape: "square" | "rounded" | "pill"
- buttonStyle: "solid" | "outline"
- cardStyle: "bordered" | "elevated" | "flat"
- imageStyle: "square" | "rounded" | "soft"
- borderWidth: szám 1-4
- headingWeight: szám 400-900
- headingTracking: "tight" | "normal" | "wide"
- typeScale: szám 0.9-1.2

SCOPE: "global" | "section" | "component" | "page"
TARGET (opcionális): "buttons" | "cards" | "hero" | "search" | "forms" | "typography" | "sections" | "images" | "checkout"

SZABÁLYOK:
- Csak azokat a tokeneket sorold fel, amelyek TÉNYLEGESEN változnak a jelenlegi értékhez képest.
- IRÁNY: "kevésbé lekerekített"/"szögletesebb" → a radius CSÖKKEN; "kerekebb"/"lágyabb" → a radius NŐ;
  "több térköz" → spacing nagyobb; "kompaktabb" → spacing kisebb. Soha ne fordítsd meg az irányt.
- Ha a kért irányban a token már a szélső értéken van (pl. radius már 0 és még kevésbé kerekítenél),
  akkor csak a többi, még mozgatható tokent javasold; ha egy sem mozdítható, adj "clarify" választ.
- Max 6 változtatás. Az explanation magyar, max 2 rövid mondat, felsorolás nélkül.
- Ha a kérés több értelmezést enged (pl. "legyen nagyobb"), NE találj ki változtatást:
  válaszolj {"intent":"clarify","question":"..."} formában egy rövid, konkrét kérdéssel.
- Ha a kérés nem dizájnról szól, szintén "clarify".

VÁLASZ KIZÁRÓLAG JSON:
{"intent":"update_design","scope":"global","target":null,"changes":[{"token":"radius","from":14,"to":0}],"explanation":"..."}
vagy
{"intent":"clarify","question":"..."}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "");
    const command = String(body.command || "").trim().slice(0, 400);
    if (!partnerId || partnerId.length > 64) return json({ error: "partner_id required" }, 400);
    if (!command) return json({ error: "command required" }, 400);

    // Tenant isolation: a partner_id önmagában nem hiteles.
    const { data: partner } = await supabase
      .from("partners").select("id").eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const { data: sf } = await supabase
      .from("partner_storefronts")
      .select("id, display_name, brand_dna, section_order, hero_layout, testimonials_enabled, newsletter_enabled, featured_products_enabled")
      .eq("partner_id", partnerId).maybeSingle();

    const context = {
      shop: sf?.display_name ?? null,
      current_tokens: sf?.brand_dna ?? null,
      sections: sf?.section_order ?? null,
      hero_layout: sf?.hero_layout ?? null,
      has_testimonials: !!sf?.testimonials_enabled,
      has_newsletter: !!sf?.newsletter_enabled,
      has_featured_products: !!sf?.featured_products_enabled,
    };

    let raw: unknown;
    try {
      const { content } = await aiChat({
        system: SYSTEM,
        user: `WEBSHOP KONTEXTUS:\n${JSON.stringify(context)}\n\nPARANCS:\n${command}`,
        jsonMode: true,
        cloudModel: "google/gemini-3.8-flash",
        functionName: "partner-design-command",
        maxTokens: 700,
      });
      raw = JSON.parse(content);
    } catch (e) {
      console.error("[partner-design-command] ai_failed", e instanceof Error ? e.message : "unknown");
      return json({ error: "ai_unavailable" }, 503);
    }

    // Alap alakzat-ellenőrzés; a teljes séma- és értékvalidáció a kliensen fut az alkalmazás előtt.
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (r.intent !== "update_design" && r.intent !== "clarify") {
      return json({ error: "invalid_ai_response" }, 422);
    }

    return json({ proposal: r, context });
  } catch (e) {
    console.error("[partner-design-command] error", e instanceof Error ? e.message : "unknown");
    return json({ error: "internal_error" }, 500);
  }
});
