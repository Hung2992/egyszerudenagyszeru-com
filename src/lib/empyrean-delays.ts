/** Késés: tényleges napok − vállalt napok; arány = tényleges / vállalt. Vállalt idő nélkül nincs késésszámítás. */
export function delay(actualDays: number, promisedDays: number | null): { extra: number; ratio: number | null; late: boolean } | null {
  if (promisedDays == null) return null;
  const extra = Math.round((actualDays - promisedDays) * 10) / 10;
  return { extra, ratio: promisedDays > 0 ? Math.round((actualDays / promisedDays) * 100) / 100 : null, late: extra > 0 };
}
