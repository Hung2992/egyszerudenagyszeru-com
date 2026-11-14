# AI MARKETING COMMAND OS — egységes megvalósítási terv

## Cél és hatókör

A hét feltöltött marketingterv egyetlen fejlesztési programba összevonva: üzleti cél → munkaterv → szerepkörhöz rendelt feladat → tartalom és videó → ellenőrzés → emberi jóváhagyás → publikálás → érdeklődő → igazolt üzleti eredmény → következő javaslat.

Nem újabb különálló marketingrendszert építünk. A meglévő Social AI központ, Marketing Studio, AI-munkatársak, HUMAN GATE, Agent Bus, költségpanel és AEGIS összekapcsolása a cél. A 100+ szerepkör hosszú távú szervezeti cél, nem 100 folyamatosan futó vagy már működő AI állítása.

**A terv jóváhagyása nem engedélyez publikálást, üzenetküldést, profilváltoztatást vagy pénzköltést.** Ezek külön, pontos műveletre szóló jóváhagyást igényelnek. Első megvalósítási kör: az 1. szakasz biztonsági alapjai; további szakasz csak az előző ellenőrzési kapuja után.

## Jelenlegi alapok és feltárt hiányok

Az alábbi megállapítások a most átolvasott forráskódból származnak; szolgáltatói hozzáférést, élő adatbázissémát és tényleges külső publikálást ebben a tervezési körben nem igazoltunk.

| Terület | Meglévő alap | Hiány / ellenőrizendő |
|---|---|---|
| Központ | Social AI oldal, meglévő stúdiók, közös publikálási sor, elemzések | Még nem teljes kampányirányító; legfeljebb 100 sorból képzett számlálók, percenkénti frissítés |
| Munkatársak | Saját szerepkörhöz kötött munkák, lépések, határidők és átadások | Marketing-specialisták tartós identitása, eszközjogai, feladatfüggőségei még igazolandók |
| Platformok | Facebook, Instagram és TikTok publikálási kód; LinkedIn stúdió | A közös publisher és mérés nem tartalmaz LinkedIn-ágat; a stúdió nem bizonyít publikálási képességet |
| Jóváhagyás | A sorban jóváhagyási mezők, meglévő HUMAN GATE és AEGIS | Az átolvasott publisher nem ellenőrzi a jóváhagyást és az AEGIS-stopot minden külső hívás előtt |
| Végrehajtás | Újrapróbálás és eseménynapló | Nincs igazolt atomikus feladatfoglalás; a „publikálás most” út nem szűr függő állapotra, és kikerüli az ütemezett út platformkapuját |
| Bizonyíték | Külső azonosítók és publikálási események | TikTok indítási azonosító már „publikálva” állapotot eredményezhet, befejezett publikálás igazolása nélkül |
| Mérés | Meta-metrikák gyűjtése, TikTok státuszlekérés | Hiányzó mérőszámok nullává válnak; TikTok státusz nem bizonyít megtekintést vagy bevételt |
| Költség | Token- és költségsegéd, havi keret | Szolgáltatói költség híján becslést használ; keretlekérdezési hiba esetén továbbenged; teljes hívásszintű lefedettség ellenőrzendő |

**Elsőbbség:** a jelenlegi külső végrehajtás biztonságát bizonyítani, nem több automatikát indítani.

## Egyszerű felület: COMMAND / MISSIONS / CONTROL

- **COMMAND:** üzleti cél, célközönség, ajánlat, időszak, kijelölt KPI; valós állapot és következő javaslat. Ismeretlen adat külön jelölve.
- **MISSIONS:** kampányok, munkatársak, tartalmak, platformváltozatok, lépések, függőségek, felelősök és határidők egy helyen. A részletek megnyithatók; telefonon egymás alatti áttekintés.
- **CONTROL:** pontos tartalomra szóló jóváhagyások, AEGIS-események, hibák, költségek, végrehajtási bizonyítékok, szüneteltetés és helyreállítás.

A jelenlegi saját munkatársoldalak, Munka állapot és HUMAN GATE megmaradnak, ugyanazokat a munkákat mutatják. Jóváhagyás vagy készlépés frissíti az összes nézetet; nézetfrissítés nem hoz létre új naplóbejegyzést.

## Fokozatos megvalósítás és ellenőrzési kapuk

### 1. AEGIS és publikálási lánc stabilizálása

