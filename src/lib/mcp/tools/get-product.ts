import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseAnon() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_product",
  title: "Termék részletei",
  description: "Egyetlen webshop termék részletes adatai slug vagy id alapján.",
  inputSchema: {
    idOrSlug: z.string().trim().min(1).describe("Termék id (uuid) vagy slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ idOrSlug }) => {
    const supabase = supabaseAnon();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq(isUuid ? "id" : "slug", idOrSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Nincs ilyen termék." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { product: data },
    };
  },
});
