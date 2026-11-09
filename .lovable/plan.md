# SUPER ADMIN ∞ — ABSOLUTE INTELLIGENCE

## Cél és vállalás

A meglévő Super Admin fölé egységes vállalati irányítóközpont épül, nem újabb modulhalmaz. A meglévő szakfelületek megmaradnak és közvetlenül megnyithatók.

**Mind a négy üzleti célt együtt mérjük:** kevesebb kézi javítás, gyorsabb webshopindítás, alacsonyabb AI-költség és magasabb konverzió. Ezeket nem kezeljük garantált eredményként: előbb valós kiinduló mérés, majd ellenőrizhető változás kell. A további platformmutatók: elsőre sikeres QA és partnermegtartás.

A teljes terv négy szintet fed le. A megvalósítás CORE-ral indul; a következő szintek csak saját ellenőrzési kapujuk után kapnak végrehajtási jogosultságot. Nincs korlátlan autopilot és nincs automatikus pénzügyi vagy jogi döntés.

## Mit mutatott a feltérképezés?

**Kódban bekötött, újrahasznosítható alapok:** admin-szerepkör ellenőrzés, AI Command Center, ügynök- és futástörténet, Agent Bus, partneri munkafolyamatok, akciótervek, jóváhagyások, webshopverziók, visszaállítás és KPI-tesztek.

**Nem bizonyított egységes képesség:** tartós, duplikációbiztos végrehajtás; minden műveletre érvényes jóváhagyási kapu; teljes tenant-izoláció; megváltoztathatatlan audit; összeegyeztetett pénzügyi kimutatás; autonóm eredményellenőrzés.

**Konkrét forráskódbeli javítási pontok:**
- Az ügynökfeladat alapértelmezett „completed / auto_executed” állapota nem bizonyít végrehajtást; a jóváhagyásszámláló hibás mezőt olvas.
- A workflow A/B-kiértékelésből hiányzik a partnerellenőrzés; eseményelosztásnál nem látható megfelelő partnerszűrés. A webhook célcímek védelme hiányos.
- Az Agent Bus kézbesítése best-effort; újrajátszáskor nem bizonyított az ismételt mellékhatások kivédése.
- A kommunikációs queue-ban hiányzik az atomikus foglalás; egy másik workerben nincs lejáró foglalás utáni helyreállítás.
- Jóváhagyás, publikálás és audit több helyen külön írás; rollbacknél állapotalak-eltérés és részleges visszaállítás kockázata látható.
- A bevételt különböző modulok eltérő rendelési állapotokból számolják.

**Ellenőrzési korlát:** a mostani élő adatbázis-lekérdezés elérhetőségi hibával meghiúsult. A lekért biztonsági eredmények között elavult és hiányos vizsgálat is szerepel. Ezért a jelenlegi éles RLS, deploy, ütemezés és biztonsági állapot nem minősíthető ellenőrzöttnek. Az első kapu friss vizsgálat és kontrollált hozzáférési teszt.

## Három fő felület

### COMMAND
Egy magyar parancsmező, vállalati/partneri hatókör, rövid üzleti összefoglaló és ajánlott következő lépés. A válasz külön mutatja a tényeket, becsléseket, tervet és végrehajtható műveleteket. Bizonytalan kérésnél pontosítás; nincs rejtett módosítás.

### MISSIONS
Folyamatban lévő munkák, felelős ügynök, lépések, költség, várakozás oka és eredménybizonyíték. Megállítás, részletek és újraindítás csak az aktuális állapotból engedélyezett. Nem készül mesterségesen „sikeres” feladat vagy kitalált aktivitás.

### CONTROL
Jóváhagyások, előtte–utána eltérés, hatókör, jogosultságok, limitek, audit, hibák és visszaállítás. Globális vészleállító és partnerenkénti szüneteltetés. A részletes meglévő adminmodulok kereshető eszköztárból érhetők el.

Megjelenés: a meglévő fekete–fehér–arany, szögletes arculat és betűtípusok megtartása; három elsődleges navigációs elem, mobilon rendezett váltás, részletek fokozatos kibontása.

## Technikai architektúra

```text
COMMAND / MISSIONS / CONTROL
              |
      Auth + Scope + Policy
              |
 Intelligence Core — Mission Planner
              |
  Domain agents — typed tool registry
              |
    Approval-bound execution queue
              |
 Existing commerce / finance / marketing / security adapters
              |
 Audit + transactional outbox + result verification
              |
     Metrics + reviewed learning
```

