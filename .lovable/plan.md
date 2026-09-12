# Partner OS — 1. fázis: Vezérlőközpont és rendezett navigáció

A teljes blueprint (100 fejezet) több hónapnyi munka. Ez a terv az első, önmagában is működő fázist írja le: a partner belépéskor ne 27 menüpontot lásson, hanem egy üzleti vezérlőközpontot, ami megmondja, mit kell most tenni. A meglévő funkciók egyike sem vész el, csak logikus csoportokba kerülnek.

## Mit fog látni a partner

**1. Belépés után: Áttekintés**
- Köszöntés és napszak szerinti üdvözlés.
- 6 fő szám: bevétel, rendelések, vásárlók, konverzió, átlagos kosár, kritikus készlet.
- Üzleti egészség pontszám (0–100) hét területre bontva: értékesítés, webshop, készlet, marketing, vásárlók, pénzügy, technikai állapot.
- „Mai üzleti jelentés": pozitívum, probléma, lehetőség, figyelmeztetés, mai prioritás.
- Mai prioritáslista színkóddal: kritikus / magas / lehetőség / optimalizálás / pozitív. Minden tétel egy gombbal a megfelelő felületre visz.

**2. Rendezett főnavigáció (27 fül helyett 10 csoport)**
Áttekintés · Értékesítés · Vásárlók · Termékek · Webshop · Marketing · Pénzügy · Operáció · AI · Rendszer.
Minden mai funkció bekerül valamelyik csoportba, semmi nem tűnik el. Mobilon alsó sáv: Főoldal, Rendelések, AI, Webshop, Több.

**3. Parancsmező felül**
A meglévő „Mit szeretnél elintézni?" mező a felület tetejére kerül állandó elemként, és a válaszból a megfelelő csoportra ugrik.

## Amit ez a fázis NEM tartalmaz
Előrejelzés, what-if szimuláció, AI ügynök-orchestrator, automatizálási könyvtár, hangvezérlés, API központ, jogosultsági szerepkörök. Ezek a következő fázisok, mert saját adatmodellt és háttérmunkát igényelnek. A bankkártyás fizetés továbbra is aktív szolgáltatói kapcsolatra vár.

## Technikai részletek
- Új `supabase/functions/partner-business-pulse`: egy hívásban összeállítja a KPI-kat, az egészség-pontszámot és a prioritáslistát a partner saját adataiból (`partner_orders`, `partner_products`, `partner_storefronts`, `storefront_customers`, `partner_shipping_methods`), majd az AI-tól kéri a napi jelentés szöveges részét (`openai/gpt-6-astra`, Responses API, streamelve). A metrikák számítása determinisztikus kódban történik, az AI csak értelmez — így nem találhat ki számokat.
- Minden lekérdezés `partner_id` + `user_id` ellenőrzéssel, tenant isolation változatlan; RLS marad a forrás.
- Új komponensek: `ExecutiveCockpit.tsx`, `BusinessHealthScore.tsx`, `DailyBriefing.tsx`, `PriorityList.tsx` a `src/components/partner/` alatt.
- `PartnerPortal.tsx` átalakítás: a jelenlegi lapos `TabsTrigger` lista helyett csoportos navigáció (desktop: felső csoportsáv + alcsoport, mobil: alsó sáv + „Több" lap). A `TabsContent` blokkok és a hozzájuk tartozó komponensek változatlanok maradnak, csak új helyen érhetők el; a mélylinkek (`?tab=...`) továbbra is működnek.
- Új tábla nem kell ehhez a fázishoz.
- Ellenőrzés: typecheck, meglévő 40 teszt újrafuttatása, majd Playwright a valódi partner portálon mobil (390×844) és asztali (1280×1800) nézetben, képernyőképekkel.
