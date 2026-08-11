import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { collectAllSignals } from "../_shared/ai-memory.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isAdmin = async (supabase: any, userId: string) => {
  try {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return !!data;
  } catch { return false; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Bejelentkezés szükséges" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!data.user) return json({ error: "Érvénytelen munkamenet" }, 401);

  const admin = await isAdmin(userClient, data.user.id);
  if (!admin) return json({ error: "Csak admin gyűjthet memória-jeleket" }, 403);

  // Service role kliens a teljes adat aggregálásához
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const result = await collectAllSignals(serviceClient);
  return json({ ok: true, ...result, collected_at: new Date().toISOString() });
});
