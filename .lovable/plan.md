## Sprint A — Drop / Raffle Engine

Streetwear-alap: időzített dropok, várósor, raffle sorsolás, botvédelem, ideiglenes kosárfoglalás. A meglévő `shop_products` + `partner_products` + `orders` rendszerre épül.

### 1. Adatbázis (migration)

Új táblák a `public` sémában (RLS + GRANT-tel):

**`product_drops`** — a drop maga
- `product_id`, `partner_id?`, `name`, `slug`
- `starts_at`, `ends_at` — mikor nyílik/zár
- `drop_type`: `first_come` (érkezési sorrend) vagy `raffle` (sorsolás)
- `total_units`, `max_per_user` (alap: 1)
- `raffle_draw_at` — mikor sorsolunk (csak raffle)
- `hold_minutes` (alap: 10) — kosárfoglalás ideje
- `require_captcha` (bool, alap: true)
- `status`: `scheduled` / `open` / `closed` / `drawn` / `sold_out`
- `hero_image_url`, `teaser_text`

**`drop_notifications`** — „értesíts indulás előtt"
- `drop_id`, `user_id?`, `email`, `phone?`, `notified_at?`, `channels[]`

**`drop_raffle_entries`** — raffle jelentkezők
- `drop_id`, `user_id`, `email`, `entered_at`
- `captcha_verified` (bool), `ip_hash`, `fingerprint_hash`
- `is_winner` (bool), `winner_position?`, `won_at?`
- `checkout_deadline?` — meddig kell fizetnie a nyertesnek
- `checkout_completed_at?`, `order_id?`
- UNIQUE(`drop_id`, `user_id`) — egy user egy jelentkezés

**`drop_reservations`** — first_come várósor / kosárfoglalás
- `drop_id`, `user_id?`, `session_id`, `queue_position`
- `reserved_at`, `expires_at` (reserved_at + hold_minutes)
- `status`: `queued` / `active` / `expired` / `purchased`
- `variant_id?`, `quantity`
- `order_id?`

**`drop_events`** — audit napló
- `drop_id`, `event_type` (`viewed` / `entered_raffle` / `won` / `reserved` / `expired` / `purchased` / `bot_blocked`)
- `user_id?`, `session_id?`, `ip_hash?`, `payload jsonb`

### 2. Edge functions

- **`drop-enter-raffle`** — raffle jelentkezés, captcha-t ellenőrzi, duplikációt blokkolja, IP+fingerprint alapján gyanús mintázatot log-ol
- **`drop-reserve`** — first_come kosárfoglalás: atomikus SELECT FOR UPDATE + `total_units` csökkentés, `expires_at` beállítás
- **`drop-draw-raffle`** — cron: raffle_draw_at időpontban lefut, véletlen `winner_position`-t oszt, e-mailt küld, `checkout_deadline`-t állít
- **`drop-cleanup`** — 1 perces cron: lejárt reservation-öket visszaad a készletbe, nem fizető raffle nyerteseket kiléptet, kioszt új nyerteseket a várólistából
- **`drop-notify-launch`** — 15 perccel a `starts_at` előtt push+email értesítés

### 3. Botvédelem

**Cloudflare Turnstile** — ingyenes, invisible captcha:
- Frontend: `@marsidev/react-turnstile` widget
- Backend: token ellenőrzés `https://challenges.cloudflare.com/turnstile/v0/siteverify`-nél
- Secret: `TURNSTILE_SECRET_KEY` és `VITE_TURNSTILE_SITE_KEY` (add_secret-tel bekérem, ha még nincs)
- Rate limit: user_id/session_id/ip_hash alapján, dynamic a `product_drops`-ról olvasva
- Gyanús fingerprint duplikációk (több user_id ugyanazzal az fp_hash-sel) → `fraud_signals` bejegyzés

### 4. Frontend

