## Cél

Minden aktív partner kap egy saját, testreszabható mini-webshopot a te platformodon belül, saját URL slug-gal, saját brandeléssel, saját termékekkel és saját rendelés-teljesítéssel.

## URL struktúra

```text
egyszerudenagyszeru.com/b/{partner-slug}          → partner storefront főoldal
egyszerudenagyszeru.com/b/{partner-slug}/termek/{id}  → termék oldal
egyszerudenagyszeru.com/b/{partner-slug}/kosar    → kosár (partner specifikus)
egyszerudenagyszeru.com/b/{partner-slug}/checkout → checkout (rendelés a partnerhez megy)
/partner/storefront                                 → partner admin: brand szerkesztő, termék feltöltő, rendelései
```

## 1. Adatbázis migráció

**Új táblák** (mind RLS + GRANT):

- `partner_storefronts` — egy-az-egyhez `partners`-szal
  - `partner_id`, `slug` (unique, kötelező), `display_name`, `tagline`, `about_html`
  - **Branding**: `logo_url`, `banner_url`, `primary_color`, `accent_color`, `bg_color`, `text_color`, `font_heading`, `font_body`
  - **Hero**: `hero_title`, `hero_subtitle`, `hero_cta_text`, `hero_image_url`
  - **Social**: `instagram_url`, `tiktok_url`, `facebook_url`, `youtube_url`
  - **SEO**: `meta_title`, `meta_description`, `og_image_url`
  - `is_published` (csak ha admin jóváhagyta), `published_at`, `theme_preset`

- `partner_products` — partner saját termékei (külön a `shop_products`-tól)
  - `partner_id`, `slug`, `title`, `description`, `price_huf`, `compare_price_huf`
  - `images` (jsonb array), `category`, `tags` (text[])
  - `stock_qty`, `sku`, `weight_g`
  - `status` (`draft | pending_review | active | paused | rejected`), `rejection_reason`
  - `view_count`, `sales_count`

- `partner_product_variants` — méret/szín
  - `product_id`, `size`, `color`, `stock_qty`, `price_override_huf`, `sku`

- `partner_orders` — partner storefront-on leadott rendelések
  - `partner_id`, `order_number` (egyedi: `P-{partner_slug}-{seq}`)
  - `customer_email`, `customer_name`, `customer_phone`
  - `shipping_address` (jsonb), `billing_address` (jsonb)
  - `items` (jsonb: product_id, title, qty, price, variant)
  - `subtotal_huf`, `shipping_huf`, `total_huf`
  - `platform_fee_huf` (a te jutalékod, pl. 10%), `partner_payout_huf`
  - `status` (`pending | paid | fulfilled | shipped | delivered | cancelled | refunded`)
  - `payment_method`, `payment_status`, `stripe_payment_intent`
  - `tracking_number`, `carrier`, `shipped_at`, `delivered_at`

- `partner_storefront_settings` — partner-szintű webshop beállítások
  - `partner_id`, `shipping_zones` (jsonb), `shipping_rates` (jsonb)
  - `accept_cod` (utánvét), `accept_card`, `min_order_huf`
  - `return_policy`, `shipping_policy` (saját szöveg)
  - `bank_account_for_payouts`, `vat_number`

**Triggerek**:
- `partner_orders` insert → automatikusan kiszámolja `platform_fee_huf` (default 10%, `store_settings.partner_platform_fee_pct`-ból), `partner_payout_huf`
- `partner_products` insert/update → ha `status = pending_review`, admin notification
- Slug egyediség ellenőrzése

**RLS**:
- Partner csak saját `partner_storefronts`, `partner_products`, `partner_orders`-t lát/módosít
- `anon` + `authenticated` `SELECT` a publikus `partner_storefronts` (csak `is_published = true`) + `partner_products` (csak `status = active`)
- Admin mindent

## 2. Edge funkciók

- `partner-storefront-publish` — partner kéri publikálást → admin jóváhagy
- `partner-product-submit-review` — termék beküldése jóváhagyásra
- `partner-checkout-create` — Stripe checkout session a partner storefront kosárhoz, `metadata.partner_id` + `metadata.partner_order_id`
- `partner-payout-calculate` — havi elszámolás: összes `delivered` rendelés `partner_payout_huf` összege

## 3. Storage bucketok

- `partner-storefront-media` (publikus) — logók, bannerek, hero képek
- `partner-product-images` (publikus) — termékfotók

## 4. Partner admin felület (`/partner` portál bővítése)

