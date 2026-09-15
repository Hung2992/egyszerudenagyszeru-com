// Szekciónkénti AI újratervezés — az AI kizárólag a whitelistelt szöveges mezőkre
// ad javaslatot. Semmit nem ír az adatbázisba: a mentés a partner jóváhagyása után,
// kliensoldali validáció mögött történik.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiChat } from "../_shared/ai-router.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface FieldSpec { key: string; label: string; maxLength: number }

const SECTIONS: Record<string, { label: string; purpose: string; fields: FieldSpec[] }> = {
  topbar: {
    label: "Hirdetősáv",
    purpose: "Egysoros, figyelemfelkeltő sáv a bolt tetején.",
    fields: [{ key: "topbar_text", label: "Sáv szövege", maxLength: 90 }],
  },
  hero: {
    label: "Hero (nyitóképernyő)",
    purpose: "A bolt első benyomása: fő üzenet, alcím, cselekvésre hívó gomb.",
    fields: [
      { key: "hero_badge_text", label: "Badge", maxLength: 40 },
      { key: "hero_title", label: "Fő cím", maxLength: 60 },
      { key: "hero_subtitle", label: "Alcím", maxLength: 160 },
      { key: "hero_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  section1: {
    label: "Szekció 1",
    purpose: "Képes tartalmi blokk: egy előny vagy történet kiemelése.",
    fields: [
      { key: "section1_title", label: "Cím", maxLength: 60 },
      { key: "section1_subtitle", label: "Szöveg", maxLength: 220 },
      { key: "section1_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  section2: {
    label: "Szekció 2",
    purpose: "Második képes tartalmi blokk kiegészítő üzenettel.",
    fields: [
      { key: "section2_title", label: "Cím", maxLength: 60 },
      { key: "section2_subtitle", label: "Szöveg", maxLength: 220 },
      { key: "section2_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  featured: {
    label: "Kiemelt termékek",
    purpose: "A kiemelt termékblokk címsora.",
    fields: [{ key: "featured_products_title", label: "Blokk címe", maxLength: 60 }],
  },
  testimonials: {
    label: "Vélemények",
    purpose: "Vásárlói visszajelzések blokkjának címsora.",
    fields: [{ key: "testimonials_title", label: "Blokk címe", maxLength: 60 }],
  },
  about: {
    label: "Rólunk",
    purpose: "Rövid, bizalomépítő márkabemutatkozás.",
    fields: [{ key: "about_html", label: "Bemutatkozó szöveg", maxLength: 900 }],
  },
  newsletter: {
    label: "Hírlevél",
    purpose: "Feliratkozási blokk címe és ösztönző szövege.",
    fields: [
      { key: "newsletter_title", label: "Cím", maxLength: 60 },
      { key: "newsletter_subtitle", label: "Szöveg", maxLength: 180 },
    ],
  },
};

const SYSTEM = `Te egy magyar nyelvű webshop COPY és UX szakértő vagy. Egyetlen szekció szövegeit tervezed újra.

SZABÁLYOK:
- KIZÁRÓLAG a megadott mezőkulcsokra adhatsz javaslatot. Más kulcsot tilos visszaadni.
- Tilos árat, terméket, kedvezményt, szállítási ígéretet, garanciát vagy bármilyen tényt kitalálni,
  ha az nem szerepel a kapott kontextusban.
- Tartsd be a mezőnkénti maximális karakterszámot.
- Magyar nyelven írj, a megadott márkahangnemhez illeszkedve, közhelyek nélkül.
- Csak azokat a mezőket sorold fel, amelyek TÉNYLEGESEN jobbak lesznek a jelenlegihez képest.
- Ha nincs érdemi javítási lehetőség, üres changes tömböt adj vissza.

VÁLASZ KIZÁRÓLAG JSON:
{"changes":[{"key":"hero_title","to":"..."}],"rationale":"1-2 rövid mondat magyarul"}`;

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
    const sectionId = String(body.section || "");
    const instruction = String(body.instruction || "").trim().slice(0, 300);
    if (!partnerId || partnerId.length > 64) return json({ error: "partner_id required" }, 400);

    const section = SECTIONS[sectionId];
    if (!section) return json({ error: "invalid_section" }, 400);

    // Tenant isolation: a partner_id önmagában nem hiteles.
    const { data: partner } = await supabase
      .from("partners").select("id").eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const { data: sf } = await supabase
      .from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle();
    if (!sf) return json({ error: "no_storefront" }, 404);

    const { data: products } = await supabase
      .from("partner_products")
      .select("title, price_huf, category")
      .eq("partner_id", partnerId)
      .eq("status", "active")
      .limit(12);

    const current: Record<string, unknown> = {};
    for (const f of section.fields) current[f.key] = (sf as Record<string, unknown>)[f.key] ?? "";

    const context = {
      shop: sf.display_name ?? null,
      tagline: sf.tagline ?? null,
      brand_dna: sf.brand_dna ?? null,
      section: { id: sectionId, label: section.label, purpose: section.purpose },
      fields: section.fields,
      current_values: current,
      real_products: (products || []).map((p) => ({ title: p.title, price_huf: p.price_huf, category: p.category })),
    };

    let raw: unknown;
    try {
      const { content } = await aiChat({
        system: SYSTEM,
        user: `SZEKCIÓ KONTEXTUS:\n${JSON.stringify(context)}\n\nPARTNER KÉRÉSE:\n${instruction || "(nincs külön kérés — javítsd a szekció szövegeit a márkához illően)"}`,
        jsonMode: true,
        cloudModel: "google/gemini-3.8-flash",
        functionName: "partner-section-redesign",
        maxTokens: 900,
      });
      raw = JSON.parse(content);
    } catch (e) {
      console.error("[partner-section-redesign] ai_failed", e instanceof Error ? e.message : "unknown");
      return json({ error: "ai_unavailable" }, 503);
    }

    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (!Array.isArray(r.changes)) return json({ error: "invalid_ai_response" }, 422);

    return json({ section: sectionId, proposal: r, current });
  } catch (e) {
    console.error("[partner-section-redesign] error", e instanceof Error ? e.message : "unknown");
    return json({ error: "internal_error" }, 500);
  }
});
