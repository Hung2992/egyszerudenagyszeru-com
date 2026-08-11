// AI Product Studio — prémium DIGITÁLIS / KURZUS / SZOLGÁLTATÁS termék felépítése ötletből.
// Lánc: 🧠 Architect → 📝 Content → 💰 Pricing → 🛒 Checkout → 🔐 Access/License → 🧪 QA → 💎 Premium Score
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_IMG = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "google/gemini-3.6-flash";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

async function callAI(system: string, user: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}: ${await res.text()}`);
  const j = await res.json();
  const raw = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { return JSON.parse(raw.replace(/```json|```/g, "").trim() || "{}"); }
}

const FF_GUIDE: Record<string, string> = {
  digital: `DIGITÁLIS TERMÉK. Kötelező kimeneti mezők az attributes-ban:
digital_delivery ("file" | "link" | "license" | "email"), digital_format (pl. "PDF + XLSX"),
license_terms (részletes magyar licencfeltétel), download_limit (szám), access_days (szám, 0 = örök),
digital_contents (tömb: a csomag tartalmi elemei, mindegyik {title, description})`,
  course: `MINI-KURZUS / OKTATÁS. Kötelező attributes mezők:
course_mode ("online" | "live" | "hybrid"), course_level, course_audience, course_minutes (szám),
certificate (true/false), access_days (szám), course_modules (tömb: {title, lessons: [{title, minutes}]})`,
  service: `SZOLGÁLTATÁS. Kötelező attributes mezők:
