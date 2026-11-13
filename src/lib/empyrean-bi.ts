// EMPYREAN BUSINESS INTELLIGENCE — egységes pénzügyi definíciók (egyetlen igazságforrás).
export type PeriodMetrics = {
  orders?: number; booked?: number; paid?: number; paid_orders?: number;
  fee?: number; shipping?: number; awaiting_transfer?: number;
  shipping_paid?: number; to_ship?: number; in_transit?: number; delivered?: number; returns?: number; avg_delivery_days?: number | null;
  refunded?: number; refund_count?: number;
};
export type BusinessSnapshot = {
  window_days: number; generated_at: string;
  current: PeriodMetrics; previous: PeriodMetrics;
  top_partners: { partner_id: string; name: string; orders: number; booked: number }[];
  active_partners: number; published_storefronts: number; active_products: number;
  low_stock_products: number; pending_review_products: number; open_returns?: number;
};
/** Nettó befolyt bevétel: befolyt − visszatérített (soha nem negatív a megjelenítésben). */
export function netPaid(p: PeriodMetrics): number {
  return Math.max(0, n(p.paid) - n(p.refunded));
}

export const METRIC_DEFINITIONS = {
  booked: "Foglalt bevétel: nem sztornózott partnerrendelések bruttó végösszege (szállítással).",
  paid: "Befolyt bevétel: kifizetettnek jelölt (paid_at vagy payment_status=paid), nem sztornózott rendelések.",
  net: "Nettó befolyt: befolyt bevétel − jóváhagyott és visszatérített visszaküldések.",
  fee: "Platform díj: a befolyt rendeléseken rögzített platform részesedés.",
  aov: "Átlagos kosárérték: foglalt bevétel / nem sztornózott rendelések száma.",
  collection: "Beszedési arány: befolyt bevétel / foglalt bevétel.",
} as const;

const n = (v: number | undefined) => (Number.isFinite(v) ? Number(v) : 0);

export function aov(p: PeriodMetrics): number | null {
  return n(p.orders) > 0 ? Math.round(n(p.booked) / n(p.orders)) : null;
}
export function collectionRate(p: PeriodMetrics): number | null {
  return n(p.booked) > 0 ? n(p.paid) / n(p.booked) : null;
}
/** Változás az előző időszakhoz; null, ha nincs összehasonlítási alap (nem találunk ki számot). */
export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}
export const huf = (v: number | null) => (v === null ? "—" : `${Math.round(v).toLocaleString("hu-HU")} Ft`);
export const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export const SEO_ISSUE_LABELS: Record<string, string> = {
  title_short: "Rövid cím (<20)", title_long: "Hosszú cím (>70)", description_short: "Rövid leírás (<120)",
  category_missing: "Nincs kategória", tags_missing: "Nincs címke", image_missing: "Nincs kép",
};

/** FORECAST: lineáris run-rate vetítés a következő `horizonDays` napra. Nulla adatnál null (nem találunk ki számot). */
export function runRateForecast(value: number, windowDays: number, horizonDays: number): number | null {
  if (!(windowDays > 0) || !(value > 0)) return null;
  return Math.round((value / windowDays) * horizonDays);
}
