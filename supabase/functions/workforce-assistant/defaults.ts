// Alapértelmezett eszközök és rendszeres feladatok területenként — a platform valódi moduljaiból.
// Ha a valódi munkatárs profilja ki van töltve, az felülírja ezeket.
export const deptDefaults: Record<string, { tools: string[]; duties: string[] }> = {
  "01": { tools: ["COMMAND / MISSIONS / CONTROL", "Havi profit panel", "HUMAN GATE"], duties: ["Heti prioritások jóváhagyása", "Piros kockázatú tervek döntése", "Havi eredmény áttekintése"] },
  "02": { tools: ["AI WORKFORCE", "Munka állapot", "Munkatárs-státusz"], duties: ["Tervek ütemezése és felelős kiosztása", "Lejárt határidők követése", "Heti státuszjelentés"] },
  "03": { tools: ["Webshop admin", "Storefront builder", "Verziózás és rollback"], duties: ["Webshop hibák javítása", "Termékoldalak karbantartása", "Kiadás előtti ellenőrzés"] },
  "04": { tools: ["AEGIS", "Security nézet", "Vészleállítás"], duties: ["Admin jogosultságok áttekintése", "AEGIS riasztások kezelése", "Havi biztonsági ellenőrzés"] },
  "05": { tools: ["QA pipeline", "Előnézet telefonon/számítógépen"], duties: ["Pénztár végpontos tesztje", "Új funkciók átvételi tesztje", "Hibalista vezetése"] },
  "06": { tools: ["Rendszerállapot", "Mentések", "Naplók"], duties: ["Napi mentés ellenőrzése", "Elérhetőség figyelése", "Visszaállítási próba"] },
  "07": { tools: ["BI panel", "Oldalmegtekintések", "Rendelési adatok"], duties: ["Heti eladási riport", "Kosárelhagyás elemzése", "KPI-k frissítése"] },
  "08": { tools: ["AI költségkeret", "AI önreflexió", "Tudásbázis"], duties: ["Asszisztens válaszminőség értékelése", "AI költség figyelése", "Tudásbázis jóváhagyása"] },
  "09": { tools: ["Webes kutatás", "SEO felderítés"], duties: ["Versenytárs árak figyelése", "Trendek összegyűjtése", "Új termékötletek"] },
  "10": { tools: ["Kampánytervező", "Kuponok", "Hírlevél", "SEO panel"], duties: ["Heti kampányterv", "Hírlevél előkészítése", "Kampányeredmények mérése"] },
  "11": { tools: ["Partner Center", "Partner CRM", "Ajánlói linkek"], duties: ["Partnerjelöltek felkutatása", "Megkeresések követése", "Új partnerek bevezetése"] },
  "12": { tools: ["Kapcsolati üzenetek", "Visszaküldések", "GYIK"], duties: ["Vásárlói üzenetek megválaszolása", "Visszaküldési kérések előkészítése", "GYIK frissítése"] },
  "13": { tools: ["CONTROL költség/bevétel", "Átutalási linkek", "Kifizetések"], duties: ["Átutalások egyeztetése", "Havi bevétel–költség áttekintés", "Partner-kifizetések előkészítése"] },
  "14": { tools: ["Számlák", "AI-számla rögzítés", "Könyvelői hozzáférés"], duties: ["Számlák egyeztetése", "Hiányzó bizonylatok listája", "Havi zárás előkészítése"] },
  "15": { tools: ["Partnerszerződések", "ÁSZF / adatkezelés"], duties: ["Szerződések felülvizsgálata", "ÁSZF naprakészen tartása", "Adatkezelési kérések"] },
  "16": { tools: ["Partner-onboarding", "AI asszisztensek"], duties: ["Bevezető anyagok", "Felelősségi lista", "Képzési igények"] },
  "17": { tools: ["Beszerzési rendelések", "Automatikus utánrendelés"], duties: ["Árajánlatok bekérése", "Készlet-utánrendelés jóváhagyása", "Beszállítók értékelése"] },
  "18": { tools: ["Szállítási módok", "Késéslista", "Rendelési dátumok"], duties: ["Feladás/átvétel rögzítése", "Késő rendelések követése", "Szállítási költség figyelése"] },
  "19": { tools: ["Termékek", "Készlet"], duties: ["Kollekció gyártási ütemterv", "Minőségi visszajelzések", "Készletszint egyeztetés"] },
  "20": { tools: ["Rendszerterv", "Teljesítménymérés"], duties: ["Betöltési sebesség mérése", "Műszaki felülvizsgálat", "Fejlesztési javaslatok"] },
};
