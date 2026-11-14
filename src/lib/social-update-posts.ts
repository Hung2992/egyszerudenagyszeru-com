export type UpdateNote = { title: string; details: string; kind: "uj" | "javitas" | "frissites"; date: string };
const LINK = "https://egyszerudenagyszeru.com/social-partner";
const LABEL = { uj: "Új funkció", javitas: "Javítás", frissites: "Frissítés" } as const;
const lines = (d: string) => d.split("\n").map(l => l.trim()).filter(Boolean);
/** Platformonkénti posztszöveg egy szoftverfrissítésről. Csak a megadott tényeket használja. */
export function updatePosts(n: UpdateNote): Record<"facebook" | "tiktok" | "linkedin", string> {
  const title = n.title.trim(); const items = lines(n.details); const tag = LABEL[n.kind];
  return {
    facebook: [`${tag} az Egyszerű de Nagyszerű szoftverben: ${title}`, "", ...items.map(i => `✔ ${i}`), "", `Frissítve: ${n.date}. A teljes üzleti szoftvert szerződéses bérléssel adjuk vállalkozásoknak – minden frissítést automatikusan megkapnak a partnerek.`, "", `Jelentkezz partnernek: ${LINK}`, "", "#vállalkozás #szoftver #webshop #frissítés"].join("\n"),
    tiktok: [`${tag}: ${title} 👇`, ...items.slice(0, 3), "Bérelhető teljes üzleti szoftver.", `Jelentkezz: ${LINK.replace("https://", "")}`, "#szoftver #vállalkozás #újdonság"].join("\n"),
    linkedin: [`${tag}: ${title}`, "", ...items.map(i => `• ${i}`), "", `Az Egyszerű de Nagyszerű teljes üzleti szoftverét szerződéses bérléssel kínáljuk; a frissítések (${n.date}) minden partnernél elérhetők.`, "", `Partnerjelentkezés: ${LINK}`].join("\n"),
  };
}
type Slot = { id: string; day: string; platform: string; queue_id: string | null };
/** Platformonként a legkorábbi szabad, holnaptól induló poszthely. */
export function nextFreeSlots(slots: Slot[], today: string): Partial<Record<string, Slot>> {
  const out: Partial<Record<string, Slot>> = {};
  for (const s of [...slots].sort((a, b) => a.day.localeCompare(b.day))) if (!s.queue_id && s.day > today && !out[s.platform]) out[s.platform] = s;
  return out;
}