- Élő séma, jogosultságok, ütemezések, szolgáltatói kapcsolatok és minden külső végrehajtási út felmérése.
- Közös szerveroldali kapu a kézi, ütemezett és újrapróbált műveletekre: identitás → jogosultság → partner → szabály → kockázat → érvényes jóváhagyás → stopállapot → végrehajtás.
- Jóváhagyás a pontos szöveghez, médiához, platformhoz, fiókhoz és célverzióhoz kötve. Módosítás vagy lejárat új jóváhagyást kér; AI nem jóváhagyója saját külső műveletének.
- Atomikus sorfoglalás, idempotens végrehajtás, kötelező tartós audit, szolgáltatói befejezés-visszaellenőrzés. Bizonytalan külső eredménynél nincs vak újraküldés.
- Valós Budapest-időzóna használata; a meglévő idő- és darabkorlátok ellenőrzése mindegyik útvonalon.

**Kész, ha:** lejárt/módosított jóváhagyás, rossz partner vagy szerep, párhuzamos indítás és aktív stop mellett nincs külső hívás; minden siker bizonyítékkal olvasható vissza. Párhuzamos próbánál csak egy végrehajtás történik.

### 2. Közös kampány és munkaterv

- Az AI CMO strukturált javaslatot készít: cél, források, célcsoport, KPI, felelős, ellenőr, lépések, határidők, függőségek és költségbecslés.
- A meglévő kampányrekordot a workforce-tervhez és tartalomsorhoz kapcsoljuk; nincs második, párhuzamos kampány-adatforrás.
- Első csapat: Marketing, Projektmenedzsment, Adat/analitika, IT és AEGIS; specialisták csak konkrét munka és szükséges eszköz alapján aktiválhatók.
- Hiányzó ajánlatot, árat, célközönséget vagy bizonyítékot kérdésként/blokkolóként kezelünk, nem találjuk ki.

**Kész, ha:** egy célból pontosan egy jóváhagyásra váró terv keletkezik; ugyanazok a lépések és határidők jelennek meg a kampányban, munkatársoldalon, HUMAN GATE-en és Munka állapotban.

### 3. Tartalom- és videógyár összekapcsolása

- Meglévő stúdiók használata: kutatás → üzenet → hook → szöveg/forgatókönyv → jelenetek → média → hang/felirat → platformváltozat → QA.
- Minden változat saját céllal, platformmal, CTA-val, fájlokkal, verzióval és jóváhagyási állapottal rendelkezik.
- Tényállítások forrása, márkaszabályok, személyes adatok és titkok ellenőrzése. QA-eredmény bizonyíték, nem önmagában publikálási engedély.
- Új tartalomverzió nem írja felül a korábban jóváhagyott példányt.

**Kész, ha:** egy kampányból három külön ellenőrizhető Facebook/TikTok/LinkedIn tervezet jön létre; ezek még nem kerülnek ki automatikusan.

### 4. Platformonként bizonyított végrehajtás

- Képességmátrix platform és fiók szerint: tervezet, média, publikálás, státusz, mérés, komment, üzenet, profilváltoztatás.
- Előbb Facebook teljes lánc, utána a TikTok ténylegesen elérhető engedélyei, majd LinkedIn. Az Instagram meglévő működését megőrizzük.
- Builder saját fiókja és partnerenkénti fiókok elkülönítése; partneradatokhoz nem használunk közös tulajdonosi kapcsolatot.
- Nem támogatott művelethez kézi átadás és visszaigazolás; nincs működést színlelő automatikus gomb.

**Kész, ha:** kijelölt tesztfiókon, külön jóváhagyással a tervezet → publikálás → szolgáltatói visszaolvasás → audit egyezik; a sikertelen vagy nem támogatott művelet egyértelműen látszik. A korábbi TikTok-engedélyhiány aktuális állapota külön ellenőrizendő.

### 5. Közös beérkező ügyek és leadek

- Csak igazolt API/webhook-képességekből gyűjtünk kommentet, üzenetet és érdeklődést.
- Kategorizálás, forráshivatkozás, ismétlődő események kiszűrése, választervezet és emberi átadás a meglévő CRM-be.
- Panasz, jogi/pénzügyi kérdés, személyes adat vagy bizonytalan válasz emberi kapura kerül. Confidence érték nem helyettesíti a jogosultságot.

**Kész, ha:** ugyanaz a beérkező esemény nem készít kétszer leadet vagy választ; címzett és partner szerint helyes a hozzáférés; kezdetben minden válasz csak tervezet.

### 6. Bevételmérés, kísérletek és ellenőrzött tanulás