Új tabok a `PartnerLayout`-ban:

- **Storefront tab** (`StorefrontEditorTab.tsx`)
  - Slug szerkesztő (egyediség check)
  - Brand szerkesztő: logo/banner upload, color picker (primary/accent/bg/text), font választó (3 preset)
  - Hero szerkesztő: cím, alcím, CTA, hero kép
  - About szöveg, social linkek
  - SEO mezők
  - "Élő előnézet" iframe `/b/{slug}?preview=true`
  - "Publikálás kérése" gomb

- **Termékek tab** (`PartnerProductsTab.tsx`)
  - Új termék form: cím, leírás, ár, fotók (multi-upload), kategória, méret/szín variációk, készlet
  - Termék lista státusz badge-ekkel
  - Szerkesztés / törlés / pause
  - "Jóváhagyásra küldés" gomb

- **Rendelések tab** (`PartnerOrdersTab.tsx`)
  - Beérkezett rendelések táblázat
  - Részletek modal: vevő adatok, címek, tételek
  - Státusz váltó: paid → fulfilled → shipped (tracking szám input) → delivered
  - PDF szállítólevél/számla generálás

- **Beállítások tab** (`PartnerStorefrontSettingsTab.tsx`)
  - Szállítási zónák és díjak
  - Fizetési módok (kártya/utánvét)
  - Visszaküldési szabályzat saját szövege
  - Banki adatok kifizetéshez

## 5. Publikus storefront (`/b/{slug}`)

Új útvonalak `App.tsx`-ben:

- `/b/:slug` → `BrandStorefront.tsx` (hero + termék rács, partner brand alkalmazva CSS változókon keresztül)
- `/b/:slug/termek/:productSlug` → `BrandProductDetail.tsx`
- `/b/:slug/kosar` → `BrandCart.tsx`
- `/b/:slug/checkout` → `BrandCheckout.tsx`
- `/b/:slug/rendeles/:orderNumber` → `BrandOrderConfirmation.tsx`

Új layout: `BrandStorefrontLayout.tsx` — partner saját nav, footer, brand színek inline CSS változókkal injektálva (`--brand-primary`, `--brand-accent` stb.), nincs te navbar/footer.

Külön cart context: `BrandCartContext.tsx` (localStorage kulcs partner slug-gal namespacelve, hogy ne keveredjen a fő webshop kosárral).

## 6. Admin felület (`AdminPartnerStorefrontsTab.tsx`)

- Publikálásra váró storefrontok jóváhagyása
- Jóváhagyásra váró termékek (preview + approve/reject indoklással)
- Beérkezett rendelések globális nézete (partner szerint szűrhető)
- Platform fee % beállítás (`store_settings`-be új mező)
- Storefront kényszerített szuspenzió szabálysértés esetén

## 7. Jutalékmodell

A platform fee a partner minden rendelése után automatikusan számolódik:

```text
total_huf = subtotal + shipping
platform_fee = total * (store_settings.partner_platform_fee_pct / 100)  -- default 10%
partner_payout = total - platform_fee
```

A meglévő kupon-alapú jutalék rendszer (`partner_referrals`) megmarad: ha valaki a te fő webshopodon vásárol egy partner kuponjával, az továbbra is fix Ft jutalékot ad. A storefront rendelések ettől függetlenül kerülnek elszámolásra.

## 8. Biztonság / jogi

- Partner csak akkor kapja meg a storefront funkciót, ha:
  - `partners.status = 'active'`
  - KYC `approved`
  - Szerződés `signed` (mindkét aláírás megvan)
- Új jogi oldal: `/jogi/partner-storefront-szabalyzat` — partner felelőssége a saját termékeiért, fogyasztóvédelem, NAV
- Storefront termékre kötelező: méret/anyag/származási hely megadás form-validációval

## 9. Mit NEM csinálok most

- Egyedi domain partnerenként (csak `/b/{slug}` aldomain helyett)
- Stripe Connect (most a fizetés hozzád érkezik, te utalod a `partner_payout_huf`-ot manuálisan a havi kifizetésben)
- Több nyelv partnerenként
- Részletes analytics dashboard (csak alap KPI most)
- Egyedi email sablonok partnerenként (most a default sablonok mennek a partner nevével)

## Megerősítés

Ez egy 2-3 körös, nagy ívű feature. Az első körben megépítem a DB schemát + storage bucketokat + storefront editor tabot + publikus storefront alap nézetét. A termék upload + checkout + admin jóváhagyás külön körben jön. Megerősítés után indul.