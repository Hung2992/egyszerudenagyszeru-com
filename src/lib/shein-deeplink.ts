// Shein 1-kattintásos rendelés-előkészítő
// A Shein nem ad nyilvános rendelési API-t, ezért deep linket generálunk:
// 1) ha van supplier_url → közvetlen termék link
// 2) különben → keresési link (név + szín + méret)

export interface SheinDeepLinkInput {
  productName: string;
  size?: string | null;
  color?: string | null;
  supplierUrl?: string | null;
  quantity?: number;
}

export interface ShippingAddress {
  name?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
}

const SHEIN_BASE = "https://m.shein.com";
const SHEIN_SEARCH = `${SHEIN_BASE}/hu/pdsearch`;

export function buildSheinDeepLink(input: SheinDeepLinkInput): string {
  if (input.supplierUrl && /shein\./i.test(input.supplierUrl)) {
    return input.supplierUrl;
  }
  const parts = [input.productName, input.color, input.size].filter(Boolean).join(" ");
  const q = encodeURIComponent(parts);
  return `${SHEIN_SEARCH}/${q}.html`;
}

export function buildClipboardPayload(
  input: SheinDeepLinkInput,
  addr: ShippingAddress
): string {
  const lines = [
    `🛒 SHEIN BESZERZÉS – ${input.productName}`,
    input.color ? `Szín: ${input.color}` : null,
    input.size ? `Méret: ${input.size}` : null,
    `Mennyiség: ${input.quantity ?? 1} db`,
    "",
    "📦 SZÁLLÍTÁSI CÍM:",
    addr.name || "Egyszerű de Nagyszerű",
    addr.phone || "",
    `${addr.zip || ""} ${addr.city || ""}`.trim(),
    addr.street || "",
    addr.country || "Magyarország",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
