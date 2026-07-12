import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_order",
  title: "Saját rendelés részletei",
  description: "Egy adott saját rendelés részletes adatai + szállítási események.",
  inputSchema: {
    orderId: z.string().trim().min(1).describe("A rendelés id-je vagy rendelésszáma."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ orderId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nem vagy bejelentkezve." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq(isUuid ? "id" : "order_number", orderId)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!order) {
      return { content: [{ type: "text", text: "Nincs ilyen rendelésed." }], isError: true };
    }
    const { data: events } = await supabase
      .from("order_events")
      .select("event_type,created_at,details")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });
    const result = { order, events: events ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
