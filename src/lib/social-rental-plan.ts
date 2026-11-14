export const rentalStages = [
  { title: "Ismerkedés", goal: "A teljes Egyszerű de Nagyszerű üzleti szoftver bemutatása." },
  { title: "Igényfelmérés", goal: "Partnerjelentkezés és a vállalkozás igényeinek egyeztetése." },
  { title: "Szerződés", goal: "Bérlési feltételek egyeztetése és emberi jóváhagyás, majd aláírás." },
  { title: "Partnerindítás", goal: "Hozzáférés és a partner saját rendszerének beállítása." },
];

export const rentalTopics = ["A teljes üzleti szoftver bemutatása", "Milyen vállalkozásnak keresünk partnert?", "Partnerjelentkezés és igényfelmérés", "Szerződéses bérlés folyamata", "A rendszer valódi képernyői", "Partnerindítás és együttműködés", "Kérdések a szoftverbérlésről"];

export function rentalTopic(day: string) {
  const number = Number(day.slice(-2));
  return rentalTopics[(Math.max(1, number) - 1) % rentalTopics.length];
}

const hooks = ["Egy rendszer az egész vállalkozásodra?", "Nem kell mindent külön eszközzel megoldani.", "Ezt nézd meg, ha vállalkozást vezetsz.", "Így működik a szerződéses szoftverbérlés."];
const calls = ["Jelentkezz partnernek!", "Nézd meg, és jelentkezz igényfelmérésre!", "Partnerjelentkezés a linken."];

/** Determinisztikus TikTok-szövegváltozatok; nem talál ki árat, ígéretet vagy szerződési feltételt. */
export function tiktokRentalVariants(topic: string) {
  return hooks.slice(0, 3).map((hook, i) => `${hook}\n${topic} · Egyszerű de Nagyszerű — teljes üzleti szoftver, szerződéses bérléssel.\n${calls[i]}\nhttps://egyszerudenagyszeru.com/social-partner\n#szoftverberles #vallalkozas #egyszerudenagyszeru`);
}

export type PairPost = { day: string; platform: string; status: string };
/** Hétfőtől induló hetek: tervezett/publikált posztok és az azonos héten beérkezett jelentkezések (együttjárás, nem attribúció). */
export function pairWeekly(posts: PairPost[], applications: string[], weekKey: (iso: string) => string) {
  const map = new Map<string, { week: string; planned: number; published: number; facebook: number; tiktok: number; applications: number }>();
  const row = (week: string) => { if (!map.has(week)) map.set(week, { week, planned: 0, published: 0, facebook: 0, tiktok: 0, applications: 0 }); return map.get(week)!; };
  for (const p of posts) { const r = row(weekKey(`${p.day}T12:00:00Z`)); r.planned++; if (p.status === "published") { r.published++; if (p.platform === "facebook") r.facebook++; if (p.platform === "tiktok") r.tiktok++; } }
  for (const created of applications) row(weekKey(created)).applications++;
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export function tiktokRentalTemplate(text: string) {
  return `EGYSZERŰ DE NAGYSZERŰ · SZERZŐDÉSES SZOFTVERBÉRLÉS\nÁllapot: kézi feltöltésre előkészített tervezet; nincs közzétéve.\n\nVIDEÓTERV\n1. A szoftver valódi képernyőinek bemutatása.\n2. A teljes üzleti szoftver szerződéses bérlésének ajánlata.\n3. Partnerjelentkezés és igényfelmérés.\n\nPOSZT SZÖVEGE\n${text}\n\nPARTNERJELENTKEZÉS\nhttps://egyszerudenagyszeru.com/social-partner\n\nELLENŐRZÉS\n[ ] Valódi képernyők; személyes és ügyféladatok kitakarva.\n[ ] A pontos videó és szöveg emberi ellenőrzése megtörtént.\n[ ] Nincs kitalált bérleti díj, ígéret vagy szerződési feltétel.\n[ ] TikTok-fiók és láthatóság ellenőrizve.\n[ ] Kézi feltöltés után a bejegyzés hivatkozása megőrizve.\n\nFELTÖLTÉS\nhttps://www.tiktok.com/tiktokstudio/upload\n`;
}