React/Vite felület és Lovable Cloud szerveroldali funkciók; nincs új állandó szerver a sandboxban. A közös mag moduláris, a meglévő kereskedelmi adattáblák maradnak az üzleti igazság forrásai. Nem olvasztjuk egyetlen óriástáblába a vállalatot, és nem készítünk második párhuzamos rendelési vagy pénzügyi rendszert.

### Közös adatszerződések

Minden szerződés verziózott és sémaellenőrzött:
- **Business context:** hatókör, forrásazonosítók, adatfrissesség, időablak, pénznem, mért mutatók; hiányzó adat nem nulla.
- **Mission:** cél, létrehozó, partner/tenant vagy kifejezett platformhatókör, lépésfüggőségek, állapot, idő- és költségkeret, correlation ID.
- **Action proposal:** engedélyezett művelettípus, célrekordok, előtte/utána, várható verzió, kockázat, validáció, visszaállíthatóság, változatlenyomat.
- **Approval:** a konkrét tervlenyomathoz kötött döntés, jóváhagyó, hatókör és lejárat. Módosított tervre új jóváhagyás kell.
- **Execution receipt:** foglalás, idempotenciakulcs, próbálkozások, eredmény, hibakód, külső visszaigazolás és ellenőrzési bizonyíték.
- **Audit event:** szerver által rögzített szereplő, cél, döntés, policy-verzió, időpont, előtte/utána, eredmény és rollbackhivatkozás; hozzáférési token és titok nélkül.

### Adatbázis és API

Elsőként a meglévő `ai_agents`, `ai_agent_tasks`, `ai_agent_runs`, `partner_workflows`, `partner_workflow_runs`, akcióterv-, audit-, verzió- és KPI-szerződésekhez készül kompatibilitási térkép. A partner és tenant kapcsolatát explicit módon kell igazolni; nem következtetünk a névből.

Csak a hiányzó garanciákhoz kerülnek új `public` táblák: mission/step kapcsolat, policy és képesség-hozzárendelés, verzióhoz kötött approval, lejáró execution lease, tartós outbox/delivery és szerverírású audit. A pontos bővítés élő sémavizsgálat után készül; minden új tábla GRANT → RLS → policy védelemmel, nyilvános olvasás nélkül.

Tervezett szerveroldali belépési pontok: context read, mission propose/read/cancel, plan approve/reject, worker claim/execute/verify, rollback preview/commit és control pause/resume. A böngésző csak hitelesített `functions.invoke` hívásokat indít; a workernek külön belső jogosultsága van. Nincs tetszőleges SQL, kódvégrehajtás vagy szabadon megadott webhook-cél.

Adatbázison belüli módosításnál jogosultság, jóváhagyás, verzióellenőrzés, írás, audit és outbox egy tranzakcióba kerül. Külső küldésnél ez nem lehetséges: tartós lépésállapot, szolgáltatói idempotencia és visszaigazolás kell. Bizonytalan eredményt nem ismétlünk vakon és nem állítunk általános „exactly once” garanciát.

### Nyolc ügynök, egy közös kontrollréteg

| Szerep | Első feladat | Korlát |
|---|---|---|
| CEO | Összesített stratégia és prioritás | Nem adhat magának jogosultságot |
| COO | Folyamatok és beragadt feladatok | Csak regisztrált műveletek |
| CFO | Fizetett bevétel, refund, settlement eltérései | Pénzügyi döntés emberi kontroll |
| CTO | Rendszerállapot és ellenőrzési eredmények | Nincs önálló éles kódtelepítés |
| CISO | Jogosultsági és biztonsági eltérések | Nem oldhat fel saját tiltást |
| CMO | Kampányterv és célcsoport | Külső publikálás/küldés kapuval |
| CRO | Konverziós veszteségpontok | Árváltozás nem automatikus |
| CHRO | Feladatfelelős és kapacitás | Csak létező csapatadat; nincs kitalált teljesítmény |

Az AI csak tervez és regisztrált eszközt kérhet; a policy-motor és az executor determinisztikus. Új hívások a Lovable AI Gateway SDK-val, a munkaterület elérhetőségének ellenőrzésével készülnek. Feladatkiosztás képesség, költségkeret és adatkezelési szabály alapján; tiltást modellváltással nem kerülünk meg.

