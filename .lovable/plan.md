## Cél

Minden partner kap egy **saját, teljes webshop-oldalt** ami az `egyszerudenagyszeru.com` főoldalának (Index) felépítését tükrözi (felső akciósáv → hero → kiemelt szekciók → termékek → bemutatkozás → footer), DE:

- a tartalmat csak a **saját partner** szerkesztheti a PartnerPortal-ban,
- kizárólag a partner saját aldomainjén (`partnernev.egyszerudenagyszeru.com`) jelenik meg,
- a super admin webshop (főoldal) változatlan marad — nem kerül oda partner termék.

## Mit építünk

### 1. Adatbázis: `partner_storefronts` tábla bővítése
Új oszlopok a teljes Index-szerű élményhez (a super admin `store_settings` 273 oszlopa közül csak a *megjelenítéshez* szükséges ~25-öt másoljuk, hogy ne legyen kezelhetetlen):

```text
topbar_enabled, topbar_text, topbar_icon
hero_layout (split|center|fullscreen)
hero_badge_text, hero_badge_enabled
hero_overlay_opacity
section1_enabled, section1_title, section1_subtitle, section1_image_url, section1_cta_text, section1_cta_url
section2_enabled, section2_title, section2_subtitle, section2_image_url, section2_cta_text, section2_cta_url
featured_products_enabled, featured_products_title, featured_product_ids (jsonb)
newsletter_enabled, newsletter_title, newsletter_subtitle
testimonials_enabled, testimonials (jsonb)
footer_text, footer_links (jsonb)
```
+ RLS: csak a `partner_id`-hoz tartozó partner user szerkesztheti (UPDATE), publikált sor mindenki számára SELECT.

### 2. Frontend: `BrandStorefront.tsx` újraírás
A jelenlegi egyszerű oldal helyett az `Index.tsx` szerkezetét másoló elrendezés:

```text
┌────────────────────────────────────────┐
│  Topbar (akciósáv – ha enabled)        │
├────────────────────────────────────────┤
│  Navbar (logo + cart + ...)            │
├────────────────────────────────────────┤
│  HERO (badge, cím, alcím, CTA, kép)    │
├────────────────────────────────────────┤
│  Szekció 1 (kép + szöveg + CTA)        │
├────────────────────────────────────────┤
│  Szekció 2 (kép + szöveg + CTA)        │
├────────────────────────────────────────┤
│  Kiemelt termékek (4-8 db)             │
├────────────────────────────────────────┤
│  Összes termék rács                    │
├────────────────────────────────────────┤
│  Vélemények (testimonials)             │
├────────────────────────────────────────┤
│  Rólunk (about_html)                   │
├────────────────────────────────────────┤
│  Newsletter feliratkozás               │
├────────────────────────────────────────┤
│  Footer (saját szöveg + linkek)        │
└────────────────────────────────────────┘
```

Színeket, betűtípust, képet a partner saját mezőiből veszi (`bg_color`, `accent_color`, `font_heading` stb.). Minden szekció elrejthető a partner saját `*_enabled` kapcsolójával.

### 3. PartnerPortal szerkesztő bővítése
A jelenlegi `StorefrontEditorTab.tsx`-be új tab-os szekciók (super-admin-szerű elrendezés, csak ezt a partnerét):

- **Alapadatok** (slug, név, mottó) — már megvan
- **Megjelenés** (téma, színek, fontok, logo, banner) — már megvan
- **Topbar** ÚJ
- **Hero** ÚJ — több layout-tal
- **Szekciók** ÚJ — 2 db szabadon szerkeszthető
- **Kiemelt termékek** ÚJ — termékek közül választható
- **Vélemények** ÚJ — name/text/rating tömb
- **Newsletter** ÚJ
- **Footer** ÚJ
- **Közösségi** + **SEO** — már megvan

A super admin **nem** látja/nem szerkeszti, csak a publish kérést hagyja jóvá.

### 4. Routing — biztosítjuk hogy a subdomainen NE a fő Index jelenjen meg
`src/App.tsx`-ben (már részben kész) a `/` route:

```ts
partnerSubdomainSlug ? <BrandStorefront /> : <Index />
```

Megerősítjük + checkout, kosár, termékoldal is a partner saját termékeit kezelje a subdomainen (`partner_products` tábla), ne a `shop_products`-t.

## Műszaki részletek

- **Migráció**: 1 db `ALTER TABLE partner_storefronts ADD COLUMN ...` (~25 új oszlop), defaultokkal hogy a meglévő partnerek ne törjenek.
- **RLS**: meglévő policy-k elegendőek (partner_id-szűrt UPDATE, is_published=true SELECT mindenkinek).
- **Termékek**: a meglévő `partner_products` táblát használjuk — már létezik.
- **Kosár**: a partner subdomain saját kosarat tart (`localStorage` partner_id kulcs alá), nem keveredik a fő shop kosarával.
- **Edit jog**: új RLS check — `is_published`-et csak super admin tudja `true`-ra állítani (a partner csak `publish_requested_at`-ot tud beírni). Ez már a jelenlegi mentési logikában van.

## Mit NEM csinálunk most (külön kérésre)

- Nem másoljuk a 45+ admin tabot (loyalty, AI marketing, dynamic pricing, ERP sync stb.) — a partner sokkal egyszerűbb felületet kap.
- Nem külön Stripe account a partnernek (a fizetés most a fő platformon keresztül megy).
- Nem külön domain-vásárlás partnernek — aldomain `egyszerudenagyszeru.com` alatt.

## Becsült munka
~6-8 fájl módosul/jön létre, 1 migráció. Kb. 15-20 perc futás.

**Indítsam?**