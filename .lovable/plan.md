## Cél

A könyvelőd külön fiókkal lépjen be, csak a pénzügyi/számviteli adatokat lássa (mindent mást NEM), és egy letisztult, NAV-konform felületen kapja meg, amire szüksége van: havi bontás, ÁFA-összesítő, számlák listája + tömeges letöltés, export NAV-bevalláshoz.

## 1. Új szerepkör: `accountant`

- `app_role` enum bővítése: `admin`, `moderator`, `user`, **`accountant`**
- `has_role()` változatlan, már működik
- Új helper: `is_admin_or_accountant(uid)` — read-only access pénzügyi táblákhoz
- RLS policy-k bővítése (read-only) a következő táblákon:
  - `orders`, `order_events`
  - `invoices`, `invoice_settings`
  - `payment_attempts`, `refunds`, `refund_history`
  - `admin_transactions`, `payouts`, `supplier_payments`
  - `admin_procurement_orders` (költségoldal)
  - `tax_rates`, `coupons` (kedvezmények hatása az adóalapra)
  - `store_settings` → csak a `legal_*`, `invoice_*` mezők (új SECURITY DEFINER függvény)
- Könyvelő **NEM látja**: termékárazás stratégia, AI, marketing, ügyfél PII azon kívül, ami a számlán szerepel (név, cím), készletmozgás belső jegyzetek.

## 2. Könyvelő meghívása (admin oldal)

Új panel a Super Adminban: **„Könyvelő hozzáférés"** (`AdminAccountantAccessTab.tsx`)
- Email mező + „Meghívás" gomb
- Edge function: `invite-accountant`
  - magic link kiküldés (Supabase admin API)
  - automatikus `user_roles` insert `accountant` szerepkörrel a regisztráció után (trigger az `auth.users` insert eseményre, ha az email szerepel egy `pending_accountant_invites` táblában)
- Aktív könyvelők listája, „Hozzáférés visszavonása" gomb

## 3. Könyvelői felület: `/konyvelo`

Külön route, NEM a `/admin` alatt — saját, minimalista, nyomtatható layout (Space Grotesk, fekete-arany, szögletes).

```text
┌─────────────────────────────────────────────────┐
│ KÖNYVELŐ KÖZPONT          Horváth Zoltán EV     │
│ 92115477-2-27 · 27% ÁFA havi bevalló            │
├─────────────────────────────────────────────────┤
│ [2026 Június ▼] [Előző] [Következő] [Export]    │
├──────────────┬──────────────┬───────────────────┤
│ BRUTTÓ       │ NETTÓ        │ FIZETENDŐ ÁFA     │
│ 1 234 567 Ft │   972 100 Ft │   262 467 Ft      │
├──────────────┴──────────────┴───────────────────┤
│ Napi bontás (mini chart)                        │
├─────────────────────────────────────────────────┤
│ SZÁMLÁK (47 db)               [Mind letölt ZIP] │
│  EDN-2026-00031  06.01  Kiss J.    12 990 Ft 📄 │
│  EDN-2026-00032  06.01  Nagy P.     8 490 Ft 📄 │
│  ...                                            │
├─────────────────────────────────────────────────┤
│ JÓVÁÍRÁSOK / VISSZATÉRÍTÉSEK (3 db)             │
├─────────────────────────────────────────────────┤
│ KÖLTSÉGEK / BESZERZÉSEK (12 db)                 │
├─────────────────────────────────────────────────┤
│ EXPORT:  [CSV] [SZAMLAZZ.HU XML] [NAV ANYK XML] │
└─────────────────────────────────────────────────┘
```

Fülek:
1. **Áttekintés** — havi KPI-k, napi forgalom chart
2. **Számlák** — táblázat szűrőkkel (dátum, vevő, állapot), PDF letöltés egyenként vagy ZIP-ben
3. **Visszatérítések** — refund_history
4. **Költségek** — admin_procurement_orders + supplier_payments
5. **ÁFA-összesítő** — adóalap × 27% bontás, közösségi ügyletek külön (HU92115477)
6. **Export** — havi CSV (könyvelőprogramba), számla XML (NAV-kompatibilis)

## 4. Védelem

- `useAccountantCheck.ts` hook — `has_role(uid, 'accountant') OR has_role(uid, 'admin')`
- `/konyvelo` útvonal védelme: ha nincs jogosultság → `/auth` redirect
- Admin is láthatja (felügyelet végett)
- Külön topbar „KILÉPÉS" gombbal, NINCS shop nav, NINCS kosár

## 5. Audit napló

Új tábla `accountant_access_log` (ki, mikor, mit nézett/exportált) — GDPR + belső biztonság.

## Technikai fájlok

- `supabase/migrations/<ts>_accountant_role.sql` — enum bővítés, RLS, függvények, audit tábla
- `supabase/functions/invite-accountant/index.ts` — meghívó email
- `supabase/functions/accountant-export/index.ts` — CSV/XML export szerveroldalon (RLS-szel)
- `src/hooks/useAccountantCheck.ts`
- `src/pages/AccountantPortal.tsx` (route entry)
- `src/components/accountant/` — Layout, OverviewTab, InvoicesTab, RefundsTab, ExpensesTab, VatSummaryTab, ExportTab
- `src/components/admin/AdminAccountantAccessTab.tsx` — meghívó panel
- `src/App.tsx` — új route `/konyvelo`

## Megerősítés előtt

1. Az **email cím**, amit a könyvelőd használ → szükségem lesz rá a meghíváshoz (vagy meghívod te kézzel a felület építése után).
2. **Számlázó program**: Számlázz.hu / Billingo / Saját NAV Online Számla? (ez dönti el az export formátumot — most mindhárom CSV-t és NAV XML-t építek alapból, később bővíthető)
3. Engedélyezed, hogy a könyvelő lássa a vevők **számlázási nevét és címét** (ez kötelező a számlán, tehát igen — csak megerősítés)?

Ha rábólintasz, megépítem.