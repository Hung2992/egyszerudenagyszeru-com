## Terv: Partner Webshop SEO + Domain + Verziókezelés + Jóváhagyás + Élő Előnézet

Nagy, többrészes feladat. Az alábbi modulokat építem meg egy menetben, a meglévő `partner_storefronts`, `BrandStorefront.tsx`, `StorefrontEditorTab.tsx` és a super admin felület köré.

### 1. SEO a partner webshophoz
- `BrandStorefront.tsx`: `react-helmet-async` használatával dinamikus `<title>`, `<meta description>`, `canonical`, `og:title/description/image/url`, `twitter:card`, JSON-LD (`Store` + `Product` lista).
- Automatikus fallback: ha a partner nem ad meg `meta_title`-t → `{display_name} – {tagline}`; description → `tagline` vagy első 160 karakter `about_html`-ből.
- `main.tsx`: `HelmetProvider` hozzáadása (ha még nincs).
- Termékaloldal (`BrandProductDetail.tsx`) → `Product` JSON-LD (ár, kép, név, leírás).

### 2. Sitemap
- `scripts/generate-sitemap.ts` kibővítése: lekérdezi az összes `is_published=true` partner storefrontot és a hozzájuk tartozó aktív termékeket, és minden partner aldomainjéhez generál egy bejegyzést.
- Két stratégia:
  - **fő sitemap** (`public/sitemap.xml`): a fő domain útvonalai + `/b/{slug}` partner aloldalak.
  - **partner sitemap endpoint**: új edge function `partner-sitemap` → `https://{slug}.egyszerudenagyszeru.com/sitemap.xml` → dinamikusan generálja az adott partner összes termékét. (Az aldomain ugyanazt az SPA-t szolgálja ki, de a `/sitemap.xml` útvonalat React Router elkapja és átirányítja a függvényre.)
- `robots.txt` kiegészítése `Sitemap:` direktívával.

### 3. Partner domain kérelmek
Új tábla: `partner_domain_requests`
- mezők: `partner_id`, `requested_domain` (pl. `myshop.com`), `status` (`pending`/`approved`/`rejected`/`verifying`/`active`), `verification_token`, `dns_instructions` (jsonb), `admin_note`, `reviewed_by`, `reviewed_at`.
- RLS: partner csak a sajátját látja/írja `pending`-ben; super admin mindent.
- Új mező a `partner_storefronts`-ban: `custom_domain` (text, unique), `custom_domain_status`.
- Partner UI: `StorefrontEditorTab` új "Domain" tabja → kérés beadása, státusz látszik, DNS utasítások (A record 185.158.133.1 + TXT `_lovable_partner`).
- Super admin jóváhagyás után az `approved` triggerre a `partner_storefronts.custom_domain` mező automatikusan beíródik trigger-rel.
- `getPartnerSlugFromHostname` kibővítése: ha a hostname egy egyezik egy aktív `custom_domain`-nel, akkor a hozzá tartozó slug-ot adja vissza (kliens oldalon külön lekérdezés).

### 4. Verziókezelés a StorefrontEditorhez
Új tábla: `partner_storefront_versions`
- mezők: `storefront_id`, `version_number` (auto incr per storefront), `snapshot` (jsonb teljes storefront másolat), `created_by`, `change_summary`, `is_published_version` (bool), `approved_by`, `approved_at`.
- Trigger: minden `partner_storefronts` UPDATE előtt készít egy snapshot-ot (csak ha érdemi változás van), max 50 verzió tartása partnerenként.
- Partner UI: új "Előzmények" tab → lista verziókkal, dátum, "Visszaállítás" gomb (publikálás előtti `draft`-ot felülírja a választott snapshot-tal).
- Diff nézet egyszerű: melyik mező változott.

### 5. Super admin jóváhagyási oldal
Új komponens: `src/components/admin/PartnerApprovalsPanel.tsx`
Új route + super admin panel tab: **"Partner Jóváhagyások"**
Három al-tab:
- **Storefront publikáció kérések** (`partner_storefronts` ahol `publish_requested_at IS NOT NULL` és `is_published=false` vagy van változás)
- **Domain kérések** (`partner_domain_requests` ahol `status='pending'`)
- **Termék jóváhagyások** (a meglévő `partner_products` jóváhagyási logika, ha létezik)

