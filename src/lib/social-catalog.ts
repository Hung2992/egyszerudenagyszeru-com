import { sanitizeHtml } from "@/lib/sanitize-html";
export type CatalogItem = { id: string; source: string; title: string; body: string | null; price: number | null; store: string; partner_id: string | null; url: string | null; state: string; eligible: boolean };
export const sourceLabels: Record<string, string> = { product: "Saját termék", partner_product: "Partnertermék", campaign: "Saját kampány", partner_campaign: "Partnerkampány", page: "Webshopoldal" };
export function plainContent(html: string | null) {
  const document = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
export function catalogDraft(item: CatalogItem, platform: string) {
  const body = plainContent(item.body).slice(0, platform === "tiktok" ? 350 : 1000);
  const price = item.price === null ? "" : `${Number(item.price).toLocaleString("hu-HU")} Ft`;
  return [item.store, item.title, price, body, item.url].filter(Boolean).join("\n");
}
export function platformOutline(item: CatalogItem, platform: string) {
  if (platform === "tiktok") return `Videóterv: ${item.title} bemutatása → valódi részletek → ${item.store} ajánlata. Saját videó szükséges.`;
  if (platform === "linkedin") return `Szakmai bemutató: ${item.title} → tények és felhasználás → ${item.store}.`;
  return `Termék/oldal bemutató: ${item.title} → részletek → ${item.store} ajánlata és céloldala.`;
}