**Public (vásárló):**
- `src/pages/DropDetail.tsx` (útvonal: `/drop/:slug`)
  - Nagy hero + countdown (`react-countdown` vagy saját)
  - Az állapot szerint váltakozik:
    - `scheduled` → „Értesítést kérek" gomb + Turnstile
    - `open` + `first_come` → „Kosárba" gomb → átirányít checkoutra a foglalással
    - `open` + `raffle` → „Jelentkezem" gomb + captcha
    - `drawn` → „Nyertem/Nem nyertem" állapot, nyerteseknek fizetési gomb visszaszámlálóval
    - `sold_out` / `closed` → várólistára feliratkozás
- `src/components/DropCountdown.tsx` — live countdown, óra:perc:mp
- `src/components/DropQueueStatus.tsx` — várósor / foglalás állapota realtime
- Home banner integráció: aktív dropok kártyája `Index.tsx`-en

**Admin/Partner:**
- `src/components/admin/AdminDropsTab.tsx` — dropok listája + szerkesztő
  - Termék választó, dátum-idő, type, mennyiség, hold_minutes
  - Élő statisztikák: raffle jelentkezők, foglalások, konverzió
  - Manuális raffle húzás gomb (ha `raffle_draw_at` nincs elérve)
  - Résztvevők listája CSV export
- Bekerül az admin panel routing-jába lazy import-tal
- Partner portál: `PartnerDropsTab.tsx` a saját termékeikre

### 5. Emailek

Új tranzakciós template-ek (`supabase/functions/_shared/transactional-email-templates/`):
- `drop-launch-reminder.tsx` — indulás előtt
- `drop-raffle-entered.tsx` — sikeres jelentkezés
- `drop-raffle-winner.tsx` — nyertél! + fizetési link + deadline
- `drop-raffle-not-selected.tsx` — sajnos nem
- `drop-reservation-expiring.tsx` — 2 perc a lejáratig

### 6. Cron job-ok

`pg_cron` (nem migration, hanem az insert eszközzel, mert URL/anon key kell):
- Percenkénti `drop-cleanup`
- 5 percenkénti `drop-draw-raffle` (a raffle_draw_at időpontokhoz)
- 5 percenkénti `drop-notify-launch` (T-15 perc értesítők)

### 7. Végrehajtási sorrend

1. **Titkok**: `TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY` bekérése (add_secret)
2. **Migration**: 5 új tábla + GRANT + RLS + policy + trigger-ek
3. **Edge functions**: enter-raffle, reserve, draw, cleanup, notify-launch
4. **Cron beállítás** insert eszközzel
5. **Email template-ek** + `send-transactional-email` bővítése
6. **Frontend**: DropDetail oldal + komponensek + admin tab + partner tab
7. **Integráció**: Homepage banner, `App.tsx` routing, `Checkout.tsx` foglalás-tudatos flow
8. **Teszt**: E2E — 1 első-jött-elsőt-kap drop + 1 raffle drop end-to-end

### Technikai megjegyzések

- `drop_reservations`.`total_units` decrement race condition ellen: `UPDATE product_drops SET reserved_count = reserved_count + 1 WHERE reserved_count < total_units RETURNING *` (soronkénti lock)
- Raffle húzás: `ORDER BY random()` a `captcha_verified = true`-ra szűrt jelentkezőkre, `LIMIT total_units`
- Nyertes lejárat után új húzás a maradék jelentkezőkből (waitlist)
- `session_id` a `sessionStorage`-ból, kliens-oldali fingerprint egy `@fingerprintjs/fingerprintjs` open-source verzióval (`fingerprintjs-pro-react` nélkül)
- Realtime: `product_drops`, `drop_reservations` táblákra REPLICA IDENTITY FULL + publikáció → live queue status
- A meglévő `AI Rules Engine` NEM ad árualkut drop termékre (új szabály: `blocked_categories += 'drop'`)

### Nem-technikai összefoglaló

- Az admin időzíthet exkluzív drop-okat, elsőjöttelső vagy sorsolásos módon.
- A vásárlók kérhetnek értesítést az indulás előtt, jelentkezhetnek raffle-re, vagy azonnal foglalhatnak.
- Bot-védelem védi a drop-okat automatizált vásárlástól.
- Nyertesnek van egy fix idő fizetni, különben új nyertest húzunk.
- Minden esemény naplózásra kerül későbbi elemzéshez.
