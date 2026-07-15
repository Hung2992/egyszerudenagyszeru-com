// Sprint B.5.1 — Stylist → Try-On → Cart funnel session tracking
// Egyetlen localStorage kulcs, amit a Stylist beállít és a Checkout felhasznál + kioltó.
const KEY = "edn-active-stylist-session";

export const setActiveStylistSession = (id: string | null | undefined) => {
  try {
    if (id) localStorage.setItem(KEY, id);
  } catch { /* ignore */ }
};

export const getActiveStylistSession = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const clearActiveStylistSession = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
