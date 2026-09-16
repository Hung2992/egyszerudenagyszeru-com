// Kampány → vásárlás összekapcsolása. A kampányra kattintást 24 órán át jegyezzük,
// és sikeres rendelésnél ehhez a kampányhoz számoljuk a konverziót és a bevételt.
const KEY = "apex_campaign_attr";
const TTL_MS = 24 * 60 * 60 * 1000;

interface Attr { planId: string; at: number }

export const setCampaignAttribution = (planId: string) => {
  try { localStorage.setItem(KEY, JSON.stringify({ planId, at: Date.now() } satisfies Attr)); } catch { /* ignore */ }
};

export const getCampaignAttribution = (now = Date.now()): string | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attr;
    if (!a?.planId || typeof a.at !== "number") return null;
    if (now - a.at > TTL_MS) return null;
    return a.planId;
  } catch { return null; }
};

export const clearCampaignAttribution = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
