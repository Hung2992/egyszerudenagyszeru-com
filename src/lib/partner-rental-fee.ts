// Partner bérleti díj számítása a szerződésben rögzített sávos díjszabás alapján.
// 0–1 000 000 Ft: 5%
// 1 000 000–5 000 000 Ft: 10 000 Ft
// 5 000 000 Ft felett: 50 000 Ft + minden további megkezdett 1 000 000 Ft után 10 000 Ft

const TIERS = [
  { limit: 1_000_000, type: "percent", value: 0.05 },
  { limit: 5_000_000, type: "flat", value: 10_000 },
  { limit: Infinity, type: "flat-plus", value: 50_000, step: 10_000, stepEvery: 1_000_000 },
] as const;

export function calculatePartnerRentalFee(revenueHuf: number): number {
  const r = Math.max(0, revenueHuf || 0);
  if (r === 0) return 0;
  if (r < TIERS[0].limit) return Math.round(r * TIERS[0].value);
  if (r < TIERS[1].limit) return TIERS[1].value;
  const above5M = Math.max(0, r - TIERS[1].limit);
  const extraSteps = Math.floor(above5M / TIERS[2].stepEvery);
  return TIERS[2].value + extraSteps * TIERS[2].step;
}

export function describePartnerRentalFee(revenueHuf: number): string {
  const fee = calculatePartnerRentalFee(revenueHuf);
  if (revenueHuf < 1_000_000) return `A bevétel 5%-a = ${fee.toLocaleString("hu-HU")} Ft`;
  if (revenueHuf < 5_000_000) return `Fix 10 000 Ft`;
  return `${fee.toLocaleString("hu-HU")} Ft (50 000 Ft + további szintek)`;
}

export function formatHuf(n: number): string {
  return `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;
}
