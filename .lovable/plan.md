## Cél

Teljes partner program: te meghívsz valakit (influencer / B2B viszonteladó / márka együttműködő / egyszerű ajánló), kap egy saját kupont, minden vele érkezett rendelés után fix Ft jutalékot számolunk, ő látja a statisztikáit, kérhet kifizetést és letölthet marketing anyagokat. Te admin felületen kezelsz mindent.

## 1. Adatbázis (új migráció)

**Új enum**: `partner_type` = `influencer | reseller | brand | referrer`  
**Új enum**: `partner_status` = `invited | active | paused | revoked`  
**Új enum**: `payout_status` = `requested | approved | paid | rejected`  
`app_role` **enum bővítés**: `+ partner`

**Új táblák** (mind RLS + GRANT a megfelelő szerepkörökhöz):

- `partners` — partner profil
  - `user_id`, `type`, `status`, `display_name`, `company_name`, `tax_number`, `bank_account`, `commission_per_order` (Ft, fix), `coupon_id` (→ `coupons.id`), `notes`, időbélyegek
- `pending_partner_invites` — meghívott e-mailek várnak regisztrációra (mint a könyvelőnél), `type`, `commission_per_order`, `coupon_code`, `expires_at`
- `partner_referrals` — minden rendelés ami partnerhez köthető (kupon-egyezés alapján)
  - `partner_id`, `order_id`, `coupon_code`, `order_total`, `commission_amount`, `status` (`pending | confirmed | cancelled` — rendelés státuszt követi), `confirmed_at`
- `partner_payouts` — kifizetési kérelmek
  - `partner_id`, `amount`, `status`, `requested_at`, `paid_at`, `payment_reference`, `notes`
- `partner_marketing_assets` — letölthető bannerek / képek / linkek (storage bucket-ből)
  - `title`, `description`, `asset_url`, `asset_type` (`banner | logo | photo | link_template`), `active`

**Új trigger**: rendelés `status = 'paid' / 'fulfilled'` → ha a `coupon_code` egy partner kuponja, automatikus `INSERT` a `partner_referrals`-be a `commission_per_order` értékkel. Visszamondott rendelésnél `status = 'cancelled'`.

**RLS** kulcsszabályok:

- Partner csak a saját `partners`, `partner_referrals`, `partner_payouts` rekordjait látja (`auth.uid() = partners.user_id`)
- `partner_marketing_assets` — minden bejelentkezett partner olvashatja
- Admin mindent kezelhet (`has_role(uid,'admin')`)
- Csak admin írhat `partners`-be (státusz, jutalék), partner csak `partner_payouts`-ba kérhet kifizetést

## 2. Edge függvények

- `invite-partner` — admin meghív egy e-mailt: létrehoz egy `pending_partner_invites` rekordot, generál egyedi kupont a `coupons` táblába (admin által megadott %/Ft kedvezménnyel a vásárlónak), e-mailben elküldi a meghívó linket (új tranzakciós e-mail sablon: `partner-invite.tsx`)
- `partner-claim` — első bejelentkezéskor: ha az e-mail szerepel a `pending_partner_invites`-ban, létrejön a `partners` rekord, hozzáköti a kupont, beállítja a `partner` szerepkört a `user_roles`-ba, törli a meghívót
- `partner-request-payout` — partner kéri a felhalmozott `confirmed` jutalék kifizetését (min. összeg ellenőrzés)
- `partner-stats` — összegzett statisztika a partner dashboardhoz (összes elad., összes jutalék, ebből kifizetett, függő)

## 3. Frontend: új útvonal `/partner`

Külön minimalista layout (mint `/konyvelo`), NEM webshop nav:

- **Áttekintés tab** — KPI kártyák: kupon kód (copy gomb), aktív állapot, összes rendelés, összes jutalék, függő jutalék, kifizetett jutalék, mini havi chart
- **Rendelések tab** — `partner_referrals` lista: dátum, rendelésazonosító (csak utolsó 4), összeg, jutalék, státusz
- **Kifizetések tab** — gomb "Kifizetés kérése" (csak ha van confirmed jutalék), korábbi kérések listája státusszal
- **Marketing tab** — `partner_marketing_assets` rács, letöltés / link másolás gomb, kész szöveg-sablonok Instagram/TikTok posthoz
- **Profil tab** — saját adatok (cégnév, adószám, bankszámla) szerkesztése

Új fájlok:

- `src/hooks/usePartnerCheck.ts`
- `src/pages/PartnerPortal.tsx`
- `src/components/partner/PartnerLayout.tsx`, `OverviewTab.tsx`, `ReferralsTab.tsx`, `PayoutsTab.tsx`, `MarketingTab.tsx`, `ProfileTab.tsx`

`Profile.tsx`-ben új gomb (mint a könyvelői), csak partnernek látható: **"Partner felület"** → `/partner`.

## 4. Admin felület (Super Admin új szekció)

Új tab: **"Partnerek"** (`AdminPartnersTab.tsx`)

- Meghívás form: e-mail + típus (4 választás) + fix Ft jutalék/rendelés + vásárlói kupon kedvezmény (%/Ft) → "Meghívás" gomb
- Aktív partnerek táblázat: név, típus, kupon, össz forgalom, össz jutalék, állapot (pause/revoke gomb)
- Kifizetési kérelmek lista: jóváhagyás / kifizetve jelölés / elutasítás (megjegyzéssel)
- Marketing anyagok feltöltése (storage bucket: `partner-assets`)
- Statisztikai összesítő (top partnerek, havi forgalom)

## 5. E-mail sablonok

- `partner-invite.tsx` — meghívó link + magyarázat
- `partner-payout-approved.tsx` — kifizetés visszaigazolás
- `partner-welcome.tsx` — első sikeres bejelentkezés után

## 6. Biztonság

- Kuponok admin által generáltak, garantáltan egyediek (`PARTNER-XXXX` formátum)
- Jutalék csak `paid`/`fulfilled` rendelésre `confirmed`, `cancelled`/`refunded`-nél visszavonjuk
- Bankszámla titkosított oszlop (pgcrypto opcionális, vagy csak admin által olvasható view)
- Audit napló a kifizetésekről

## Technikai részletek

```text
USER FLOW
─────────────────────────────────────────────
Admin → "Partnerek" tab → Meghívás (email, típus, 1000 Ft/rendelés)
         ↓
       invite-partner edge fn
         ↓
       pending_partner_invites + új kupon "PARTNER-AB12" + email
         ↓
Partner regisztrál ugyanazzal az emaillel
         ↓
       partner-claim → partners + user_roles('partner') + welcome email
         ↓
Vásárló használja "PARTNER-AB12" kupont rendeléskor
         ↓
       order paid → trigger → partner_referrals (+1000 Ft pending)
         ↓
       order fulfilled → status = confirmed
         ↓
Partner /partner felületen látja → "Kifizetés kérése"
         ↓
       partner-payouts (requested) → admin jóváhagyja → paid
```

## Mit NEM csinálok most (későbbre hagyom)

- Automatikus banki utalás (manuálisan utalsz, csak jelölöd "paid"-nek)
- Lépcsős jutalék (most csak fix Ft)
- Click tracking / referral link (most csak kupon-alapú attribúció)
- Adóügyi automatizmus (1%-os kifizetési jelentés a NAV-nak — később ha kell)

Megerősítés után megépítem a teljes rendszert egy menetben