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
export function tiktokVariants(item: CatalogItem) {
  const facts = catalogDraft(item, "tiktok");
  return [{ id: "facts", label: "Tényszerű bemutató", text: facts },
    { id: "detail", label: "Részletek közelről", text: `${item.title} közelről\n${facts}` },
    { id: "store", label: "Webshop bemutató", text: `${item.store} kínálatából\n${facts}` }];
}
export function tiktokManualTemplate(item: CatalogItem, caption: string) {
  return `TIKTOK · KÉZI FELTÖLTÉSI TERVEZET\nWebshop: ${item.store}\nForrás: ${sourceLabels[item.source] ?? item.source}\nTétel: ${item.title}\nCéloldal: ${item.url ?? "Nincs megadva"}\n\nVIDEÓTERV\n0–3 mp: ${item.title} saját felvételen.\n3–12 mp: A forrásban igazolt részletek bemutatása.\n12–20 mp: ${item.store} és a céloldal bemutatása.\n\nKÉPALÁÍRÁS\n${caption}\n\nFELTÖLTÉS ELŐTT\n[ ] Saját vagy engedéllyel használható videó és hang\n[ ] Ár, ajánlat és céloldal ellenőrizve\n[ ] Pontos kész tartalom ember által átnézve\n[ ] TikTok-fiók és kereskedelmi jelölések ellenőrizve\n\nKÖZZÉTÉTEL UTÁN\nBejegyzés URL-je:\nKözzététel időpontja:\nVégrehajtó:\n\nEz a sablon nem publikál, nem ad jóváhagyást és nem állítja készre a havi poszthelyet.\n`;
}