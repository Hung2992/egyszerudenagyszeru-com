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

export function tiktokRentalTemplate(text: string) {
  return `EGYSZERŰ DE NAGYSZERŰ · SZERZŐDÉSES SZOFTVERBÉRLÉS\nÁllapot: kézi feltöltésre előkészített tervezet; nincs közzétéve.\n\nVIDEÓTERV\n1. A szoftver valódi képernyőinek bemutatása.\n2. A teljes üzleti szoftver szerződéses bérlésének ajánlata.\n3. Partnerjelentkezés és igényfelmérés.\n\nPOSZT SZÖVEGE\n${text}\n\nPARTNERJELENTKEZÉS\nhttps://egyszerudenagyszeru.com/social-partner\n\nELLENŐRZÉS\n[ ] Valódi képernyők; személyes és ügyféladatok kitakarva.\n[ ] A pontos videó és szöveg emberi ellenőrzése megtörtént.\n[ ] Nincs kitalált bérleti díj, ígéret vagy szerződési feltétel.\n[ ] TikTok-fiók és láthatóság ellenőrizve.\n[ ] Kézi feltöltés után a bejegyzés hivatkozása megőrizve.\n\nFELTÖLTÉS\nhttps://www.tiktok.com/tiktokstudio/upload\n`;
}