- Tartalom → kampány → lead → konverzió → igazolt fizetett rendelés kapcsolat; refund és tesztrendelés elkülönítése.
- Reach, retention, lead, bevétel és ROI csak elérhető, időbélyeges forrásból. Hiányzó adat „nem mérhető”, nem nulla.
- A/B kísérlet előre rögzített hipotézissel, célmetrikával és kiértékeléssel; elégtelen mintán nincs győztes állítás.
- Bizonyított eredményekből forrással ellátott marketingmemória és következő tervjavaslat. A tanulás nem módosíthat jogosultságot, keretet vagy jóváhagyási szabályt.

**Kész, ha:** kampányeredmény visszakövethető a hiteles forrásig; ismeretlen attribúció nem válik bevétellé; optimalizálási javaslat külön jóváhagyásra vár.

## Kötelező biztonsági szabályok

A hét új terv AEGIS-részei, BLACK CROWN 1./16., WORKFORCE OS XV., OMEGA III./IV. és „A legfelső szint” 19. alapján:

- Elemzés és tervezet korlátozottan automatikus; publikálás, külső kommunikáció és üzleti profilmódosítás jóváhagyásos; költés, jogi/pénzügyi és visszafordíthatatlan döntés emberi kontroll.
- Minimális eszköz- és adatjog; partner- és címzettelválasztás; beérkező szöveg és közös memória nem végrehajtási utasítás.
- Szerveroldali globális/platform/kampány/agent stop; PAUSE, REVOKE, ISOLATE, KILL és GLOBAL STOP hatása tényleges végrehajtás előtt ellenőrizendő. Újraindítás külön emberi döntés.
- Stop megakadályozza az új külső hívást, de már elküldött szolgáltatói műveletet nem állítunk visszavonhatónak; azt egyeztetni kell.
- Automatikus agent-izoláció csak ismételt igazolt kimeneti szivárgásnál; támadó által kiváltható bemeneti jel vagy költségcsúcs nem kapcsolhatja le a munkatársat.
- Audit nem törölhető; titkok és teljes kártyaadatok nem kerülhetnek tartalomba vagy naplóba. Visszaállítás előtt pillanatkép és változásütközés-ellenőrzés; külső publikálásnál csak a platform által támogatott korrekció ígérhető.

## Technikai illesztés

- Meglévő források: `SocialAiCenter`, `MarketingStudioRouter`, `workforce_plans`, `workforce_plan_steps`, meglévő marketingkampányok, `social_publish_queue`, `social_publish_events`, `social_post_metrics`, Agent Bus és `empyrean_*` governance.
- Közös típusos szerződések: kampánykapcsolat, munkatárs-identitás, tartalomverzió, approval, execution receipt és metrikaforrás. Új mező/tábla csak élő sémavizsgálat után, valódi hiányra, explicit GRANT és RLS mellett.
- A kritikus állapotváltás és audit egy tranzakció; tartós, idempotens eseménykézbesítés. A jelenlegi best-effort Agent Bus küldés önmagában nem végrehajtási garancia.
- Platformadapter egységes bemenet/kimenettel, ellenőrzött szolgáltatói hibákkal és képességjelzéssel; titkok csak szerveroldalon.
- AI-hívások meglévő Gateway-útvonalon; hívásazonosító, munkatárs, modell, token, idő és költség forrása követhető. Számlázott költség, tokenbecslés és kézi számla külön kategória; hiányzó valós kreditár nem találgatható.
- Költség- és stopellenőrzés párhuzamos futás mellett is érvényes; hibás ellenőrzésnél érzékeny/fizetős végrehajtás nem enged tovább.

## Mérhető üzleti érték és átadás

A hat meglévő platform-KPI-hoz kötjük a fejlesztést: time-to-live, első körös QA, kézi javítás aránya, AI-költség/projekt, conversion uplift, partnermegtartás. Az 1–3. szakasz a biztonságot, javítási arányt és időt; a 4–6. a költséget és bizonyított konverziót javítsa. Új mérés előtt alapértéket rögzítünk, célértéket nem találunk ki.

Első pilot: egy valódi kampány, szűk munkatárscsapat, kijelölt tesztfiók és külön publikálási engedély. Minden szakaszhoz szabálytesztek, hitelesített folyamatpróba és telefonos/asztali ellenőrzés tartozik.

Átadáskor külön lista: **működik és bizonyított / csak tervezet / nem ellenőrzött / külső feltételre vár**. Most kizárólag a terv készült el; működési változás és külső művelet nem történt.