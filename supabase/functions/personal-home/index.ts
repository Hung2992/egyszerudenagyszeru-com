// Personalized homepage AI: greeting + product recommendations for logged-in users
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for reads
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // Recent order history
    const { data: orders } = await admin
      .from("orders")
      .select("id, total_amount, created_at, items")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Recent page views (browsing signal)
    const { data: views } = await admin
      .from("page_views")
      .select("page, created_at")
      .eq("visitor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Candidate products (top launched)
    const { data: products } = await admin
      .from("shop_products")
      .select("id, name, description, price, image_url, category")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(30);

    const profile = { name: user.email?.split("@")[0] ?? "vásárló" };

    const summary = {
      orders_count: orders?.length ?? 0,
      total_spent: (orders ?? []).reduce((s, o: any) => s + Number(o.total_amount ?? 0), 0),
      recent_pages: (views ?? []).map((v: any) => v.page).slice(0, 10),
      last_purchase_days: orders?.[0]?.created_at
        ? Math.floor((Date.now() - new Date(orders[0].created_at).getTime()) / 86400000)
        : null,
    };

    // Call Lovable AI for personalization
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({
        greeting: `Üdv újra, ${profile.name}!`,
        subtitle: "Nézd meg az új darabokat.",
        product_ids: (products ?? []).slice(0, 6).map((p: any) => p.id),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const productList = (products ?? []).map((p: any) =>
      `- ${p.id} | ${p.name} | ${p.category ?? "-"} | ${p.price} Ft`
    ).join("\n");

    const prompt = `Streetwear webshop személyre szabott kezdőlap.
Vásárló: ${profile.name}
Rendelések: ${summary.orders_count}, összköltés: ${summary.total_spent} Ft
Utolsó vásárlás: ${summary.last_purchase_days ?? "-"} napja
Böngészett oldalak: ${summary.recent_pages.join(", ") || "-"}

Termékek (id | név | kategória | ár):
${productList}

Feladat: adj vissza JSON-t: { "greeting": "rövid, magyar, tegező üdvözlés max 60 karakter", "subtitle": "1 mondatos ajánlat max 120 karakter", "product_ids": ["6 termék id, a vásárló preferenciái alapján"] }
CSAK a JSON-t add vissza, semmi mást.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      // Fallback
      return new Response(JSON.stringify({
        greeting: `Üdv újra, ${profile.name}!`,
        subtitle: "Nézd meg az új darabokat.",
        product_ids: (products ?? []).slice(0, 6).map((p: any) => p.id),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const validIds = new Set((products ?? []).map((p: any) => p.id));
    const productIds = (parsed.product_ids ?? [])
      .filter((id: string) => validIds.has(id))
      .slice(0, 6);

    return new Response(JSON.stringify({
      greeting: parsed.greeting || `Üdv újra, ${profile.name}!`,
      subtitle: parsed.subtitle || "Neked válogatott darabok.",
      product_ids: productIds.length ? productIds : (products ?? []).slice(0, 6).map((p: any) => p.id),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("personal-home error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
