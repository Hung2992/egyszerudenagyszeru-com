// EMPYREAN BUSINESS INTELLIGENCE — egységes pénzügyi definíciók (egyetlen igazságforrás).
export type PeriodMetrics = {
  orders?: number; booked?: number; paid?: number; paid_orders?: number;
  fee?: number; shipping?: number; awaiting_transfer?: number;
};
export type BusinessSnapshot = {
  window_days: number; generated_at: string;
  current: PeriodMetrics; previous: PeriodMetrics;
  top_partners: { partner_id: string; name: string; orders: number; booked: number }[];
  active_partners: number; published_storefronts: number; active_products: number;
  low_stock_products: number; pending_review_products: number;
};

export const METRIC_DEFINITIONS = {
  booked: "Foglalt bevétel: nem sztornózott partnerrendelések bruttó végösszege (szállítással).",
  paid: "Befolyt bevétel: kifizetettnek jelölt (paid_at vagy payment_status=paid), nem sztornózott rendelések.",
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