### Biztonság és hibabiztos végrehajtás

- Szerveroldali szerepkör és képességellenőrzés minden belépési ponton; a belső worker nem helyettesíti az emberi jóváhagyást.
- Partnerszűrés minden service-jogú lekérdezésben; két külön partnerrel pozitív és negatív teszt.
- Állapotlánc: tervezés → jóváhagyásra vár → sorban → fut → ellenőrzés → igazolt siker / hiba / részleges / bizonytalan. A visszaállítás külön ellenőrzött folyamat.
- Kis korlátos batch, lejáró adatbázis-lease, deduplikáció, timeout, próbálkozás- és láncmélység-korlát, késleltetés, dead-letter queue.
- Kredit-/policy-tiltás és provider-denial leállítja a háttérmunkát; nem végtelen retry.
- Snapshot a módosítás előtt; verzióütközésnél megállás. Rollback nem töröl véglegesen, és maga is visszavonható; külső visszafordíthatatlan hatás külön jelölve.
- Tanulás csak felülvizsgált változatokkal; partnerközi memória kizárólag engedélyezett, anonimizált aggregátum.

## Konkrét fejlesztési sorrend és kapuk

### 1. CORE — egységesítés és bizonyítás
1. Élő séma/deploy/role/policy inventár, friss security scan és a feltárt magas kockázatú útvonalak javítása.
2. Közös hatókör, pénzügyi és KPI-definíciók, adapterek és capability registry.
3. COMMAND / MISSIONS / CONTROL váz a jelenlegi adminban; csak valós adatok, hibánál világos állapot.
4. Első teljes vertikális folyamat: egy meglévő webshop SEO-leírásának javaslata, pontos diff, adminjóváhagyás, verzióellenőrzött mentés, audit, visszaolvasás, rollback. Nincs automatikus publikálás.
**Kapu:** jogosulatlan hívás elutasítva; párhuzamos végrehajtás nem dupláz; audit nélkül nincs commit; verzióütközés és rollback-drift biztonságosan megáll.

### 2. INTELLIGENCE — közös értelmezés
Összesített context, nyolc szerep, forráshivatkozásos brief, strukturált missionterv, költségmérés. A hiányzó adatok és becslések külön jelennek meg.
**Kapu:** valós adatokból reprodukálható számok; szabálytalan AI-output elutasítva; tenant-szivárgás nincs; minden futásnak valós eredménye vagy látható hibája van.

### 3. AUTONOMY — korlátozott végrehajtás
Szimuláció és dry-run, tartós queue, jóváhagyásos eszközök, eredményellenőrzés és kompenzáció. Kezdetben automatikus elemzés; üzleti módosítás csak explicit engedéllyel. Pénzügyi, jogi, külső publikálási és visszafordíthatatlan művelet külön emberi kaput kap.
**Kapu:** crash/retry/replay/stop tesztek; bizonytalan külső eredmény kezelése; rollback bizonyíték; költségkorlát valóban megállítja a munkát.

### 4. EVOLUTION — mérés és kontrollált javulás
Verziózott szabályok, felülvizsgált memória, megfelelő mintájú A/B vizsgálat, várható és tényleges eredmény összevetése. Előrejelzés csak adatminőséggel és bizonytalansággal együtt; nem garantált hozam.
**Kapu:** a hat platform-KPI visszaolvasható; nincs igazolatlan „uplift”; javulás hiányában leállítható vagy visszaállítható változás.

## Ellenőrzés és lezárás

Minden szint: automatikus fordításellenőrzés → célzott teszt → valós ellenőrzés → javítás → újrateszt. Unit: szabályok, pénzügyi értékek, állapotváltások. Integration: RLS, API, konkurens foglalás, idempotencia, audit és rollback. E2E: valódi adminnal parancs → terv → jóváhagyás → írás → visszaolvasás → rollback; mobil 390×844 és desktop 1280×1800.

Ez a terv nem igazolja a teljes autonóm rendszer meglétét, banki teljesítést vagy külső kézbesítést. A következő megvalósítás a CORE-szakasz; élő adatbázis-elérés és friss biztonsági bizonyíték nélkül éles íróvégrehajtás nem engedélyezhető.
