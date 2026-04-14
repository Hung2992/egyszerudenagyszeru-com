import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&no-check";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

export function createStripeClient(env: "sandbox" | "live" = "sandbox") {
  const keyName = env === "live" 
    ? "STRIPE_LIVE_API_KEY" 
    : "STRIPE_SANDBOX_API_KEY";
  
  const apiKey = Deno.env.get(keyName);
  if (!apiKey) throw new Error(`${keyName} is not configured`);

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

  return new Stripe(apiKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2025-03-31.basil",
    fetchFn: async (url: string, init?: RequestInit) => {
      const gatewayUrl = url.replace("https://api.stripe.com", GATEWAY_URL);
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${lovableApiKey}`);
      headers.set("X-Connection-Api-Key", apiKey);
      return fetch(gatewayUrl, { ...init, headers });
    },
  });
}
