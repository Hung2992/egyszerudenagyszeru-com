## Terv: Partner storefront biztonság, audit, diff, sitemap cache és SEO mezők

### 1. Élő előnézet megosztó linkek (tokenek)
- `partner_storefront_preview_tokens` bővítés: `expires_at` (alapból +24h), `max_uses`, `use_count`, `last_accessed_at`, `last_accessed_ip`, `last_accessed_user_agent`, `revoked_at`.
- Új tábla: `partner_storefront_preview_access_log` (token_id, accessed_at, ip, user_agent, viewer_user_id nullable).
- Új edge function: `partner-preview-access` — validálja a tokent (nem lejárt, nem visszavont, use_count < max_uses), logol, növeli a számlálót.
- `BrandStorefront.tsx`: `?preview=<token>` esetén előbb meghívja az edge functiont; ha visszadob 403/410, hibaüzenet.
- Partner UI (`StorefrontLivePreview.tsx`): tokenek listája, lejárat választás (1ó/24ó/7nap), visszavonás gomb, hozzáférés-statisztika (mikor, milyen IP, hány nyitás).
- Admin UI (új szekció a `PartnerApprovalsPanel`-be vagy a storefront drawer-be): minden token + access log megjelenítése.

### 2. Custom domain DNS bizonyíték és ellenőrzött állapot
- `partner_domain_requests` bővítés: `dns_proof_url` (storage path), `dns_check_status` ('not_checked' | 'self_reported' | 'verified' | 'failed'), `dns_checked_at`, `dns_check_result` (jsonb: TXT érték, A rekordok).
- Új edge function: `verify-partner-domain-dns` — `Deno.resolveDns(domain, "TXT")` és `"A"`, összehasonlítás a `verification_token`-nel és IP-vel, eredmény mentése.
- Partner UI (`PartnerDomainTab.tsx`): "Ellenőrzés futtatása" gomb (meghívja az edge functiont), "Bizonyíték feltöltése" (storage `partner-domain-proofs` bucket — screenshot a DNS panelről), állapot választó ("Beállítottam" / "Várok a propagálásra").
- Storage bucket: `partner-domain-proofs` (privát, csak partner + admin).
- Admin UI: a jóváhagyás gomb csak akkor aktív, ha `dns_check_status='verified'`. Manuális override switch (`force_approve` checkbox + indoklás).

### 3. Részletes audit napló partner változtatásokhoz
- Új tábla: `partner_storefront_audit_log` (storefront_id, partner_id, actor_user_id, actor_role, action ['update'|'publish_request'|'publish_approved'|'publish_rejected'|'restore_version'|'domain_request'|'domain_approved'|'token_created'|'token_revoked'], changed_fields jsonb, before_snapshot jsonb, after_snapshot jsonb, ip, user_agent, note).
- Trigger: `partner_storefronts` UPDATE — kiszámolja a változott mezőket (csak amik tényleg változtak), beszúrja a log-ba.
- Trigger: `partner_domain_requests` INSERT/UPDATE.
- Új komponens: `PartnerStorefrontAuditLogTab.tsx` (partner és admin nézet, szűrés akció/dátum szerint).

### 4. Verzió-diff a jóváhagyás előtt
- Új komponens: `StorefrontVersionDiff.tsx` — összehasonlítja a `partner_storefront_versions` legutóbbi publikált verzióját a beküldött (current) változattal.
- Mező-szintű diff: szöveges mezők piros/zöld szín jelöléssel (`diff` npm csomag), jsonb mezők (testimonials, custom_sections) struktúra-diff.
- Beépítés a `PartnerApprovalsPanel` storefront drawer-be: a leírás helyett vagy mellé "Változások" tab.

### 5. Sitemap cache és auto-újragenerálás
- Új tábla: `partner_sitemap_cache` (storefront_id PK, xml text, generated_at, etag, hit_count).
- `partner-sitemap` edge function átalakítás: először cache-ből próbál olvasni, ha 1 órán belüli → onnan szolgál ki (Cache-Control: public, max-age=3600 + ETag), különben regenerál.
- Trigger: `partner_storefronts` vagy `partner_products` változáskor → cache törlés az adott storefront-ra (NULL-ra állítjuk a sort, vagy DELETE).
- pg_cron job: óránként újragenerál minden élesben lévő storefront sitemap-jét (`net.http_post` a `partner-sitemap` functionre warmup paraméterrel).

### 6. SEO és cégadat mezők + auto JSON-LD/meta
- `partner_storefronts` bővítés: `seo_keywords` text[], `company_legal_name`, `company_tax_id`, `company_registration_number`, `company_address`, `company_phone`, `company_email`, `business_hours` jsonb, `founding_year`, `social_profiles` jsonb (külön a már meglévő social_* mezőktől, kifejezetten JSON-LD `sameAs`-hez).
- `BrandStorefront.tsx`: auto meta description ha üres → `tagline + " " + seo_keywords.join(", ")`. JSON-LD `Store` típushoz `address`, `telephone`, `email`, `taxID`, `foundingDate`, `sameAs`, `keywords` automatikusan kitöltve.
- `StorefrontEditorTab.tsx`: új "Cégadat" tab + bővített SEO tab (kulcsszó chip input).

### Technikai részletek
- **1 migráció**: új oszlopok `partner_storefronts`, `partner_storefront_preview_tokens`, `partner_domain_requests`; új táblák `partner_storefront_preview_access_log`, `partner_storefront_audit_log`, `partner_sitemap_cache`; triggerek; RLS + GRANT minden új public táblára; storage bucket `partner-domain-proofs`.
- **3 új edge function**: `partner-preview-access`, `verify-partner-domain-dns`, `partner-sitemap` (átírás cache-re).
- **1 pg_cron job**: óránkénti sitemap warmup.
- **Új csomag**: `diff` (verzió összehasonlításhoz).
- **~12 fájl**: BrandStorefront.tsx, StorefrontEditorTab.tsx (új tabok), StorefrontLivePreview.tsx (token kezelés), PartnerDomainTab.tsx (DNS check + upload), PartnerApprovalsPanel.tsx (diff + token log + force approve), új komponensek: StorefrontVersionDiff.tsx, PartnerStorefrontAuditLogTab.tsx, PreviewTokenManager.tsx.

### Amit NEM csinálunk
- Nem építünk valódi automatikus DNS propagáció monitort (csak igény szerinti / cron óránkénti DNS lookup).
- Nem írjuk újra a meglévő super admin felületet, csak új tab/szekciókat adunk hozzá.
- A diff vizuális — nem ad blokkoló validációt.
