import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listMyOrders from "./tools/list-my-orders";
import getMyOrder from "./tools/get-my-order";
import whoami from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "egyszerudenagyszeru-mcp",
  title: "Egyszerű de Nagyszerű MCP",
  version: "0.1.0",
  instructions:
    "Tool-ok az Egyszerű de Nagyszerű webshophoz. Keress termékeket a katalógusban (search_products, get_product), " +
    "vagy a bejelentkezett felhasználó nevében kérdezd le a saját rendeléseit (list_my_orders, get_my_order). " +
    "A whoami visszaadja a bejelentkezett felhasználó azonosítóját.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, getProduct, listMyOrders, getMyOrder, whoami],
});
