// Partneri részesedés számítása a szerződésben rögzített részesedési modell alapján.
// 0–1 000 000 Ft bevételig: 5% részesedés
// 1 000 000 Ft felett: minden további megkezdett 1 000 000 Ft bevétel után 10 000 Ft részesedés

export function calculatePartnerRentalFee(revenueHuf: number): number {
  const r = Math.max(0, revenueHuf || 0);
  if (r === 0) return 0;
  if (r <= 1_000_000) return Math.round(r * 0.05);
  const extraMillions = Math.ceil((r - 1_000_000) / 1_000_000);
  return extraMillions * 10_000;
}

export function describePartnerRentalFee(revenueHuf: number): string {
  const fee = calculatePartnerRentalFee(revenueHuf);
  if (revenueHuf <= 1_000_000) return `A bevétel 5%-a = ${fee.toLocaleString("hu-HU")} Ft`;
  const extraMillions = Math.ceil((revenueHuf - 1_000_000) / 1_000_000);
  return `${fee.toLocaleString("hu-HU")} Ft (${extraMillions} × 10 000 Ft)`;
}

export function formatHuf(n: number): string {
  return `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;
}