duration_min (szám), service_location ("online" | "onsite" | "both"), service_area, daily_capacity (szám),
lead_time (nap), availability (szöveg), cancellation_policy, service_includes (tömb: mit kap az ügyfél),
intake_questions (tömb: {question, type: "text"|"select"|"number", required: true/false}),
delivery_steps (tömb: a teljesítési folyamat lépései szövegként)`,
};

const ARCHITECT_SYSTEM = `Te egy magyar e-kereskedelmi termék-architekt vagy, aki PRÉMIUM, eladható digitális termékeket,
mini-kurzusokat és szolgáltatásokat épít fel egy magyar webshop partnerének.
Mindig magyarul írsz, konkrétan, marketing-értékesítési szempontból erősen, üres frázisok nélkül.
Csak érvényes JSON objektumot adsz vissza, pontosan ezzel a szerkezettel:
{
  "title": string,
  "slug": string (ékezet nélküli kebab-case),
  "category": string,
  "short_pitch": string (1 mondat),
  "description": string (markdown, 150-350 szó: kinek szól, mit old meg, mit tartalmaz, kimenet),
  "bullets": string[] (5-7 értékesítési pont),
  "faq": [{"q": string, "a": string}] (3-5 db),
  "price_huf": number,
  "compare_price_huf": number | null,
  "price_reasoning": string,
  "upsell": [{"title": string, "price_huf": number, "why": string}] (1-3 db),
  "seo": {"meta_title": string (max 60 karakter), "meta_description": string (max 155 karakter), "keywords": string[]},
  "checkout": {"mode": string, "confirmation_email": string, "post_purchase": string},
  "cover_prompt": string (angol nyelvű, részletes képgenerálási prompt a borítóképhez),
  "attributes": object (a típushoz kötelező mezőkkel)
}`;

const QA_SYSTEM = `Te egy szigorú magyar QA-ügynök vagy, aki prémium termékoldalakat pontoz.
Csak JSON-t adsz vissza:
{
  "scores": {"content": 0-100, "product_page": 0-100, "checkout": 0-100, "seo": 0-100, "experience": 0-100, "upsell": 0-100},
  "total": 0-100,
  "issues": [{"area": string, "severity": "info"|"warn"|"error", "message": string, "fix": string}],
  "verdict": string (1-2 mondat magyarul)
}
Légy őszinte: hiányzó licencfeltétel, gyenge leírás, hiányzó upsell, túl hosszú meta cím esetén pontlevonás.`;

const IMPROVE_SYSTEM = `Te egy magyar prémium termék-optimalizáló ügynök vagy.
Kapsz egy meglévő termék JSON-t és a QA jelentését. A feladatod KIZÁRÓLAG a gyenge területek javítása,
a jól teljesítő részeket ne írd át feleslegesen.
Csak érvényes JSON objektumot adsz vissza, ugyanazzal a szerkezettel, mint a bemeneti termék JSON
(title, slug, category, short_pitch, description, bullets, faq, price_huf, compare_price_huf, price_reasoning,
upsell, seo, checkout, cover_prompt, attributes), KIEGÉSZÍTVE egy "changes" mezővel:
"changes": [{"area": string, "what": string (mit változtattál magyarul, 1 mondat)}]
Szabályok: a seo.meta_title max 60, a seo.meta_description max 155 karakter.
Az attributes kötelező mezőit tartsd meg és töltsd ki hiánytalanul. A címet és a slug-ot csak akkor módosítsd, ha a QA kifejezetten kifogásolta.`;

async function generateCover(prompt: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(AI_IMG, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, n: 1, response_format: "b64_json" }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const d = j.data?.[0];
    return d?.b64_json ? `data:image/png;base64,${d.b64_json}` : (d?.url ?? null);
  } catch (_e) {
    return null;
  }
}

// --- Improvement Report segédek ---
// Ezeket a mezőket a partner adja meg / üzletileg érzékenyek: ha nem változtak, külön kiemeljük.
const PROTECTED_PATHS = [
  "price_huf",
  "compare_price_huf",
  "slug",
  "attributes.license_terms",
  "attributes.download_limit",
  "attributes.access_days",
  "attributes.digital_delivery",
  "attributes.certificate",
  "attributes.cancellation_policy",
];

const readPath = (obj: any, path: string) =>
  path.split(".").reduce((a: any, k) => (a && typeof a === "object" ? a[k] : undefined), obj);

const stable = (v: unknown) => JSON.stringify(v ?? null);

function diffPaths(before: any, after: any, prefix = "", depth = 0): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const path = prefix ? `${prefix}.${k}` : k;
    const a = before?.[k];
    const b = after?.[k];
    if (stable(a) === stable(b)) continue;
    const bothPlainObjects =
      a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b);
    if (bothPlainObjects && depth < 2) out.push(...diffPaths(a, b, path, depth + 1));
    else out.push(path);
  }
  return out;
}

const makeRunId = () => {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  const rnd = Math.floor(Math.random() * 900 + 100);
  return `IMP-${day}-${rnd}`;
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await sb.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "");
    const fulfillment = ["digital", "course", "service"].includes(body.fulfillment) ? String(body.fulfillment) : "digital";
    const idea = String(body.idea || "").trim();
    const mode = body.mode === "improve" ? "improve" : "build";
    if (!partnerId) return json({ error: "partner_id kötelező" }, 400);
    if (mode === "build" && !idea) return json({ error: "Írd le pár mondatban, mit szeretnél eladni." }, 400);

    // Jogosultság: csak a saját partner-profiljához generálhat
    const { data: partner } = await sb
      .from("partners")
      .select("id, company_name, user_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (!partner) return json({ error: "Nincs jogosultságod ehhez a partnerhez." }, 403);

    const runQa = (s: unknown) =>
      callAI(QA_SYSTEM, `Terméktípus: ${fulfillment}\nGenerált termék JSON:\n${JSON.stringify(s).slice(0, 12000)}`);

    // ---------- 💎 PREMIUM AUTO-IMPROVE CIKLUS ----------
    // QA → gyenge területek → AI javítás → újra QA → új score, amíg el nem éri a célt.

    if (mode === "improve") {
      const inputSpec = body.spec;
      if (!inputSpec || typeof inputSpec !== "object") return json({ error: "Hiányzik a javítandó termék." }, 400);
      const target = Math.max(60, Math.min(100, Number(body.target_score) || 90));
      const maxRounds = Math.max(1, Math.min(3, Number(body.max_rounds) || 3));

      let spec: any = inputSpec;
      let qa: any = body.qa && typeof body.qa === "object" ? body.qa : await runQa(spec);
      const rounds: any[] = [{ round: 0, total: Number(qa?.total ?? 0), scores: qa?.scores ?? {}, changes: [] }];

      for (let r = 1; r <= maxRounds; r++) {
        if (Number(qa?.total ?? 0) >= target) break;

        const weak = Object.entries(qa?.scores ?? {})
          .filter(([, v]) => Number(v) < target)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");

        const improved = await callAI(
          IMPROVE_SYSTEM,
          `Terméktípus: ${fulfillment}
