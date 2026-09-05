# AI RENDSZER — BIZTONSÁGI AUDIT + RUNTIME TESZT

Dátum: 2026-09-04 · Minden PASS valós futásidejű hívás eredménye. Ami nem lett bizonyítva, az NOT VERIFIED.

## FÁZIS 1 — Talált és javított hibák

| # | Súly | Hiba | Javítás | Bizonyíték |
|---|---|---|---|---|
| 1 | P0 | `partner-workflow-engine` teljesen hitelesítés nélkül futott service_role joggal | JWT hitelesítés, admin/partner feloldás, tulajdonjog-ellenőrzés, dispatch csak belső/admin, UUID + prompt hossz validáció | anon=401, B partner → A workflow=403, dispatch=403, rossz UUID=400 |
| 2 | P1 | `drop-cleanup` hitelesítés nélkül hívható volt | `requireInternalOrAdmin` + cron titok | anon=401; cron=200 |
| 3 | P1 | `ai-self-reflect` nyitott volt | guard | anon=401 |
| 4 | P1 | `ai-knowledge-consolidate-cron` nyitott volt | guard + cron titok | anon=401; cron=200 |
| 5 | P1 | `tts-cleanup` nyitott volt | guard + cron titok | anon=401; cron=200 |
| 6 | P1 | `ar-style-recommend`, `shopping-assistant` korlátlan anonim AI-hívás | DB-alapú IP rate limit | 429 futásidőben |
| 7 | P2 | Agent Bus webhook dispatch hitelesítés nélkül hívta a saját függvényeket | belső célra service_role fejléc, külső URL-re SOHA nem megy titok | dispatch 200 |
| 8 | P2 | Memóriaalapú rate limit izolátumok között hatástalan | DB-alapú `rateLimitDb` | 3× 429 |

## FÁZIS 2 — Kerülő útvonalak keresése (új találatok)

| # | Súly | Új hiba | Javítás | Runtime bizonyíték |
|---|---|---|---|---|
| 9 | **P1** | `ai-agent-run` (8 AI ügynök, service_role, DB írás) **gyenge, kitalálható belső titkot** fogadott el: `lovable_cron_2026` — bárki futtathatta az összes AI ügynököt (AI-kredit égetés + adatbázis-írás) | `requireInternalOrAdmin` (konstans idejű összevetés, erős titok), 8 cron job titkának rotálása | anon=401, régi gyenge titok=403, anon-key JWT=401, hibás JWT=401 |
| 10 | **P1** | `drop-notify-launch` hitelesítés nélkül hívható volt, service_role joggal **tömeges e-mailt küldött** a feliratkozóknak (spam / költség-abúzus) | `requireInternalOrAdmin` | anon=401, hibás titok=403 |
| 11 | P2 | `smart-cart-suggestions` csak memóriaalapú rate limitet használt (izolátumok között kikerülhető) | DB-alapú `rateLimitDb` (30/perc/IP) | 40 párhuzamos kérésből 20× 429 |
| 12 | P2 | `track-shipment` publikus, rate limit nélkül → tracking szám felderítés | `rateLimitDb` (20/perc/IP) | 20× 404, majd 429 |

## FÁZIS 2 teszt mátrix

| Teszt | Eredmény | Bizonyíték |
|---|---|---|
| Auth bypass regresszió (20 AI endpoint: anon / anon-key / hibás JWT / hiányzó header) | PASS | mind 401, egyetlen kivétel sem |
| Gyenge cron titok (replay a régi titokkal) | PASS | 403 „Érvénytelen belső titok” |
| Cron security (hibás / hiányzó / módosított titok) | PASS | 401 / 403 |
| service_role escape audit (96 függvény átvizsgálva) | PASS | minden privilegizált AI függvény mögött guard; 2 új rés lezárva |
| AI tool escape (unknown action, foreign UUID, execute/rollback/approve anonim) | PASS | 401 / 400, nincs privilegizált végrehajtás |
| Prompt injection FÁZIS 2 (secret extraction, admin claim + tool call, cross-tenant ID, encoded) | PASS | valódi modellválasz, 0 secret-minta, nincs tool abuse |
| Input limits (üres, malformed JSON, null, string-objektum helyett, 5000 elemű tömb, 200 mély nested, rossz UUID) | PASS | 200/400, nincs 500, nincs crash |
| Rate limit evasion (párhuzamos + hamisított X-Forwarded-For, több endpoint) | PASS | 429 párhuzamos terhelésnél is |
| Race condition (ugyanaz a privilegizált action ×10 párhuzamosan) | PASS | 10/10 401, nincs duplikált végrehajtás |
| Error leakage (6 endpoint hibaválasza) | PASS | 0 találat: nincs stack trace, kulcs, DB URL, provider credential |
| Tenant isolation (Partner B → Partner A workflow) | PASS | 403 (FÁZIS 1 runtime) |
| AI memory izoláció | PASS | partner-scoped RLS + 403 cross-tenant |
| Audit logging (actor / tenant / action / resource / eredmény, secret nélkül) | PASS | `partner_workflow_runs`, `ai_meta_audit_log` |
| Rollback | PASS | korábbi fázis runtime bizonyítékkal |
| AI Builder end-to-end | PASS | QA 92/100, IMP-2026-09-01-100 (93→95) |
| Regresszió: TypeScript | PASS | 0 hiba |
| Regresszió: unit/integration | PASS | 67/67 (8 fájl) |

## Összegzés

- **P0: 0**
- **P1: 0** (2 új találat javítva és runtime-mal bizonyítva: `ai-agent-run` gyenge titok, `drop-notify-launch` nyitott tömeges e-mail)
- **P2: 0** (2 új találat javítva: smart-cart + track-shipment rate limit)
- **External blocker:** Stripe payment E2E (lejárt connector kulcs) — változatlanul NOT VERIFIED
- **Fixed (FÁZIS 2):** ai-agent-run auth + 8 cron job titok-rotáció, drop-notify-launch guard, smart-cart-suggestions és track-shipment elosztott rate limit
- **New findings:** 2× P1, 2× P2 — mind javítva, deployolva, exploit-teszttel visszaellenőrizve
- **QA adat:** NEM lett törölve

Státusz: **CONDITIONALLY PRODUCTION READY** — az AI-réteg runtime-mal bizonyítottan zárt (másodlagos és kerülő útvonalakkal együtt); egyedüli nyitott pont a fizetési connector.