Minden tételhez:
- diff/snapshot megjelenítése (mi változott a legutóbbi jóváhagyott verzióhoz képest)
- "Jóváhagyás" gomb → `is_published=true`, új jóváhagyott verzió mentése
- "Elutasítás" gomb → `admin_note` szöveges indoklással
- E-mail értesítés a partnernek (meglévő `send-transactional-email` használata)

### 6. Valós idejű élő előnézet mód
Két szint:
- **Local Live Preview**: az `StorefrontEditorTab` mellett egy bal/jobb split — jobb oldalt `<iframe>` ami a `BrandStorefront`-ot renderel egy `?preview=1&token=<draft-token>` paraméterrel. A draft állapotot a partner szerkesztője `postMessage`-szel élőben tolja az iframe-be, így pillanatok alatt látja a változást.
- **Shareable Preview Link**: gomb "Élő előnézet külön ablakban" → `https://{slug}.egyszerudenagyszeru.com/?preview=<one-time-token>` → 1 órás token, csak a partner és super admin tudja megnyitni (`partner_storefront_preview_tokens` táblából validál). A `BrandStorefront` ekkor a `draft_snapshot` mezőből renderel, nem a publikált adatokból.

A `partner_storefronts` tábla `draft_snapshot` (jsonb) mezőt kap → minden mentésnél ide kerül a "publikálás alatt álló" másolat; a publikus oldal a fő mezőket olvassa, az előnézet a `draft_snapshot`-ot.

---

### Technikai részletek

**Új/módosított SQL migráció (1 darab):**
1. `partner_domain_requests` tábla + RLS + GRANT + trigger
2. `partner_storefront_versions` tábla + RLS + GRANT
3. `partner_storefront_preview_tokens` tábla + RLS + GRANT  
4. `partner_storefronts` új oszlopok: `custom_domain`, `custom_domain_status`, `draft_snapshot`, `publish_requested_at`
5. Trigger: `partner_storefronts` UPDATE → snapshot insert `partner_storefront_versions`-be
6. Trigger: `partner_domain_requests` UPDATE status=`approved` → `partner_storefronts.custom_domain` beíródik
7. Function: `prune_old_storefront_versions()` — verziónként top 50

**Új edge functions:**
- `partner-sitemap` — dinamikus sitemap per aldomain
- `request-partner-domain-verification` — DNS TXT ellenőrzés
- `approve-partner-storefront` — super admin → status + e-mail

**Új/módosított fájlok (~15 db):**
- `src/pages/BrandStorefront.tsx` (Helmet + preview mód + draft snapshot olvasás)
- `src/pages/BrandProductDetail.tsx` (Helmet + Product JSON-LD)
- `src/components/partner/StorefrontEditorTab.tsx` (Domain tab, Előzmények tab, élő előnézet split)
- `src/components/partner/StorefrontLivePreview.tsx` (új — iframe + postMessage)
- `src/components/partner/StorefrontVersionsTab.tsx` (új)
- `src/components/partner/PartnerDomainTab.tsx` (új)
- `src/components/admin/PartnerApprovalsPanel.tsx` (új)
- `src/lib/partner-subdomain.ts` (custom_domain lookup)
- `scripts/generate-sitemap.ts`
- `src/main.tsx` (HelmetProvider, ha hiányzik)
- `index.html` / `public/robots.txt`
- `src/App.tsx` (route a super admin jóváhagyásnak)
- `package.json` (`react-helmet-async` ha nincs)

### Becsült méret
~1 nagy migráció, 3 edge function, ~12-15 fájl, kb. 25-35 perc.

### Amit NEM csinálok automatikusan
- Nem konfigurálok valódi DNS-t a partner domainjére — csak az utasításokat adom meg és ellenőrzöm a TXT rekordot (Lovable-szintű SSL kiállítás külön kérdés, ott a partnernek a Lovable docs-ot ajánljuk).
- Nem írom át a meglévő super admin oldalt teljesen — új tabként/panelként illesztem be ahova logikus.

Megerősíted? Vagy szűkítsem valamelyik részt?