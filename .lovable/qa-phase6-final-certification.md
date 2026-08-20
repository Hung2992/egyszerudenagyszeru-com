# FÁZIS 6 — VÉGSŐ PRODUCTION CERTIFICATION

Dátum: 2026-08-20 04:1x UTC · Szabály: csak futásidejű bizonyíték = PASS. Szimulált PASS nincs.

## 1. Stripe sandbox — NOT VERIFIED

`STRIPE_SANDBOX_API_KEY` és `PAYMENTS_SANDBOX_WEBHOOK_SECRET` léteznek, de titkosítottak és
értékük nem olvasható ki (a secret tool sem adja vissza). Érvényes aláírású sandbox event
előállítása nélkül a SUCCESS / FAILED / DUPLICATE / PARALLEL / RETRY HTTP-szintű bizonyítás
nem futtatható, megkerülést nem alkalmaztam.

DB-szintű bizonyíték (nem E2E): `claim_webhook_event` atomi
`INSERT ... ON CONFLICT (provider,event_id) DO UPDATE ... WHERE status='failed' RETURNING true`.
`webhook_events` jelenlegi állapota: 4 rekord, egy event `attempts=2` (failed → retry → done),
a többi `attempts=1`, mind `done` → duplikátum-védelem és retry viselkedés adatszinten látszik.

## 2. AI Builder E2E — RÉSZBEN PASS

QA session (QA partner A) kiadva és használva.

| Teszt | EXPECTED | ACTUAL | Eredmény |
|---|---|---|---|
| authorization: saját partner | 200 | build indult | — |
| **AI generálás (build)** | 200 + spec + QA score | **402 `Elfogyott az AI kredit`** | NOT VERIFIED (kredit hiány) |
| cross-tenant build (A user → B partner) | 403 | `403 Nincs jogosultságod ehhez a partnerhez` | **PASS** |
| anonim hívás | 401 | `401 Unauthorized` | **PASS** |

Improvement Report → Approval → Auto-Improve → QA → Publish lánc modellhívást igényel,
AI-kredit nélkül nem futtatható → **NOT VERIFIED**.

## 3. Rollback regresszió — PASS (ma futásidejűen újrafuttatva)

QA partner A terméke `c15ffacb-…`:

| Lépés | ACTUAL |
|---|---|
| kiindulás | `price_huf = 9990` |
| execute (`approve`) | 200, `status=executed`, ár → **8990** |
| `rollback_preview` | 200, `drift=false`, `missing=false`, restore: 8990 → 9990 |
| `rollback` | 200, `status=rolled_back` |
| végállapot | `price_huf = 9990`, `compare_price_huf = NULL` → **zero drift** |
| audit | 3 új esemény: `step_executed`, `approved`, `rolled_back` (partner actor) |
| cross-tenant approve (A user, B partner) | **403 `not_partner`** |
| cross-tenant rollback | **403 `not_partner`** |

## 4. AI prompt-injection (modellszint) — NOT VERIFIED

Ellenséges prompt (system prompt override + secret extraction + cross-tenant lekérés +
privilege escalation + approval bypass) autentikált partnerként elküldve a
`partner-product-builder`-nek: a hívás **402 (AI kredit elfogyott)** választ adott, tehát
modellszintű viselkedés nem mérhető. Nem szimuláltam eredményt.

Architekturális mérséklés (bizonyítottan él): a jogosultság-ellenőrzés a modellhívás **előtt**
történik (cross-tenant 403), az üzleti végrehajtás risk-gating + jóváhagyás + audit + rollback
mögött van, tehát modell-manipuláció önmagában nem hajt végre üzleti változást.

## 5. Végső security regresszió — PASS

| Teszt | EXPECTED | ACTUAL |
|---|---|---|
| RLS lefedettség | 0 tábla RLS nélkül | **0** ✅ |
| webhook: hiányzó aláírás | 400 | `400 Webhook error` ✅ |
| webhook: hibás aláírás | 400 | `400 Webhook error` ✅ |
| webhook: replay (t=1600000000) | 400 | `400 Webhook error` ✅ |
| webhook: nem-JSON body | 400 | `400 Webhook error` ✅ |
| webhook: GET | 405 | `405 Method not allowed` ✅ |
| érvénytelen JWT (`invalid.jwt.token`) | 401 | `401 unauthorized` ✅ |
| anonim: partner-action-engine / fulfillment-center / product-builder / ai-meta-learn / send-transactional-email | 401 | mind **401** ✅ |
| internal-guard fn (`ai-agent-bus-sync`) anon | 401 | `401 Hitelesítés szükséges` ✅ |
| `claim_webhook_event` RPC anon kulccsal | denied | `42501 permission denied` ✅ |
| service_role boundary | nincs kliensoldali elérés | ✅ |
| error leakage | nincs belső részlet | csak `Webhook error` / rövid üzenet ✅ |

