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

---

# AI SECURITY — FINAL REGRESSION (Phase 3)
Dátum: 2026-09-05 (UTC) · Módszer: valós runtime hívások a deployolt Edge Functionökre, két izolált QA partner munkamenettel (Partner A `847dd052…1926` / Partner B `33546b6f…c271`).

## 1. Old secret negative test — `ai-agent-run` (PASS)
| Hívás | Eredmény |
|---|---|
| régi secret `x-cron-secret: lovable_cron_2026` | 403 `Érvénytelen belső titok` |
| üres secret | 401 |
| rossz secret (`wrong`) | 403 |
| módosított secret (`lovable_cron_2027`) | 403 |
| hiányzó header | 401 |
| anon publishable kulcs | 401 |
| malformed JWT | 401 |
| rossz headernév (`x-internal-secret`) | 401 |

## 2. Agent launcher authorization (PASS)
| Hívás | Eredmény |
|---|---|
| anon | 401 |
| normál user JWT | 403 `Adminisztrátori jogosultság szükséges` |
| user JWT + body-ban `role:"admin"`, `is_admin:true`, idegen `partner_id` | 403 (body-ból nem emelhető jogosultság) |

## 3. Email sender regression — `send-transactional-email` / `drop-notify-launch` (PASS)
| Hívás | Eredmény |
|---|---|
| `drop-notify-launch` anon | 401 |
| `drop-notify-launch` normál user | 403 |
| `drop-notify-launch` régi cron secret | 403 |
| `send-transactional-email` anon (auth header nélkül) | 401 |
| invalid JWT | 401 `UNAUTHORIZED_INVALID_JWT_FORMAT` |
| user → tetszőleges címzett | 403 `Nincs jogosultság más címzettnek e-mailt küldeni` |
| user → saját cím | 200 (self ág, suppression működik) |
| anon + privát sablon | 401 |
| anon + publikus sablon, nem bizonyított címzett | 403 |
| ismeretlen / path-traversal sablonnév | 404 (nincs fájlrendszer-hozzáférés) |
| auth szolgáltatás degradált állapotban | 401 (fail-closed, nem küld) |

## 4. AI tool / action regression — `partner-action-engine`, `partner-workflow-engine` (PASS)
| Hívás | Eredmény |
|---|---|
| action-engine anon | 401 |
| A → saját partner `propose` | 200 (jogos) |
| B → A `propose/approve/execute/rollback/rollback_preview/delete_all` | mind 403 `not_partner` |
| A → nem létező plan `approve/rollback` | 404 |
| ismeretlen action | 400 `unknown_action` |
| idegen UUID partner_id | 403 |
| workflow `run` anon | 401 |
| workflow `dispatch` user JWT-vel | 403 `Csak belső hívó indíthat szétosztást` |
| workflow ismeretlen action | 400 |
| workflow érvénytelen UUID | 400 |

## 5. Cron / internal auth review (PASS)
`ai-self-reflect`, `tts-cleanup`, `drop-cleanup`, `ai-knowledge-consolidate-cron`: anon → 401, normál user JWT → 403. Minden ütemezett job az erős belső titkot használja (a korábbi kitalálható titok 0 jobban maradt).

## 6. Input limits / error leakage (PASS, 1 javítással)
| Bemenet | Előtte | Utána |
|---|---|---|
| `null` body | **500 + belső hibaüzenet** | 400 `partner_id required` |
| tömb / malformed JSON | 400 | 400 |
| nem-UUID partner_id | 403 | 400 (UUID validáció) |
| 60 000 karakteres prompt | elfogadva | cél 500 karakterre vágva, UUID-gate előtte |
Hibaválaszokban nem jelent meg stack trace, API kulcs, service_role kulcs, belső URL vagy adatbázis-adat.

## 7. Új találatok és javítások ebben a fázisban
- **P2 – belső hibaüzenet szivárgás** (`partner-action-engine`): a catch ág a nyers hibaüzenetet adta vissza, és `null` body 500-at okozott. Javítva: `internal_error`, szigorú body/UUID validáció. Deployolva, runtime-mal ellenőrizve.
- **P2 – rate limit fail-open** (`_shared/internal-auth.ts`): adatbázis-hiba esetén a korlátozó teljesen kikapcsolt. Javítva: memóriaalapú tartalék korlátozásra esik vissza (fail-safe). Deployolva.

## 8. Végső mátrix — AI Security Final Regression
| Teszt | Eredmény | Bizonyíték |
|---|---|---|
| Old secret negative test | PASS | runtime 401/403 |
| Agent launcher authorization | PASS | runtime 401/403 |
| Email sender authorization | PASS | runtime 401/403/404 |
| Email mass-send / arbitrary recipient | PASS | runtime 403 |
| AI tool / privileged action security | PASS | runtime 401/403/400/404 |
| Tenant isolation (B → A) | PASS | runtime 403 minden actionre |
| Cron / internal auth | PASS | runtime 401/403 |
| Input limits | PASS | runtime 400 |
| Error leakage | PASS | válaszok ellenőrizve |
| Race condition (párhuzamos privilegizált hívás) | PASS | 5 párhuzamos hívás, mind elutasítva, nincs duplikált végrehajtás |
| TypeScript | PASS | 0 hiba |
| Unit/integration tesztek | PASS | 67/67 |
| Rate limiting (429) | **NOT VERIFIED (ebben a körben)** | a háttéradatbázis ismételt kiesése (503 PGRST002 / pooler unavailable) miatt a DB-alapú számláló nem volt reprodukálhatóan tesztelhető; a `hit_rate_limit` függvény közvetlen hívása helyesen adott `false`-t a limit felett |
| Prompt injection (teljes 10 pontos újrafuttatás) | NOT VERIFIED (ebben a körben) | a Phase 2-ben futott 7/7 + kombinált tesztek PASS-ok, most a háttérkiesés miatt nem futtatható újra |
| AI Builder end-to-end | NOT VERIFIED (ebben a körben) | háttérkiesés |

## 9. Összegzés
- **P0: 0**
- **P1: 0**
- **P2: 2 — mindkettő javítva és deployolva** (belső hibaüzenet szivárgás, rate limit fail-open)
- **Fixed findings:** partner-action-engine hibakezelés + input validáció, rate limiter fail-safe tartalék
- **New findings:** nincs P0/P1 szintű új találat
- **External blockers:** (1) ismétlődő háttéradatbázis-kiesés (503 PGRST002 / pooler unavailable) — emiatt a rate limit 429, a prompt injection újrafuttatás és az AI Builder E2E ebben a körben NOT VERIFIED; (2) lejárt Stripe credential — a bankkártyás fizetés végpontig tesztje továbbra is külön, AI-tól független NOT VERIFIED tétel.
- **Státusz:** az AI Security regresszió kritikus authorization / tenant isolation / secret-kezelési részei runtime-mal bizonyítottan PASS. Mivel három terület NOT VERIFIED maradt, a rendszer **NEM** minősül production readynek — státusz: CONDITIONALLY PRODUCTION READY.
- QA adat nem lett törölve.
