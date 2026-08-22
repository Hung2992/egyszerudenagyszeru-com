# FÁZIS 8 — INFRASTRUCTURE RECOVERY + FINAL E2E VERIFICATION

Dátum: 2026-08-22 07:53–08:00 UTC · Szabály: PASS csak futásidejű bizonyítékkal.
QA adat nem törölve. Üzleti kód nem módosult (csak ideiglenes diagnosztikai log, utána eltávolítva és újradeployolva).

## 1. PGRST002 / DATA API — ✅ HELYREÁLLT

Mérés: 5 kör × 5 endpoint (`shop_products`, `store_settings`, `giveaway_settings`, `coupons`, `partner_products`),
2026-08-22 07:53:54 – 07:54:14 UTC, 4 s-enként.

| Metrika | ACTUAL |
|---|---|
| Kérések | 25/25 |
| HTTP 200 | 25/25 (100%) |
| PGRST002 / 503 | 0 |

→ Az infrastruktúra-hiba (FÁZIS 7, PostgREST schema cache) **megszűnt**, több egymást követő kérésen stabil.
`create-checkout-session` újra fut (HTTP 200, `orders` insert sikeres, nincs 500-as termékadat hiba).

## 2. STRIPE SANDBOX E2E — ❌ BLOKKOLT (nem Data API miatt)

QA termék (`0a000000-…-0001`) ideiglenesen aktiválva (stock 50) → teszt → **visszaállítva `is_active=false`, `stock=0`**.

`POST /create-checkout-session` (sandbox és live is): **HTTP 200, de `clientSecret` nélkül**.
Diagnosztikai log a Stripe-hívás nyers válaszáról:

```
[QA] raw session: {"status":401,"type":"unauthorized","title":"Credential not found",
"message":"Credential not found","props":{"source":"connectors_gateway"}, ...}
```

→ A Lovable connector gateway **nem talál Stripe hitelesítő adatot** sem sandbox, sem live környezetre,
holott a go-live státusz mind az 5 lépésre `completed` (sandbox `acct_1TGayRPGdIjsATsV`, live `acct_1TMCwQAfPWiNB8Dj`).
Ezért SUCCESS / FAILED / DUPLICATE / PARALLEL / RETRY **nem futtatható → NOT VERIFIED**.

**Webhook biztonság újratesztelve (PASS):** aláírás nélkül `400`, hamis `v1` aláírással `400`.

### 🔴 SOFTWARE DEFECT (P1) — javítás jóváhagyásra vár

`create-checkout-session` nem ellenőrzi, hogy a Stripe válasz valódi session-e. Gateway hiba esetén:
- `session.client_secret` = undefined → **HTTP 200** megy vissza `clientSecret` nélkül,
- a rendelés viszont már létrejött `awaiting_payment` státusszal (árva rendelés),
- kupon `used_count` már megnövelve.

A frontend csak konzolba logol („Missing clientSecret”), a felhasználó néma hibát lát.
Javasolt (NEM végrehajtott) javítás: ha `!session?.client_secret` → 502 + a létrehozott rendelés
`failed`/`cancelled` státuszba állítása és a kupon-számláló visszavonása.

Ez a defekt ma élesben is aktív: **kártyás fizetés a publikus shopon jelenleg nem indítható**.

Mai teszt által létrehozott árva rendelések (NEM töröltem): `42956254…`, `58b5185d…`, `000dec18…`, `0b4d08b5…`, 1 live-env teszt.

## 3. AI BUILDER — ❌ NOT VERIFIED

Valódi authentikált hívás QA partner JWT-vel (`33546b6f-…`, `partner-product-builder`, `mode=build`):
**HTTP 402 – „Elfogyott az AI kredit.”**
Munkaterület egyenleg: billing grant 0.00 / 100, napi 1.80 / 5.00 → a gateway továbbra is elutasít.
Improvement → Approval → Auto-Improve → QA → Publish lánc nem futtatható.

## 4. PROMPT-INJECTION — ❌ NOT VERIFIED

Modellhívás nem lehetséges (402), szimulált PASS nincs. Architekturális védelem változatlan
(authz a modellhívás előtt: `ai-marketing-ceo` anon hívás `401`, builder cross-partner `403`).

## 5. FINAL CERTIFICATION

| Kategória | Tétel | Eredmény |
|---|---|---|
| INFRASTRUCTURE | Data API / PGRST002 | ✅ HELYREÁLLT (25/25 · 07:54 UTC) |
| EXTERNAL DEPENDENCY BLOCKER | Stripe connector credential („Credential not found”, sandbox + live) | ❌ BLOKKOL |
| EXTERNAL DEPENDENCY BLOCKER | AI kredit (402) | ❌ BLOKKOL |
| SOFTWARE DEFECT (P1) | checkout: gateway hiba → 200 + árva rendelés | ⚠️ NYITVA (javítás jóváhagyásra vár) |
| PASS | Data API stabilitás | ✅ |
| PASS | Webhook signature (hiányzó/hamis → 400) | ✅ |
| PASS | Edge function authz (401/403) | ✅ |
| PASS | RLS / tenant isolation / rollback (F6) | ✅ |
| NOT VERIFIED | Stripe SUCCESS/FAILED/DUPLICATE/PARALLEL/RETRY | ⛔ |
| NOT VERIFIED | AI Builder E2E | ⛔ |
| NOT VERIFIED | Prompt-injection (modellszint) | ⛔ |

Mérleg: **PASS 4 · SOFTWARE DEFECT 1 (P1) · INFRASTRUCTURE BLOCKER 0 (megszűnt) ·
EXTERNAL DEPENDENCY BLOCKER 2 · NOT VERIFIED 3**

### VÉGSŐ STÁTUSZ: 🟡 CONDITIONALLY PRODUCTION READY

Zöldhöz szükséges: (1) Stripe connector credential újraprovizionálása, (2) AI kredit feltöltés,
(3) a P1 checkout hibakezelés javítása.

## 6. Cleanup terv (NEM HAJTOTTAM VÉGRE)

Változatlan a FÁZIS 6/7 tervhez képest, kiegészítve a mai 5 árva `awaiting_payment` teszt rendeléssel.
Végrehajtás csak explicit jóváhagyással.
