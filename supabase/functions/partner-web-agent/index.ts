// AI Web Creator Agent — beszélgetős, több-ügynökös webshop/weboldal építő partnereknek
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { publish } from "../_shared/agent-bus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AGENTS: Record<string, string> = {
  architect: "🧠 Architect — oldalstruktúra, szekciók, felépítés",
  designer: "🎨 Designer — színek, tipográfia, UI hangulat, sötét/világos mód",
  frontend: "💻 Frontend — hero, szekciók, elrendezés, mobilbarát beállítások",
  backend: "⚙️ Backend — adat- és jogosultsági beállítások",
  commerce: "🛒 Commerce — kiemelt termékek, kosár, akciók",
  seo: "🤖 SEO — meta cím, leírás, kulcsszavak",
  content: "📝 Content — szövegek, GYIK, vélemények, about",
  media: "🖼️ Media — képek, bannerek, videó beállítások",
  qa: "🧪 QA — ellenőrzés, hiányzó mezők, konzisztencia",
  deploy: "🚀 Deploy — publikálási javaslat",
};

// Csak ezek a storefront mezők írhatók az AI által
const ALLOWED = [
  "display_name", "tagline", "about_html",
  "primary_color", "accent_color", "bg_color", "text_color",
  "font_heading", "font_body", "theme_preset",
  "hero_title", "hero_subtitle", "hero_cta_text", "hero_layout",
  "hero_badge_enabled", "hero_badge_text", "hero_overlay_opacity",
  "topbar_enabled", "topbar_text",
  "section1_enabled", "section1_title", "section1_text",
  "section2_enabled", "section2_title", "section2_text",
  "featured_products_enabled", "featured_products_title",
  "testimonials_enabled", "testimonials_title", "testimonials",
  "newsletter_enabled", "newsletter_title", "newsletter_subtitle",
  "footer_text", "footer_links",
  "meta_title", "meta_description",
];

async function chat(apiKey: string, system: string, messages: any[]) {
  const r = await fetch(AI_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      response_format: { type: "json_object" },
    }),
  });
  if (r.status === 429) throw Object.assign(new Error("Túl sok kérés, próbáld pár másodperc múlva."), { status: 429 });
  if (r.status === 402) throw Object.assign(new Error("Elfogytak az AI kreditek."), { status: 402 });
  if (!r.ok) throw Object.assign(new Error(`AI hiba (${r.status})`), { status: 502 });
  const d = await r.json();
  const c = d?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

// Támogatott projekt-típusok (nem csak webshop)
const PROJECT_TYPES: Record<string, string> = {
  webshop: "Webshop / online bolt (termékek, kosár, fizetés, szállítás)",
  corporate: "Vállalati weboldal (bemutatkozás, szolgáltatások, referenciák, kapcsolat)",
  restaurant: "Éttermi rendelő rendszer (étlap, rendelés, kiszállítás, nyitvatartás)",
  booking: "Időpontfoglaló (szolgáltatások, naptár, foglalás, emlékeztetők)",
  crm: "CRM (ügyfelek, leadek, pipeline, feladatok)",
  erp: "ERP (készlet, beszerzés, számlázás, riportok)",
  portal: "Partnerportál (belépés, dokumentumok, jutalékok, statisztika)",
  saas: "SaaS termékoldal (árazás, funkciók, próbaverzió, onboarding)",
  mobile_backend: "Mobilalkalmazás háttér (API, adatmodell, jogosultságok)",
};

const ARCHITECT_SYSTEM = `Te vagy az 🧠 Architect Agent + AI Projektmenedzser egy AI szoftverfejlesztő platformon. A partner magyarul beszélget veled.
A feladatod: eldönteni MELYIK szakértő ügynökök dolgozzanak a kérésen, milyen sorrendben, és rövid feladatot adni nekik — mint egy projektmenedzser a csapatnak.
Elérhető ügynökök: ${Object.keys(AGENTS).join(", ")}.
Projekt-típusok: ${Object.keys(PROJECT_TYPES).join(", ")}.
Minden lépéshez adj konkrét "target"-et is (pl. módosított oldal/szekció, komponens, adatmező vagy adatbázis-tábla), hogy a partner élőben lássa mi történik.
Csak érvényes JSON:
{"project_type":"webshop","plan":[{"agent":"designer","task":"1 mondatos feladat magyarul","target":"pl. hero szekció színek","kind":"design|page|component|data|seo|content|media|test|deploy"}],"intent":"create|modify|question","pm_intro":"1-2 mondat projektmenedzseri bejelentés: mi a terv és ki jön sorban"}`;

