# FÁZIS 9 — P1 CHECKOUT / STRIPE SESSION FAILURE FIX

Dátum: 2026-08-23 (UTC)
Érintett fájl: `supabase/functions/create-checkout-session/index.ts` (deployolva)

## P1 BEFORE (reprodukció, FÁZIS 8)
- A Stripe connector gateway `401 Credential not found` hibát ad (sandbox + live).
- A függvény ennek ellenére **HTTP 200**-at adott vissza `clientSecret: undefined` mezővel.
- Mellékhatások maradtak: **új `awaiting_payment` order**, **kupon `used_count` +1**.
- Kliens oldalon csak konzol log lett, a felhasználó "csendes" hibát látott.

## FIX (pontos változtatás)
1. **Stripe válasz validáció** a siker előtt:
   - `session.object === "checkout.session"`
   - `session.id` létezik és `cs_` prefixű
   - `session.client_secret` string, trim után > 20 karakter
   - bármelyik hiányzik → checkout failure (nincs 200).
2. **Idempotens kompenzáció** (`compensate(reason)`, egyszer futhat le):
   - order törlése **csak** `status = 'awaiting_payment'` feltétellel (fizetett/haladó rendelést nem érint),
   - kupon `used_count` visszaállítása optimista feltétellel (`used_count = previous + 1`), így párhuzamos foglalás nem sérül,
   - lefut a Stripe-hiba ágon, a kivétel ágon és a minimumösszeg-elutasításnál is.
3. **HTTP hibakezelés**: külső Stripe/connector hiba → **HTTP 502**,
   `{"error":"A fizetés indítása jelenleg nem elérhető"}`.
   A nyers hibaüzenet / credential / connector részlet **csak szerveroldali logba** kerül (korábban a kliens megkapta a nyers `error.message`-t).
4. Siker esetén a válasz `clientSecret`, `session_id`, `order_id`.

## AFTER — futásidejű bizonyíték
Környezet: QA termék `0a000000-…0001` ideiglenesen aktív, `QATEST10` kupon ideiglenesen aktív.
Kiindulás: `coupons.QATEST10.used_count = 1`, `orders where status='awaiting_payment' = 9`.

| Teszt | Eredmény |
|---|---|
| A) Upstream credential hiba (gateway 401) | **HTTP 502**, `{"error":"A fizetés indítása jelenleg nem elérhető"}` — PASS |
| B) Hiányzó `clientSecret` | ugyanaz az ág (a 401 miatt nincs érvényes session) → **502 + rollback** — PASS |
| C) Üres/érvénytelen session | validáció elutasítja → **502**, nincs mellékhatás — PASS |
| D) Érvényes session (HTTP 200 út) | **NOT VERIFIED** — nincs működő Stripe credential |
| E) Ismételt sikertelen hívás (3×) | 3× 502; `used_count` **1 → 1**, új QA order: **0** — PASS |
| F) Párhuzamos hívás (3× egyszerre) | 1× 502 + 2× 409 (optimista kupon lock); végállapot konzisztens, nincs order felhalmozódás — PASS |

Zárómérés: `QATEST10.used_count = 1` (változatlan), `orders.awaiting_payment = 9` (változatlan), `orders where customer_email='qa-phase9@example.com' = 0`.

## REGRESSION
- TypeScript (`tsconfig.app.json`): **0 hiba**
- Unit/integration: **67/67 PASS** (8 fájl)
- Kupon szerveroldali validáció + manipulációs védelem: változatlan, tesztelve (E/F)
- RLS: nem módosult
- Webhook security: `payments-webhook` aláírás nélkül → **400**, hamis aláírással → **400** — PASS

## HIBAOSZTÁLYOZÁS
- **SOFTWARE DEFECT (P1): JAVÍTVA** — csendes 200 + orphan order + kuponszivárgás.
- **EXTERNAL DEPENDENCY BLOCKER:** Stripe connector gateway `401 Credential not found`.
- **NOT VERIFIED (változatlan):** Stripe SUCCESS / FAILED / DUPLICATE / PARALLEL / RETRY teljes E2E — valódi sandbox credential nélkül nem bizonyítható.

## ÁLLAPOT
🟡 CONDITIONALLY PRODUCTION READY. QA adat nem törölve; a QA termék és kupon a teszt után visszaállt inaktív állapotba (stock=0).
