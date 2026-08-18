# FÁZIS 4 — QA E2E CERTIFICATION REPORT

Futtatva: 2026-08-18 (UTC) · Környezet: **production Supabase projekt** (nincs külön QA projekt)

## 0. Izolációs nyilatkozat
Nincs külön QA környezet. A tesztelés **QA-taggelt, elkülönített adatokkal** történt a production adatbázisban.
Valós ügyféladat nem módosult és nem törlődött. E-mail confirmation nem lett megkerülve: a QA sessionök
a Lovable dokumentált QA session-mintáló mechanizmusával készültek, meglévő, megerősített teszt-fiókokra.

QA identitások: `rlsa-1961ef86@example.com` (A), `rlsb-284ad0ac@example.com` (B),
`QA-PARTNER-A`, `QA-PARTNER-B`. (A kért `qa.test.a/b@example.com` címekre productionben nem hozható létre
megerősített fiók a confirmation megkerülése nélkül; a QA rendelések e-mail mezője `qa.test.a@example.com`.)

## 1. User / Partner isolation (RLS, ID-manipulációval)

| # | Teszt | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|---|
| ISO-1 | A olvassa saját profilját | 1 sor | 1 sor | PASS |
| ISO-2 | A olvassa B profilját (ID manip.) | 0 sor | `[]` | PASS |
| ISO-3 | A olvas minden profilt | csak saját | csak saját | PASS |
| ISO-4 | anon olvas profilokat | 0 sor | `[]` | PASS |
| ISO-5/6 | A saját / B partner rekord | 1 sor / 0 sor | 1 / `[]` | PASS |
| ISO-7/8 | A saját / B partner termék | 1 sor / 0 sor | 1 / `[]` | PASS |
| ISO-9/10 | orders A / anon | 0 sor | `[]` | PASS |
| ISO-11/12 | user_roles anon / A | 0 sor | `[]` | PASS |
| ISO-13 | contact_messages anon | 0 sor | `[]` | PASS |
| ISO-14 | tenant_kyc_submissions A | 0 sor | `[]` | PASS |
| ISO-W1 | A átírja B partner nevét | nincs hatás | 204, DB: `QA-PARTNER-B` változatlan | PASS |
| ISO-W3 | A átírja B termék árát 1 Ft-ra | nincs hatás | 204, DB: 9990 változatlan | PASS |
| ISO-W4 | A admin szerepet ad magának | tiltva | 403 RLS | PASS |
| ISO-W5 | anon terméket szúr be | tiltva | 401 RLS | PASS |
| ISO-W6 | A átírja shop termék árát | nincs hatás | DB: 4990 változatlan | PASS |

## 2. Checkout E2E (`create-checkout-session`)

| # | Teszt | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|---|
| CO-1 | Normál rendelés | order létrejön | `total_amount=6480` (4990 + 1490 szállítás) | PASS |
| CO-2 | Kliensoldali ár 1 Ft | DB ár érvényesül | order `6480`, tétel ár 4990 | PASS |
| CO-3 | Mennyiség 99999 | elutasítva | 400 „Nincs elegendő készlet” | PASS |
| CO-4 | Negatív mennyiség (-5) | 1-re korlátozva | qty=1, total 6480 | PASS |
| CO-5 | Valós kupon QATEST10 | szerveroldali 10% | `discount_amount=499`, total `5981` | PASS |
| CO-6 | Hamis kupon | elutasítva | 400 „Érvénytelen kuponkód” | PASS |
| CO-7 | Nem létező termék | elutasítva | 400 „Ismeretlen termék” | PASS |
| CO-8 | Order tulajdonos | JWT userhez kötve | `user_id = A` mind a 4 rendelésen | PASS |

Szállítási díj és végösszeg **kizárólag szerveroldalon** számolódik (store_settings alapján).

## 3. Payment / Webhook

| # | Teszt | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|---|
| PAY-1 | Aláírás nélküli webhook hívás | elutasítva | 400 „Webhook error” | PASS |
| PAY-2 | `claim_webhook_event` RPC kliensből | tiltva | 403 permission denied | PASS |
| PAY-3 | SUCCESS: Checkout → PAID | PAID | nem futtatható valódi kártyás fizetés nélkül | **NOT VERIFIED** |
| PAY-4 | FAILED: order != PAID | — | — | **NOT VERIFIED** |
| PAY-5 | DUPLICATE 1 esemény = 1 feldolgozás | — | csak FÁZIS 1 kódszintű/DB bizonyítás | **NOT VERIFIED (runtime)** |
| PAY-6 | PARALLEL 5 kérés = 1 feldolgozás | — | ugyanaz | **NOT VERIFIED (runtime)** |
| PAY-7 | RETRY failed → success | — | — | **NOT VERIFIED** |

Ok: a Stripe webhook signing secret és a valódi (sandbox) kártyás fizetés befejezése nélkül a
webhook útvonal futásidejűen nem hajtható végre ebből a környezetből.

## 4. AI security E2E