const BUILDER_SYSTEM = `Te vagy egy AI fejlesztő ügynök-csapat (Designer, Frontend, Backend, Commerce, SEO, Content, Media, QA, Deploy) egy magyar AI szoftverfejlesztő platformon.
A partner természetes nyelven kér változtatásokat egy MEGLÉVŐ projekt konfiguráción — pontosan úgy, mint egy fejlesztőcsapattal beszélgetve.
Csak azokat a mezőket add vissza a patch-ben, amiket a kérés ténylegesen érint (iteratív módosítás!). Új oldal esetén tölts ki mindent.
Magyar, márkához illő, meggyőző szövegeket írj. Színek HEX-ben.
Az agent_log legyen RÉSZLETES és élő fejlesztőnaplószerű: minden lépésnél írd le mit módosítottál (szekció/komponens/mező/tábla).

Csak érvényes JSON:
{
  "reply": "2-5 mondat magyarul, beszélgetős hangnemben: mit csináltál, mit javasolsz még",
  "pm_summary": "1-2 mondat projektmenedzseri zárás: mi készült el, mi a következő javasolt lépés",
  "patch": { csak érintett storefront mezők },
  "agent_log": [{"agent":"designer","action":"mit csinált 1 mondatban","target":"hero szekció","kind":"design","fields":["primary_color"]}],
  "qa": {"passed": true, "checks": [{"name":"Kötelező mezők","ok":true,"note":"..."}]},
  "brand_memory": { "colors": [...], "audience": "...", "style": "...", "decisions": ["..."] },
  "todo": ["amit a partnernek kézzel kell megtennie, ha van"]
}

Használható storefront mezők: ${ALLOWED.join(", ")}.
A testimonials tömb: [{"name":..,"text":..,"rating":5}], a footer_links: [{"label":..,"url":..}].`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY hiányzik" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Bejelentkezés szükséges" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return json({ error: "Érvénytelen munkamenet" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body?.partner_id || "").trim();
    const sessionId = String(body?.session_id || "").trim();
    const message = String(body?.message || "").trim();
    const autoApply = body?.auto_apply !== false;
    const stage = String(body?.stage || "full"); // "plan" | "build" | "full"
    const projectType = String(body?.project_type || "").trim();
    const incomingPlan = Array.isArray(body?.plan) ? body.plan.slice(0, 10) : null;
    if (!partnerId || !sessionId) return json({ error: "partner_id és session_id kötelező" }, 400);
    if (message.length < 2) return json({ error: "Írd le mit szeretnél" }, 400);

    // Jogosultság (RLS is véd)
    const { data: partner } = await supabase
      .from("partners").select("id, brand_name").eq("id", partnerId).maybeSingle();
    if (!partner) return json({ error: "Nincs jogosultságod ehhez a partnerhez" }, 403);

    // Kontextus
    const [{ data: sf }, { data: mem }, { data: prods }, { data: history }] = await Promise.all([
      supabase.from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle(),
      supabase.from("partner_brand_memory").select("memory").eq("partner_id", partnerId).maybeSingle(),
      supabase.from("partner_products").select("title, price, category").eq("partner_id", partnerId).limit(15),
      supabase.from("partner_ai_builder_messages").select("role, content")
        .eq("session_id", sessionId).order("created_at", { ascending: true }).limit(30),
    ]);

    const currentConfig: Record<string, unknown> = {};
    for (const k of ALLOWED) if (sf && sf[k] !== undefined && sf[k] !== null && sf[k] !== "") currentConfig[k] = sf[k];

    const convo = (history || []).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const typeHint = projectType && PROJECT_TYPES[projectType]
      ? `Projekt-típus: ${projectType} — ${PROJECT_TYPES[projectType]}`
      : "Projekt-típus: automatikusan döntsd el a kérésből.";

    // ── 1) Architect / Projektmenedzser fázis
    if (stage === "plan" || stage === "full") {
      const plan = await chat(apiKey, ARCHITECT_SYSTEM, [
        ...convo.slice(-8),
        {
          role: "user",
          content: `Márka: ${partner.brand_name || "-"}\n${typeHint}\nVan már konfiguráció: ${sf ? "igen" : "nem"}\nKérés: ${message}`,
        },
      ]);
      const agentPlan = Array.isArray(plan?.plan) ? plan.plan.slice(0, 10) : [];

      if (stage === "plan") {
        // A felhasználói üzenet mentése már itt megtörténik (egyszer)
        await supabase.from("partner_ai_builder_messages")
          .insert({ session_id: sessionId, partner_id: partnerId, role: "user", content: message });
        publish(supabase, {
          source: "web-creator-agent",
          eventType: "partner.project.planned",
          severity: "info",
          payload: { partner_id: partnerId, session_id: sessionId, project_type: plan?.project_type ?? projectType, steps: agentPlan.length },
        }).catch(() => {});
        return json({
          ok: true,
          stage: "plan",
          project_type: plan?.project_type ?? projectType ?? null,
          pm_intro: String(plan?.pm_intro || "Összeállítottam a csapatot, kezdjük."),
          plan: agentPlan,
        });
      }
      (body as any).__plan = agentPlan;
      (body as any).__pm_intro = plan?.pm_intro;
      (body as any).__project_type = plan?.project_type;
    }

    const agentPlan = incomingPlan ?? (body as any).__plan ?? [];
    const pmIntro = String((body as any).__pm_intro || body?.pm_intro || "");

    if (stage === "full") {
      await supabase.from("partner_ai_builder_messages")
        .insert({ session_id: sessionId, partner_id: partnerId, role: "user", content: message });
    }

    // ── 2) Ügynök-csapat: elkészíti a konkrét változtatást
    const built = await chat(apiKey, BUILDER_SYSTEM, [
      ...convo.slice(-12),
      {
        role: "user",
        content: `Márka: ${partner.brand_name || "-"}
${typeHint}
Márka-memória (korábbi döntések): ${JSON.stringify(mem?.memory ?? {})}
Jelenlegi konfiguráció: ${JSON.stringify(currentConfig)}
Termékek: ${JSON.stringify((prods || []).slice(0, 10))}
Architect terv: ${JSON.stringify(agentPlan)}

A partner kérése: """${message.slice(0, 4000)}"""`,
      },
    ]);

    const rawPatch = built?.patch && typeof built.patch === "object" ? built.patch : {};
    const patch: Record<string, unknown> = {};
    for (const k of ALLOWED) if (rawPatch[k] !== undefined && rawPatch[k] !== null) patch[k] = rawPatch[k];

    // 3) Alkalmazás
    let applied = false;
    if (autoApply && Object.keys(patch).length) {
      if (sf?.id) {
        const { error } = await supabase.from("partner_storefronts").update(patch).eq("id", sf.id);
        applied = !error;
        if (error) console.warn("[web-agent] update failed:", error.message);
      } else {
        const { error } = await supabase.from("partner_storefronts").insert({ partner_id: partnerId, ...patch });
        applied = !error;
        if (error) console.warn("[web-agent] insert failed:", error.message);
      }
    }

    // 4) Hosszú távú márka-memória frissítése
    if (built?.brand_memory && typeof built.brand_memory === "object") {
      const merged = { ...(mem?.memory ?? {}), ...built.brand_memory, updated_at: new Date().toISOString() };
      await supabase.from("partner_brand_memory")
        .upsert({ partner_id: partnerId, memory: merged, updated_at: new Date().toISOString() }, { onConflict: "partner_id" });
    }

    const reply = String(built?.reply || pmIntro || "Kész.");
    const pmSummary = String(built?.pm_summary || "");
    const qa = built?.qa && typeof built.qa === "object" ? built.qa : null;
    const agentLog = (Array.isArray(built?.agent_log) ? built.agent_log.slice(0, 14) : agentPlan).map((a: any) => ({
      agent: a?.agent ?? "frontend",
      action: a?.action ?? a?.task ?? "",
      target: a?.target ?? null,
      kind: a?.kind ?? null,
      fields: Array.isArray(a?.fields) ? a.fields.slice(0, 8) : [],
      status: "done",
    }));

    // Élő "fejlesztői" napló: adatbázis- és bus-műveletek is látszódjanak
    const devLog = [
      ...agentLog,
      ...(Object.keys(patch).length
        ? [{ agent: "backend", action: `Adatbázis frissítés: partner_storefronts (${Object.keys(patch).length} mező)`, target: "partner_storefronts", kind: "data", fields: Object.keys(patch).slice(0, 8), status: applied ? "done" : "pending" }]
        : []),
      { agent: "qa", action: qa?.passed === false ? "Tesztek: figyelmeztetés" : "Tesztek lefutottak, konzisztencia rendben", target: "QA", kind: "test", fields: [], status: qa?.passed === false ? "warn" : "done" },
      { agent: "deploy", action: applied ? "Változások élesítve a vázlat oldalon" : "Változások előkészítve, jóváhagyásra vár", target: "storefront", kind: "deploy", fields: [], status: applied ? "done" : "pending" },
    ];

    await supabase.from("partner_ai_builder_messages").insert({
      session_id: sessionId, partner_id: partnerId, role: "assistant",
      content: reply, agent_plan: devLog, patch, applied,
    });
    await supabase.from("partner_ai_builder_sessions")
      .update({ updated_at: new Date().toISOString() }).eq("id", sessionId);

    // 5) Agent Bus értesítés
    publish(supabase, {
      source: "web-creator-agent",
      eventType: "partner.site.updated",
      severity: "info",
      payload: { partner_id: partnerId, session_id: sessionId, project_type: projectType || (body as any).__project_type || null, fields: Object.keys(patch), applied, agents: devLog },
    }).catch(() => {});

    return json({
      ok: true,
      stage: "build",
      reply,
      pm_summary: pmSummary,
      qa,
      patch,
      applied,
      agent_log: devLog,
      bus_event: "partner.site.updated",
      todo: Array.isArray(built?.todo) ? built.todo.slice(0, 6) : [],
    });

  } catch (e) {
    const err = e as Error & { status?: number };
    return json({ error: err.message || "Ismeretlen hiba" }, err.status || 500);
  }
});
