import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseAnon() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_products",
  title: "Termékek keresése",
  description: "Keresés a webshop nyilvános termékkatalógusában név, márka vagy leírás alapján.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keresőkifejezés."),
    limit: z.number().int().min(1).max(50).default(10).describe("Találatok maximuma."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("shop_products")
      .select("id,name,slug,brand,price,currency,stock_quantity,description,image_url")
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`)
      .eq("is_active", true)
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