${FF_GUIDE[fulfillment]}

Cél pontszám: ${target}/100. Jelenlegi összpontszám: ${qa?.total ?? 0}.
Gyenge területek: ${weak || "nincs kiemelt gyenge terület, emeld az összképet"}.
QA észrevételek: ${JSON.stringify(qa?.issues ?? []).slice(0, 4000)}

Jelenlegi termék JSON:
${JSON.stringify(spec).slice(0, 12000)}`,
        );

        const changes = Array.isArray(improved?.changes) ? improved.changes : [];
        delete improved.changes;
        // Biztonsági háló: a javítás nem törölheti a meglévő mezőket
        spec = { ...spec, ...improved, attributes: { ...(spec.attributes || {}), ...(improved.attributes || {}) } };
        qa = await runQa(spec);
        rounds.push({ round: r, total: Number(qa?.total ?? 0), scores: qa?.scores ?? {}, changes });
      }

      // 📄 IMPROVEMENT REPORT — mi változott, mi maradt érintetlen, QA végállapot
      const changedPaths = diffPaths(inputSpec, spec);
      const unchangedPaths = PROTECTED_PATHS.filter((p) => !changedPaths.includes(p) && readPath(inputSpec, p) !== undefined);
      const report = {
        run_id: makeRunId(),
        created_at: new Date().toISOString(),
        fulfillment,
        target,
        before: Number(rounds[0]?.total ?? 0),
        after: Number(qa?.total ?? 0),
        rounds: Math.max(0, rounds.length - 1),
        max_rounds: maxRounds,
        reached: Number(qa?.total ?? 0) >= target,
        changed: changedPaths,
        unchanged: unchangedPaths,
        qa_areas: Object.entries(qa?.scores ?? {}).map(([area, score]) => ({
          area,
          score: Number(score),
          passed: Number(score) >= target,
        })),
        open_issues: (qa?.issues ?? []).filter((i: any) => i?.severity === "error").length,
        changes: rounds.flatMap((r: any) => r.changes || []),
      };

      return json({
        ok: true,
        fulfillment,
        spec,
        qa,
        rounds,
        target,
        report,
        reached: Number(qa?.total ?? 0) >= target,
      });
    }


    // ---------- ÉPÍTÉS ----------
    const priceHint = Number(body.price_huf || 0) > 0 ? `A partner által megadott célár: ${Number(body.price_huf)} Ft.` : "Az árat te javasold a magyar piac alapján.";

    const spec = await callAI(
      ARCHITECT_SYSTEM,
      `Partner: ${partner.company_name || "magyar kisvállalkozás"}
Terméktípus: ${fulfillment}
${FF_GUIDE[fulfillment]}

Partner ötlete: "${idea}"
${priceHint}

Építs fel egy PRÉMIUM, azonnal értékesíthető terméket. Az attributes mezőben KÖTELEZŐ kitölteni a fenti típushoz tartozó összes mezőt.`,
    );

    const qa = await runQa(spec);

    let cover: string | null = null;
    if (body.generate_cover !== false && spec?.cover_prompt) {
      cover = await generateCover(`${spec.cover_prompt}. Premium, clean, high-end product cover art, no text.`);
    }

    return json({ ok: true, fulfillment, spec, qa, cover });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "rate_limit") return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
    if (msg === "credits_exhausted") return json({ error: "Elfogyott az AI kredit. Töltsd fel a munkaterület egyenlegét." }, 402);
    console.error("partner-product-builder", msg);
    return json({ error: msg }, 500);
  }
});
