/** Havi eredmény: nettó befolyt bevétel (HUF) − AI-költség pénzben. Csak HUF kreditárnál számolható; különben null (nem váltunk át kitalált árfolyammal). */
export function monthlyProfit(netPaidHuf: number, aiCost: number | null | undefined, currency: string | null | undefined): number | null {
  if (aiCost == null || currency !== "HUF") return null;
  return Math.round(netPaidHuf - aiCost);
}
