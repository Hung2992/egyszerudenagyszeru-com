# Partner Webshop Studio — 1. fázis

A mostani webshop-szerkesztő (fülek: alapok, szekciók, SEO, domain) helyére egy összefüggő Studio kerül,
ahol a partner nem mezőket tölt ki, hanem elmondja milyen üzletet akar, és a rendszer felépíti a boltot.

A blueprint teljes egésze több fázis. Ez a fázis a gerincet építi meg: stratégia → márka-DNS → struktúra →
tartalom → valós termékek → előnézet → QA → publikálás → verzió/visszaállítás. A jövőbeli fázisok
(A/B teszt, autonóm optimalizálás, több nyelv/pénznem, mega menu, merchandising motor) az itt lefektetett
adatszerkezetre épülnek, de most nem készülnek el.

## Mit fog látni a partner

**Egy képernyő, két oldal.** Bal oldalon a vezérlés, jobb oldalon az élő, kattintható webshop-előnézet
(mobil / tablet / desktop váltóval).

Bal oldal felülről lefelé:
1. **Állapotsáv** — Élő / Vázlat / Publikálási probléma, és a bolt minőségi pontszáma (0–100).
2. **AI parancsmező** — „Legyen a hero látványosabb”, „Tedd a bestsellereket a hero után”,
   „Adj hozzá egy prémium bemutatkozó szekciót”. A parancs a kijelölt szekció kontextusában értelmeződik.
3. **Szekciófa** — a főoldal felépítése listaként; kattintásra a előnézet odagördül, fogd-és-vidd
   sorrendezés, szekciónként be-/kikapcsolás, AI-újraírás, törlés.
4. **Beállítások panel** — a kijelölt szekció mezői, valamint márka, színek, tipográfia, SEO, domain
   (a mai szerkesztő tartalma ide költözik, nem vész el semmi).

Minden nagyobb AI-módosítás előtt előbb-utóbb összehasonlítás jelenik meg: mi volt, mi lesz, és
egy mondatos magyarázat, hogy miért. A partner fogadja el vagy dobja el.

**Publikálás kapuval.** Publikálás előtt lefut az ellenőrzés (design, mobil, tartalom, linkek, SEO,
akadálymentesség, kereskedelem). Piros hiba esetén a publikálás blokkolva van, és a hibára kattintva
a Studio a hibás szekcióra ugrik. Minden publikálás verzió lesz, egy kattintással visszaállítható.

**Üres bolt.** Termék nélkül nem hibás oldal jön létre, hanem: „A webshopod szerkezete elkészült.
Adj hozzá termékeket.” Az AI soha nem talál ki terméket, árat, készletet, vásárlói véleményt.

## Technikai terv

**Adatbázis** (egy migráció, meglévő táblák bővítése, RLS + GRANT a meglévő minta szerint):
- `partner_storefronts`: `brand_dna jsonb`, `section_layout jsonb`, `studio_strategy jsonb`,
  `last_quality_report jsonb`, `studio_state text` (draft/ready/published/failed).
- `partner_storefront_versions`: már létezik — a snapshot kiterjed az új mezőkre is.

**Edge function** — a meglévő `partner-site-builder` átalakul több lépcsős láncra
(`mode`: `strategy` | `build` | `section` | `command` | `qa`):
- *strategy*: a partner leírásából márka-pozicionálás, célközönség, vizuális irány, oldalstruktúra-javaslat.
- *build*: teljes főoldal-szerkezet + szövegek + SEO, kizárólag a partner valós termékeiből/kategóriáiból.
- *section*: egyetlen szekció újratervezése a márka-DNS alapján.
- *command*: természetes nyelvű parancs lefordítása konkrét szerkezeti/token-módosításra.
- *qa*: pontozás hét területen, hibalistával, mindegyikhez a javítás helyére mutató hivatkozással.
Modell: `openai/gpt-6-astra` a Responses API-n, streameléssel; a partner jogosultsága szerveroldalon
ellenőrizve, az AI csak a saját partner szűkített adatait kapja.

**Frontend** — új `src/components/partner/studio/` mappa:
`WebshopStudio.tsx` (váz, split nézet), `StudioSectionTree.tsx`, `StudioInspector.tsx`,
`StudioCommandBar.tsx`, `StudioQualityPanel.tsx`, `StudioPublishDialog.tsx`, `StudioDiffDialog.tsx`.
A `StorefrontEditorTab` beépül inspector-panelként, a `StorefrontLivePreview` marad az előnézet motorja
(postMessage-alapú azonnali frissítéssel).

**Megjelenítő oldal** — `BrandStorefront.tsx` a fix szekciósorrend helyett a `section_layout` alapján
renderel (ismeretlen típus kihagyva, hibás szekció nem dönti le az oldalt).

**Deep link** — `/partner?tab=storefront&section=hero` a Partner OS javaslataiból közvetlenül
a megfelelő szekcióra nyit.

**Ellenőrzés zárás előtt**: typecheck, meglévő tesztek, új egységtesztek a szekció-normalizálásra és a
QA-pontozásra, valamint valódi Playwright-futás a partnerportálon és egy publikált bolton
mobil (390×844) és desktop (1280×1800) méretben.

## Amit ez a fázis nem tartalmaz

Mega menu, merchandising motor, A/B teszt, autonóm optimalizálás, több nyelv/pénznem,
vizuális regressziós képösszehasonlítás, oldalanként külön page builder (most a főoldal szerkeszthető,
a többi oldal a design systemet örökli).
