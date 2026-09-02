# FÁZIS 11 — Stripe Connector Recovery + Final Payment Certification
Dátum: 2026-09-01 (UTC) • Kódmódosítás: **NINCS** (0 fájl)

## 1. Stripe connector diagnózis — GYÖKÉROK MEGTALÁLVA

| Vizsgálat | Eredmény |
|---|---|
| Go-live státusz | mind az 5 lépés **completed** |
| Sandbox account | `acct_1TGayRPGdIjsATsV` |
| Live account | `acct_1TMCwQAfPWiNB8Dj` |
| Edge secretek (`STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, webhook secretek) | CONFIGURED (érték nem olvasva, nem logolva) |
| Workspace "Stripe (sandbox)" connection | létezik, gateway-backed, **nincs a projekthez linkelve** |
| **Gateway élő próba (`GET /v1/account`)** | **HTTP 401 — `api_key_expired`: „Expired API Key provided: sk_test_***"** |
| create-checkout-session sandbox | HTTP 502, upstream `status: 401` |
| create-checkout-session live | HTTP 502, upstream `status: 401` |

**Gyökérok:** nem hiányzó vagy rosszul bekötött titok, hanem a Stripe oldalon
**lejárt / visszavont sandbox secret key**. A gateway a tárolt kulccsal hívja a
Stripe-ot, a Stripe pedig `api_key_expired` hibát ad vissza. Ugyanez a
tünet live módban is (401), tehát a kulcs-készlet újraprovizionálása szükséges.

Ez tipikusan akkor áll elő, amikor a sandboxot egy meglévő Stripe fiókhoz
igényelik / élesítik, és a régi sandbox kulcs érvénytelenné válik, miközben a
Lovable oldali tárolt credential nem frissül.

### Státusz
**🔴 PLATFORM CONNECTOR BINDING ERROR — `api_key_expired` (Stripe oldali kulcs lejárt)**
Alkalmazáskódból **nem javítható**. A checkout kódot nem módosítottam.

### Support-ready összefoglaló (secret nélkül, másolható)
```
Project: egyszerudenagyszeru (Lovable Cloud)
Issue:   Managed Stripe payments — every Stripe API call fails with HTTP 401
Sandbox account: acct_1TGayRPGdIjsATsV
Live account:    acct_1TMCwQAfPWiNB8Dj
Go-live status:  all 5 steps completed (readiness check passed)
Secrets present: STRIPE_SANDBOX_API_KEY, STRIPE_LIVE_API_KEY,
                 PAYMENTS_SANDBOX_WEBHOOK_SECRET, PAYMENTS_LIVE_WEBHOOK_SECRET
Gateway probe (connector-gateway.lovable.dev/stripe, GET /v1/account):
  HTTP 401 {"error":{"type":"api_error","code":"api_key_expired",
            "message":"Expired API Key provided: sk_test_***"}}
Edge function create-checkout-session: upstream status 401 in both
  ?environment=sandbox and ?environment=live -> function returns 502 (by design)
Request: re-provision / rotate the managed Stripe sandbox + live API keys for
         this project's connector-gateway connection.
Impact:  no checkout can be started; app-side compensation works (no orphan orders).
```
**Nem futtattam** automatikus disconnect/reconnect-et a fizetési integráción: a
platform ehhez nem ad biztonságos eszközt, és egy fél-lebontott fizetési kapcsolat
kockázatosabb lenne, mint a jelenlegi tiszta 502-es fallback. Ajánlott kézi lépés a
Payments fülön: fizetési integráció újracsatlakoztatása / kulcsok újraprovizionálása;
ha ez nem oldja meg, a fenti blokk támogatásnak beküldhető.

## 2. Payment E2E — NEM FUTTATVA (blokkolt)
A sandbox connector nem CONNECTED+USABLE, ezért a
SUCCESS / FAILED / DUPLICATE / PARALLEL / RETRY teszteket **nem futtattam**
és nem jelölöm PASS-nak.

Amit a blokk ellenére bizonyítani lehetett:
- 3 hibás checkout-kísérlet (sandbox, live, ár-manipulált) → mindhárom **502**
- **0 új rendelés** az elmúlt 1 órában (`orders`), **0** új `awaiting_payment`
- kupon `used_count` drift: nincs
→ **Checkout failure compensation + atomicitás: PASS**

## 3. Payment security regression
| Teszt | Elvárt | Tényleges | Eredmény |
|---|---|---|---|
| Webhook aláírás nélkül | elutasítás | **400** Webhook error | PASS |
| Érvénytelen aláírás | elutasítás | **400** | PASS |
| Módosított payload (aláírás nem egyezik) | elutasítás | **400** | PASS |
| Replay (t=1700000000, 5 percen túl) | elutasítás | **400** | PASS |
| Hiányzó `env` query param | nem dolgozza fel | **400** | PASS |
| GET metódus | tiltott | **405** | PASS |
| Érvénytelen termékazonosító | 400 | **400** „Érvénytelen termékazonosító." | PASS |
| Nem létező termék | 400 | **400** „Ismeretlen termék" | PASS |
| Ár-manipuláció (kliens 1 Ft) | szerveroldali ár | szerver újraszámol, nincs rendelés | PASS |
| Valós aláírású replay (duplikátum-védelem futásidőben) | 1 feldolgozás | – | NOT VERIFIED (kulcs kell) |

## 4. Final regression
| Terület | Eredmény |
|---|---|
| TypeScript | **0 hiba** |
| Unit/integration | **67/67 PASS** (8 fájl) |
| RLS | PASS (`pg_policies` + futásidejű 403) |
| Tenant isolation | PASS (FÁZIS 10, 403) |
| Checkout compensation | PASS (fent, 0 orphan) |
| Webhook security | PASS (6/6) |
| AI authorization | PASS (401/403) |
| AI Builder E2E | PASS (FÁZIS 10, build + improve report) |
| Prompt injection | PASS 7/7 (FÁZIS 10) |
| Rollback | PASS (FÁZIS 6) |
| Responsive | PASS (FÁZIS 5) |

## 5. Final certification mátrix
| Terület | Állapot | Bizonyíték |
|---|---|---|
| TypeScript | PASS | 0 hiba |
| Tests | PASS | 67/67 |
| RLS | PASS | policy + 403 |
| Auth | PASS | 401 |
| Checkout (hiba + kompenzáció) | PASS | 502, 0 orphan order |
| Payment SUCCESS | NOT VERIFIED | Stripe `api_key_expired` |
| Payment FAILED | NOT VERIFIED | Stripe `api_key_expired` |
| Duplicate | NOT VERIFIED | Stripe `api_key_expired` |
| Parallel | NOT VERIFIED | Stripe `api_key_expired` |
| Retry | NOT VERIFIED | Stripe `api_key_expired` |
| Webhook security | PASS | 6/6 negatív teszt |
| AI Authorization | PASS | 401/403 |
| AI Builder E2E | PASS | run_id IMP-2026-09-01-100 |
| Prompt Injection | PASS | 7/7 |
| Rollback | PASS | drift-mentes |
| Responsive | PASS | 3 breakpoint |

**11 PASS / 16 = 68,75% bizonyított • 5 NOT VERIFIED (31,25%) • 0 FAIL • P0 = 0 • P1 = 0**

## VÉGSŐ STÁTUSZ: 🟡 CONDITIONALLY PRODUCTION READY
Egyetlen fennmaradó blokkoló: **lejárt Stripe API kulcs a platform connectorban**.
Alkalmazás oldali hiba nincs; a kulcs újraprovizionálása után a Payment E2E
azonnal futtatható és a certification 🟢-ra emelhető.

## 🧹 QA adat — NEM töröltem
| Rekord | Tábla | Állapot / javaslat |
|---|---|---|
| `0a000000-...-000000000001` QA TESZT TERMÉK | shop_products | visszaállítva: **inaktív, stock 0** — megtartani a Stripe E2E-ig |
| 9 db régi `awaiting_payment` rendelés (08-17 / 08-22) | orders | törölhető a Stripe E2E után |
| `rlsa-*`, `rlsb-*` teszt userek + partnerek (`33546b6f`, `847dd052`) | auth.users / partners | megtartani (tenant-izolációs teszthez kell) |

Cleanup csak explicit jóváhagyás után, a végső certification lezárásakor.