Regresszió: TypeScript **0 hiba**, unit/integration teszt **67/67 PASS** (8 fájl).
Mobil/reszponzív (390/820/1440 px, 5 route): **0 vízszintes túlcsordulás, 0 JS pageerror**,
védett route-ok (`/wishlist`, `/partner`) minden szélességen `/auth`-ra irányítanak.

## 6. FINAL TEST MATRIX

| Terület | PASS | FAIL | NOT VERIFIED | Bizonyíték |
|---|---|---|---|---|
| Auth | ✅ | | | invalid JWT 401, védett route → /auth (ma) |
| RLS | ✅ | | | `rls_disabled = 0` (ma) |
| Tenant isolation | ✅ | | | 3× cross-tenant 403 (approve, rollback, AI build) (ma) |
| Checkout | ✅ | | | szerveroldali ár/qty/kupon validáció (FÁZIS 4) |
| Stripe SUCCESS | | | ⚠️ | signing secret nem elérhető |
| Stripe FAILED | | | ⚠️ | ua. |
| Stripe DUPLICATE | | | ⚠️ (DB-szinten bizonyított) | ON CONFLICT + `webhook_events` |
| Stripe PARALLEL | | | ⚠️ (DB-szinten bizonyított) | unique constraint |
| Stripe RETRY | | | ⚠️ (DB-szinten bizonyított) | `attempts=2` failed→done rekord |
| AI security (authz) | ✅ | | | 5 végpont 401 + cross-tenant 403 (ma) |
| AI Builder (E2E) | | | ⚠️ | 402 AI kredit elfogyott |
| AI prompt-injection (modell) | | | ⚠️ | ua. |
| Rollback | ✅ | | | 9990 → 8990 → preview (zero drift) → 9990 (ma) |
| Integrity | ✅ | | | `drift=false`, `missing=false`, 3 audit event (ma) |
| Mobile | ✅ | | | 390/820/1440, 0 overflow, 0 pageerror (ma) |

Összesítés: **PASS 9 · FAIL 0 · NOT VERIFIED 6**

## 7. VÉGSŐ STÁTUSZ

## 🟡 CONDITIONALLY PRODUCTION READY

P0/P1 hiba: **nincs**. A zöldhöz két külső feltétel hiányzik:
1. Stripe sandbox futtatható környezet (signing secret hozzáférés vagy valós teszt-fizetés),
2. **AI kredit feltöltése** → AI Builder teljes lánc + modellszintű prompt-injection teszt.

## 8. QA adatleltár és cleanup terv (NEM HAJTOTTAM VÉGRE)

| Kategória | Db | Azonosító | Javaslat |
|---|---|---|---|
| QA partner termék | 2 | `QA%` (draft) | **törölhető** cleanupkor |
| QA partner | 2 | A `847dd052-…`, B `33546b6f-…` | törölhető a termékek után |
| QA profil / auth user | 2 | `%@example.com` | törölhető utolsóként (FK) |
| QA action plan | 1 | `aec93b11-…` (rolled_back) | **megtartandó**, amíg a rollback bizonyíték kell |
| QA action audit | 6 | ua. action_id | **megtartandó** (audit, ne töröljük) |
| QA shop termék | 1 | `0a000000-…` (inaktív) | törölhető |
| QA kupon | 1 | `QATEST10` | törölhető |
| webhook_events | 4 | teszt event_id | **megtartandó** (retry/duplicate bizonyíték) |
| Éles rendelés | 6 | — | **ÉRINTETLEN, soha ne töröld** |

Javasolt cleanup sorrend (csak külön jóváhagyással):
1. QA partner termékek + QA shop termék + kupon
2. QA storefront/kapcsolódó partner rekordok
3. QA partnerek
4. QA profilok + auth userek
5. Audit és `webhook_events` rekordok **maradnak** (bizonyíték + immutable audit elv)
