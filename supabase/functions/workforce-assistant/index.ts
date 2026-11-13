// Személyi AI asszisztens minden AI WORKFORCE területhez (sziget). Csak olvas és tanácsol:
// végrehajtani nem tud, minden művelet a HUMAN GATE + AEGIS útján megy (foundation read-only).
import { installAiMeter } from "../_shared/ai-meter.ts";
installAiMeter("workforce-assistant");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: c } = await db.auth.getClaims(auth.slice(7));
    const uid = c?.claims?.sub;
    if (!uid) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return j({ error: "Admin access required" }, 403);

    const body = await req.json();
    const dept = String(body?.department ?? "").slice(0, 60);
    const roles = Array.isArray(body?.roles) ? body.roles.slice(0, 12).map(String) : [];
    const messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      .slice(-30).map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!dept || !messages.length) return j({ error: "Hiányzó adat" }, 400);

    const { data: plans } = await db.from("workforce_plans").select("id,goal,risk,status,owner,due_date").order("created_at", { ascending: false }).limit(60);
    const { data: steps } = await db.from("workforce_plan_steps").select("plan_id,idx,status,owner,task,result").order("idx").limit(600);
    const key = dept.toLowerCase();
    const mine = (s?: string | null) => !!s && s.toLowerCase().includes(key);
    const myPlans = (plans ?? []).filter((p: any) => mine(p.owner) || (steps ?? []).some((s: any) => s.plan_id === p.id && mine(s.owner)));
    const ctx = myPlans.map((p: any) => {
      const st = (steps ?? []).filter((s: any) => s.plan_id === p.id);
      return `- "${p.goal}" | állapot: ${p.status} | kockázat: ${p.risk} | határidő: ${p.due_date ?? "nincs"} | lépések: ${st.filter((s: any) => s.status === "done").length}/${st.length} kész\n` +
        st.map((s: any) => `   ${s.idx + 1}. [${s.status}] ${s.task ?? ""} (felelős: ${s.owner ?? "-"})${s.result ? " — eredmény: " + String(s.result).slice(0, 160) : ""}`).join("\n");
    }).join("\n") || "Jelenleg nincs ehhez a területhez rendelt terv.";

    const system = `Te a(z) "${dept}" terület személyi AI asszisztense vagy az AI WORKFORCE-ban (Central AI + AEGIS őr). Csapatod szerepkörei: ${roles.join(", ")}.
Magyarul, röviden, tegezve válaszolj, markdownnal. A lenti valós adatokból dolgozz; ha valami nincs az adatokban, mondd ki, ne találj ki számot.
Nem hajthatsz végre semmit: ha a felhasználó műveletet kér, javasolj tervet és mondd, hogy a WORKFORCE fülön mentse el, a HUMAN GATE-en hagyja jóvá. Pénzmozgás, törlés, jogi ügy mindig emberi döntés.
Valós tervek és lépések (${new Date().toISOString().slice(0, 10)}):
${ctx}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3.5-flash", stream: true, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!r.ok) return j({ error: r.status === 429 ? "Túl sok kérés, próbáld később." : r.status === 402 ? "Elfogyott az AI keret." : "AI hiba" }, r.status);
    return new Response(r.body, { headers: { ...cors, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});
