// Partner OS – determinisztikus üzleti metrika-, egészség- és prioritásmotor.
// FONTOS: ez a modul tisztán számol, nem hív AI-t és nem ér adatbázishoz.
// Ugyanabból a bemenetből mindig ugyanaz az eredmény (unit tesztelhető).

export const PULSE_VERSION = "v1";

export interface PulseOrder {
  total_huf?: number | null;
  partner_payout_huf?: number | null;
  status?: string | null;
  created_at: string;
  customer_email?: string | null;
}

export interface PulseProduct {
  id?: string | null;
  title?: string | null;
  price_huf?: number | null;
  stock_qty?: number | null;
  status?: string | null;
  view_count?: number | null;
  sales_count?: number | null;
}

export interface PulseStorefront {
  store_name?: string | null;
  is_published?: boolean | null;
  custom_domain?: string | null;
  custom_domain_status?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface PulseInput {
  now: string;
  orders: PulseOrder[];
  products: PulseProduct[];
  storefront: PulseStorefront | null;
  customerCount: number;
  shippingMethodCount: number;
  paymentProviderActive: boolean;
}

export type PriorityLevel = "critical" | "high" | "opportunity" | "optimization" | "positive";

export interface Metric {
  key: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  previous: number | null;
  change_pct: number | null;
  comparable: boolean;
  drill_tab: string;
}

export interface HealthDimension {
  key: string;
  label: string;
  score: number;
  reasons: string[];
  tab: string;
}

export interface Priority {
  id: string;
  level: PriorityLevel;
  title: string;
  explanation: string;
  source: string;
  cta_label: string;
  cta_tab: string;
}

export interface BusinessEvent {
  at: string;
  type: string;
  text: string;
}

export interface PulseResult {
  version: string;
  generated_at: string;
  period: { from: string; to: string; days: number };
  metrics: Metric[];
  health: { score: number; previous_score: number | null; dimensions: HealthDimension[] };
  priorities: Priority[];
  events: BusinessEvent[];
  system_status: { key: string; label: string; state: "ok" | "attention" | "error"; note: string; tab: string }[];
  setup: { key: string; label: string; done: boolean; tab: string }[];
  ai_facts: Record<string, unknown>;
}

const DAY = 86_400_000;
const CRITICAL_STOCK = 3;

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const orderRevenue = (o: PulseOrder) => num(o.partner_payout_huf) || num(o.total_huf);

const isCancelled = (o: PulseOrder) =>
  ["cancelled", "canceled", "refunded", "failed"].includes(String(o.status || "").toLowerCase());

const changePct = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export function computeBusinessPulse(input: PulseInput): PulseResult {
  const nowMs = new Date(input.now).getTime();
  const periodDays = 30;
  const fromMs = nowMs - periodDays * DAY;
  const prevFromMs = fromMs - periodDays * DAY;

  const inRange = (o: PulseOrder, a: number, b: number) => {
    const t = new Date(o.created_at).getTime();
    return t >= a && t < b;
  };

  const current = input.orders.filter((o) => inRange(o, fromMs, nowMs + 1));
  const previous = input.orders.filter((o) => inRange(o, prevFromMs, fromMs));

  const validCurrent = current.filter((o) => !isCancelled(o));
  const validPrevious = previous.filter((o) => !isCancelled(o));

  const revenue = validCurrent.reduce((s, o) => s + orderRevenue(o), 0);
  const prevRevenue = validPrevious.reduce((s, o) => s + orderRevenue(o), 0);
  const aov = validCurrent.length ? Math.round(revenue / validCurrent.length) : 0;
  const prevAov = validPrevious.length ? Math.round(prevRevenue / validPrevious.length) : 0;

  const buyers = new Set(validCurrent.map((o) => String(o.customer_email || "")).filter(Boolean));
  const prevBuyers = new Set(validPrevious.map((o) => String(o.customer_email || "")).filter(Boolean));
  const customers = Math.max(buyers.size, 0) || input.customerCount;

  const activeProducts = input.products.filter((p) => String(p.status || "") === "active");
  const views = input.products.reduce((s, p) => s + num(p.view_count), 0);
  const sales = input.products.reduce((s, p) => s + num(p.sales_count), 0);
  const conversion = views > 0 ? Number(((sales / views) * 100).toFixed(2)) : 0;

  const outOfStock = activeProducts.filter((p) => num(p.stock_qty) === 0);
  const criticalStock = activeProducts.filter((p) => num(p.stock_qty) > 0 && num(p.stock_qty) <= CRITICAL_STOCK);
  const criticalCount = outOfStock.length + criticalStock.length;

  const cancelledCount = current.filter(isCancelled).length;
  const pendingOrders = current.filter((o) =>
    ["pending", "new", "processing", "paid"].includes(String(o.status || "").toLowerCase()),
  );

  const metrics: Metric[] = [
    {
      key: "revenue", label: "Bevétel", value: revenue, format: "currency",
      previous: validPrevious.length ? prevRevenue : null,
      change_pct: changePct(revenue, prevRevenue), comparable: prevRevenue > 0, drill_tab: "finance",
    },
    {
      key: "orders", label: "Rendelések", value: validCurrent.length, format: "number",
      previous: validPrevious.length ? validPrevious.length : null,
      change_pct: changePct(validCurrent.length, validPrevious.length),
      comparable: validPrevious.length > 0, drill_tab: "orders",
    },
    {
      key: "customers", label: "Vásárlók", value: customers, format: "number",
      previous: prevBuyers.size || null,
      change_pct: changePct(buyers.size, prevBuyers.size), comparable: prevBuyers.size > 0, drill_tab: "orders",
    },
    {
      key: "conversion", label: "Konverzió", value: conversion, format: "percent",
      previous: null, change_pct: null, comparable: false, drill_tab: "products",
    },
    {
      key: "aov", label: "Átlagos kosár", value: aov, format: "currency",
      previous: prevAov || null, change_pct: changePct(aov, prevAov), comparable: prevAov > 0, drill_tab: "orders",
    },
    {
      key: "critical_stock", label: "Kritikus készlet", value: criticalCount, format: "number",
      previous: null, change_pct: null, comparable: false, drill_tab: "inventory",
    },
  ];

  // ---- Üzleti egészség ----
  const sf = input.storefront;
  const salesReasons: string[] = [];
  let salesScore = 40;
  if (validCurrent.length > 0) { salesScore += 30; salesReasons.push(`${validCurrent.length} érvényes rendelés az elmúlt 30 napban`); }
  else salesReasons.push("Nincs rendelés az elmúlt 30 napban");
  if (prevRevenue > 0 && revenue >= prevRevenue) { salesScore += 20; salesReasons.push("A bevétel nem csökkent az előző időszakhoz képest"); }
  else if (prevRevenue > 0) { salesScore -= 10; salesReasons.push("A bevétel elmarad az előző időszaktól"); }
  if (aov > 0) { salesScore += 10; salesReasons.push(`Átlagos kosárérték: ${aov.toLocaleString("hu-HU")} Ft`); }

  const webReasons: string[] = [];
  let webScore = 10;
  if (sf?.is_published) { webScore += 35; webReasons.push("A webshop publikálva van"); } else webReasons.push("A webshop még nincs publikálva");
  if (sf?.seo_title && sf?.seo_description) { webScore += 20; webReasons.push("SEO cím és leírás kitöltve"); } else webReasons.push("Hiányzó SEO cím vagy leírás");
  if (sf?.custom_domain && String(sf.custom_domain_status || "") === "verified") { webScore += 20; webReasons.push("Saját domain aktív"); }
  else if (sf?.custom_domain) webReasons.push("A saját domain még nincs ellenőrizve");
  else webReasons.push("Nincs saját domain bekötve");
  if (activeProducts.length >= 3) { webScore += 15; webReasons.push(`${activeProducts.length} aktív termék a boltban`); }

  const invReasons: string[] = [];
  let invScore = 100;
  if (outOfStock.length) { invScore -= outOfStock.length * 12; invReasons.push(`${outOfStock.length} termék elfogyott`); }
  if (criticalStock.length) { invScore -= criticalStock.length * 6; invReasons.push(`${criticalStock.length} termék készlete kritikus (≤ ${CRITICAL_STOCK} db)`); }
  if (!activeProducts.length) { invScore = 20; invReasons.length = 0; invReasons.push("Nincs aktív termék"); }
  if (!invReasons.length) invReasons.push("Minden aktív termék készlete rendben");

  const mktReasons: string[] = [];
  let mktScore = 50;
  if (views > 0) { mktScore += 20; mktReasons.push(`${views.toLocaleString("hu-HU")} termékmegtekintés`); } else mktReasons.push("Még nincs mért termékmegtekintés");
  if (conversion >= 2) { mktScore += 25; mktReasons.push(`Konverzió: ${conversion}%`); }
  else if (views > 0) { mktScore -= 10; mktReasons.push(`Alacsony konverzió: ${conversion}%`); }

  const custReasons: string[] = [];
  let custScore = 45;
  if (customers > 0) { custScore += 25; custReasons.push(`${customers} vásárló az időszakban`); } else custReasons.push("Még nincs azonosított vásárló");
  const returning = [...buyers].filter((e) => prevBuyers.has(e)).length;
  if (returning > 0) { custScore += 25; custReasons.push(`${returning} visszatérő vásárló`); }
  else if (buyers.size > 0) custReasons.push("Nincs visszatérő vásárló az előző időszakból");

  const finReasons: string[] = [];
  let finScore = 55;
  if (revenue > 0) { finScore += 25; finReasons.push(`Bevétel: ${revenue.toLocaleString("hu-HU")} Ft`); } else finReasons.push("Nincs bevétel az időszakban");
  if (current.length && cancelledCount / current.length > 0.15) { finScore -= 20; finReasons.push(`Magas lemondási/visszatérítési arány: ${cancelledCount} rendelés`); }
  else if (current.length) { finScore += 15; finReasons.push("Alacsony lemondási arány"); }
  if (input.paymentProviderActive) { finScore += 10; finReasons.push("Aktív fizetési szolgáltatói kapcsolat"); }
  else finReasons.push("Bankkártyás fizetéshez aktív szolgáltatói kapcsolat szükséges");

  const techReasons: string[] = [];
  let techScore = 40;
  if (sf?.is_published) { techScore += 20; techReasons.push("Webshop elérhető"); }
  if (input.shippingMethodCount > 0) { techScore += 20; techReasons.push(`${input.shippingMethodCount} szállítási mód beállítva`); }
  else techReasons.push("Nincs szállítási mód beállítva");
  if (input.paymentProviderActive) { techScore += 20; techReasons.push("Fizetési kapcsolat rendben"); }
  else techReasons.push("Fizetési szolgáltató nincs bekötve");

  const dimensions: HealthDimension[] = [
    { key: "sales", label: "Értékesítés", score: clamp(salesScore), reasons: salesReasons, tab: "orders" },
    { key: "webshop", label: "Webshop", score: clamp(webScore), reasons: webReasons, tab: "storefront" },
    { key: "inventory", label: "Készlet", score: clamp(invScore), reasons: invReasons, tab: "inventory" },
    { key: "marketing", label: "Marketing", score: clamp(mktScore), reasons: mktReasons, tab: "marketing" },
    { key: "customers", label: "Vásárlók", score: clamp(custScore), reasons: custReasons, tab: "orders" },
    { key: "finance", label: "Pénzügy", score: clamp(finScore), reasons: finReasons, tab: "finance" },
    { key: "technical", label: "Technikai állapot", score: clamp(techScore), reasons: techReasons, tab: "shipping" },
  ];

  const score = clamp(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  // ---- Prioritások (deduplikálva, rangsorolva) ----
  const priorities: Priority[] = [];
  if (outOfStock.length) {
    priorities.push({
      id: "stock_out", level: "critical",
      title: `${outOfStock.length} termék elfogyott`,
      explanation: outOfStock.slice(0, 3).map((p) => p.title || "Névtelen termék").join(", "),
      source: "Készlet", cta_label: "Készlet megnyitása", cta_tab: "inventory",
    });
  } else if (criticalStock.length) {
    priorities.push({
      id: "stock_low", level: "critical",
      title: `${criticalStock.length} termék készlete kritikus`,
      explanation: criticalStock.slice(0, 3).map((p) => `${p.title || "Termék"} (${num(p.stock_qty)} db)`).join(", "),
      source: "Készlet", cta_label: "Készlet megnyitása", cta_tab: "inventory",
    });
  }
  if (!input.paymentProviderActive) {
    priorities.push({
      id: "payment_missing", level: "high",
      title: "Bankkártyás fizetés nincs bekötve",
      explanation: "A bankkártyás fizetés használatához aktív szolgáltatói kapcsolat szükséges. Jelenleg utánvét és átutalás érhető el.",
      source: "Fizetés", cta_label: "Fizetés beállítása", cta_tab: "finance",
    });
  }
  if (!sf?.is_published) {
    priorities.push({
      id: "shop_unpublished", level: "high",
      title: "A webshop még nincs publikálva",
      explanation: "Publikálás nélkül a vásárlók nem érik el a boltot.",
      source: "Webshop", cta_label: "Webshop megnyitása", cta_tab: "storefront",
    });
  }
  if (pendingOrders.length) {
    priorities.push({
      id: "orders_pending", level: "high",
      title: `${pendingOrders.length} rendelés vár feldolgozásra`,
      explanation: "Ezek a rendelések még nem kerültek lezárt állapotba.",
      source: "Rendelések", cta_label: "Rendelések megnyitása", cta_tab: "orders",
    });
  }
  if (views > 0 && conversion < 2) {
    priorities.push({
      id: "low_conversion", level: "opportunity",
      title: `A konverzió ${conversion}%`,
      explanation: `${views.toLocaleString("hu-HU")} megtekintésből ${sales} vásárlás lett. A termékoldalak és az árazás optimalizálása növelheti az eredményt.`,
      source: "Termékek", cta_label: "Termékek megnyitása", cta_tab: "products",
    });
  }
  if (!sf?.seo_title || !sf?.seo_description) {
    priorities.push({
      id: "seo_missing", level: "optimization",
      title: "Hiányzó SEO adatok",
      explanation: "A keresőben való megjelenéshez töltsd ki a bolt SEO címét és leírását.",
      source: "Webshop", cta_label: "Webshop megnyitása", cta_tab: "storefront",
    });
  }
  if (!input.shippingMethodCount) {
    priorities.push({
      id: "shipping_missing", level: "high",
      title: "Nincs szállítási mód",
      explanation: "Szállítási mód nélkül a vásárló nem tudja befejezni a rendelést.",
      source: "Szállítás", cta_label: "Szállítás beállítása", cta_tab: "shipping",
    });
  }
  if (revenue > 0 && prevRevenue > 0 && revenue > prevRevenue) {
    priorities.push({
      id: "revenue_up", level: "positive",
      title: `A bevétel nőtt ${changePct(revenue, prevRevenue)}%-kal`,
      explanation: "Az előző 30 naphoz képest javult az eredmény.",
      source: "Pénzügy", cta_label: "Pénzügy megnyitása", cta_tab: "finance",
    });
  }

  const order: PriorityLevel[] = ["critical", "high", "opportunity", "optimization", "positive"];
  priorities.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

  const events: BusinessEvent[] = [...current]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((o) => ({
      at: o.created_at,
      type: "order",
      text: `Rendelés (${String(o.status || "ismeretlen")}) – ${orderRevenue(o).toLocaleString("hu-HU")} Ft`,
    }));

  const system_status = [
    { key: "shop", label: "Webshop", state: (sf?.is_published ? "ok" : "attention") as "ok" | "attention" | "error", note: sf?.is_published ? "Elérhető" : "Nincs publikálva", tab: "storefront" },
    { key: "payment", label: "Fizetés", state: (input.paymentProviderActive ? "ok" : "attention") as "ok" | "attention" | "error", note: input.paymentProviderActive ? "Aktív kapcsolat" : "Aktív szolgáltatói kapcsolat szükséges", tab: "finance" },
    { key: "shipping", label: "Szállítás", state: (input.shippingMethodCount > 0 ? "ok" : "attention") as "ok" | "attention" | "error", note: input.shippingMethodCount > 0 ? `${input.shippingMethodCount} mód` : "Nincs beállítva", tab: "shipping" },
    { key: "products", label: "Termékek", state: (activeProducts.length > 0 ? "ok" : "attention") as "ok" | "attention" | "error", note: `${activeProducts.length} aktív`, tab: "products" },
  ];

  const setup = [
    { key: "shop", label: "Webshop beállítása", done: Boolean(sf), tab: "storefront" },
    { key: "products", label: "Első termék", done: activeProducts.length > 0, tab: "products" },
    { key: "shipping", label: "Szállítás", done: input.shippingMethodCount > 0, tab: "shipping" },
    { key: "payment", label: "Fizetés", done: input.paymentProviderActive, tab: "finance" },
    { key: "publish", label: "Élesítés", done: Boolean(sf?.is_published), tab: "storefront" },
  ];

  return {
    version: PULSE_VERSION,
    generated_at: new Date(nowMs).toISOString(),
    period: { from: new Date(fromMs).toISOString(), to: new Date(nowMs).toISOString(), days: periodDays },
    metrics,
    health: { score, previous_score: null, dimensions },
    priorities,
    events,
    system_status,
    setup,
    ai_facts: {
      bevetel_ft: revenue,
      elozo_idoszak_bevetel_ft: prevRevenue,
      rendelesek: validCurrent.length,
      elozo_idoszak_rendelesek: validPrevious.length,
      vasarlok: customers,
      visszatero_vasarlok: returning,
      atlagos_kosar_ft: aov,
      konverzio_pct: views > 0 ? conversion : null,
      megtekintesek: views,
      aktiv_termekek: activeProducts.length,
      elfogyott_termekek: outOfStock.length,
      kritikus_keszlet: criticalStock.length,
      fuggo_rendelesek: pendingOrders.length,
      lemondott_rendelesek: cancelledCount,
      webshop_publikalt: Boolean(sf?.is_published),
      fizetesi_kapcsolat_aktiv: input.paymentProviderActive,
      szallitasi_modok: input.shippingMethodCount,
      uzleti_egeszseg: score,
    },
  };
}
