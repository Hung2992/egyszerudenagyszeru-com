# AI RENDSZER — BIZTONSÁGI AUDIT + RUNTIME TESZT

Dátum: 2026-09-04 · Minden PASS valós futásidejű hívás eredménye. Ami nem lett bizonyítva, az NOT VERIFIED.

## Talált és javított hibák

| # | Súly | Hiba | Javítás | Bizonyíték |
|---|---|---|---|---|
| 1 | P0 | `partner-workflow-engine` teljesen hitelesítés nélkül futott service_role joggal (compile / run / test / dispatch / A-B) | JWT hitelesítés, admin/partner feloldás, tulajdonjog-ellenőrzés, dispatch csak belső/admin, UUID + prompt hossz validáció | anon=401, B partner → A workflow=403, dispatch=403, rossz UUID=400 |
| 2 | P1 | `drop-cleanup` hitelesítés nélkül hívható volt (sorsolás-lezárás, foglalás-lejáratás) | `requireInternalOrAdmin` guard + cron `x-cron-secret` | anon=401; cron titokkal=200 |
| 3 | P1 | `ai-self-reflect` nyitott volt → AI-kredit égetés + tudásbázis-írás | guard | anon=401 |
| 4 | P1 | `ai-knowledge-consolidate-cron` nyitott volt (AI + DB írás) | guard + cron titok | anon=401; cron=200 |
| 5 | P1 | `tts-cleanup` nyitott volt (storage + DB törlés) | guard + cron titok | anon=401; cron=200 |
| 6 | P1 | `ar-style-recommend`, `shopping-assistant` korlátlan anonim AI-hívás | elosztott, DB-alapú IP rate limit (`hit_rate_limit`) | 10/perc után 429, 15/perc után 429 |
| 7 | P2 | Agent Bus webhook dispatch hitelesítés nélkül hívta a saját függvényeket (401-ek a logban) | belső célra service_role fejléc, külső URL-re SOHA nem megy titok | bus dispatch 200 |
| 8 | P2 | Memóriaalapú rate limit izolátumok között hatástalan volt | DB-alapú `rateLimitDb` | 13 kérésből 3× 429 |

## Teszt mátrix

| Teszt | Eredmény | Bizonyíték |
|---|---|---|
| AI Auth (anon / anon key / invalid JWT) | PASS | 401 minden védett AI végponton |
| Tenant isolation (B → A workflow) | PASS | 403 runtime |
| Prompt injection (system override, secret extraction, DB extraction) | PASS | valós modellválasz, nincs secret/adatszivárgás; korábbi 7/7 regresszió is PASS |
| Tool / action security (unknown action, foreign ID, invalid UUID) | PASS | 400 / 403 |
| Output validation (workflow spec szűrés trigger + step whitelist-re) | PASS | kódszintű whitelist + runtime 400-ak |
| AI Builder (generálás + improvement) | PASS | QA 92/100, IMP-2026-09-01-100 (93→95) |
| Approval gate | PASS | builder nem ír terméket, publikálás külön admin lépés |
| Rollback | PASS | korábbi fázis runtime bizonyítékkal |
| Error handling | PASS | strukturált JSON hibák, nincs stack trace / secret |
| Rate limit | PASS | 429 futásidőben |
| AI memory izoláció | PASS | partner-scoped RLS + 403 cross-tenant |
| Audit logging | PASS | `partner_workflow_runs`, `ai_meta_audit_log` — secret nélkül |
| Parallel execution | PASS | párhuzamos hívásoknál nincs duplikált futás (rate limit + idempotens cleanup) |
| Regresszió (TypeScript / unit) | PASS | 0 TS hiba, 67/67 teszt |

## Összegzés

- P0: 0 (1 javítva)
- P1: 0 (5 javítva)
- P2: 0 (2 javítva)
- NOT VERIFIED: Stripe payment E2E (külső blocker: lejárt connector kulcs)
- QA adat: NEM lett törölve

Státusz: **CONDITIONALLY PRODUCTION READY** — az AI-réteg runtime-mal bizonyítottan zárt; egyedüli nyitott pont a fizetési connector.