| # | Támadás | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|---|
| AI-1 | Cross-tenant action plan (A → B) | 403 | 403 `not_partner` | PASS |
| AI-3 | Anonim action engine hívás | 401 | 401 `unauthorized` | PASS |
| AI-4 | Cross-tenant fulfillment center | 403 | 403 „Nincs jogosultság” | PASS |
| AI-6 | Anonim AI Product Builder | 401 | 401 `Unauthorized` | PASS |
| AI-7 | Ismeretlen művelet / privilege escalation | elutasítva | 400 `unknown_action` | PASS |
| AI-5 | Prompt injection (kulcs- és e-mail kiszivárgás) | megtagadás | input validáció miatt nem jutott modellig (400) | **NOT VERIFIED** |
| AI-8 | Költséggeneráló abuse (rate limit) | limitálva | nem mérve | **NOT VERIFIED** |

## 5. Rollback E2E (bizonyított futásidejű lánc)

Terv: `aec93b11-e4d3-45f2-a6e7-1e7441de8701` · Termék: QA-PARTNER-A termék

| Lépés | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|
| Cross-tenant rollback (A token, B partner) | 403 | 403 `not_partner` | PASS |
| Verzió A | ár 9990 | 9990 | PASS |
| Végrehajtás → Verzió B | ár 8990, status `executed` | 8990, `executed` | PASS |
| Rollback preview | 1 visszaállítás, 0 drift | `{total:1, restore:1, drifted:0}`, 8990 → 9990 | PASS |
| Rollback | státusz `rolled_back` | `rolled_back` | PASS |
| Integritás (DB ellenőrzés) | ár 9990, compare NULL | 9990, NULL | PASS |
| Audit trail | minden esemény naplózva | 3 sor: `step_executed`, `approved`, `rolled_back` | PASS |

## 6. Partner workflow

Tenant izoláció, jogosultság-kikényszerítés, audit trail, before/after állapot és AI action approval:
**PASS** (fenti 1. és 5. szakasz bizonyítékai).
AI Builder → Improvement Report → Auto-Improve → Publish teljes UI-lánc: **NOT VERIFIED**
(valódi partner UI-session és AI generálás-költség nélkül nem futtattuk végig).

## 7. Végső certifikációs táblázat

| Terület | PASS | FAIL | NOT VERIFIED | Bizonyíték |
|---|---|---|---|---|
| Auth | 4 | 0 | 0 | 401/403 anon hívások, JWT-kötött order |
| User isolation | 9 | 0 | 0 | ISO-1…14 |
| Partner isolation | 6 | 0 | 0 | ISO-5…8, W1, W3, AI-1, AI-4, RB-0 |
| Checkout | 8 | 0 | 0 | CO-1…8 + DB total-ellenőrzés |
| Payment | 2 | 0 | 5 | PAY-1…7 |
| Webhook | 2 | 0 | 2 | PAY-1, PAY-2 |
| AI security | 5 | 0 | 2 | AI-1…7 |
| Partner workflow | 5 | 0 | 1 | audit trail + action engine |
| Rollback | 7 | 0 | 0 | teljes A→B→rollback lánc |
| Integrity | 3 | 0 | 0 | DB állapot + audit sorok |
| Mobile | — | 0 | 1 | csak FÁZIS 2 (27 nézet) bizonyíték |
| RLS | 14 | 0 | 0 | REST olvasás/írás tesztek |
| Unit tesztek | 67 | 0 | 0 | vitest 67/67 |

### Minősítés: 🟡 CONDITIONALLY PRODUCTION READY

P0/P1 hiba **nem maradt**; minden vizsgált biztonsági és izolációs flow PASS.
A feltételesség oka: a **fizetés–webhook üzleti lánc (SUCCESS / FAILED / DUPLICATE / PARALLEL / RETRY)
futásidejűen nincs bizonyítva** ebből a környezetből.

## 8. QA adatleltár (NINCS TÖRÖLVE)

| Tábla | Azonosító | Állapot |
|---|---|---|
| shop_products | `0a000000-0000-4000-8000-000000000001` „QA TESZT TERMÉK – NE VÁSÁROLD” | inaktiválva, stock 0 |
| coupons | `QATEST10` | inaktiválva |
| profiles | display_name `QA TEST USER A/B` (2 sor) | aktív |
| partners | `QA-PARTNER-A` `847dd052-…`, `QA-PARTNER-B` `33546b6f-…` | inaktiválva |
| partner_products | 2 QA piszkozat termék | draft |
| partner_action_plans | `aec93b11-…` | rolled_back |
| partner_action_audit | 3 sor a fenti tervhez | megőrizve |
| orders | 4 db, `customer_email = qa.test.a@example.com` | awaiting_payment |
| auth.users | `rlsa-1961ef86@example.com`, `rlsb-284ad0ac@example.com` | QA fiókok |

Valós ügyfélrekord nem módosult: a nem-QA rendelések, kapcsolati üzenetek és a 2 valós partner
érintetlen (ellenőrizve lekérdezéssel a teszt előtt és után).

**Törlés csak explicit kérésre.**
