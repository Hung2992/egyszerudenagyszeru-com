## Terv: Domain bizonyíték verziózás, auto DNS recheck, audit szűrés/CSV, e-mail értesítések

### 1. DNS bizonyíték + státusz verziózás (timeline)
- Új tábla: `partner_domain_proof_versions` (id, request_id, partner_id, version_no, dns_proof_url, partner_self_reported_status, dns_check_status, dns_check_result jsonb, note, created_at, created_by).
- Trigger `partner_domain_requests` UPDATE-re: ha `dns_proof_url`, `dns_check_status`, `dns_check_result` vagy `partner_self_reported` változik → új sor a verzió táblába (auto-increment `version_no` per request).
- `PartnerDomainTab`: új "Bizonyíték verziók" collapsible — lista időponttal, állapot badge-ekkel, proof letöltés link.
- Admin (`PartnerApprovalsPanel` domain szekció): timeline komponens (egymás melletti két verzió kiválaszthatóan, diff: status / proof preview / result jsonb). Jóváhagyás gomb előtt látható.

### 2. Automatikus DNS recheck + változás-értesítés
- `pg_cron` job: 30 percenként hívja a `verify-partner-domain-dns` edge functiont minden `pending` vagy `verifying` státuszú request-re (warmup mód: `{ scheduled: true }` body, függvény végigiterál).
- `verify-partner-domain-dns` bővítés: scheduled módban listázza a nyitott kéréseket, futtatja a checket, ha a `dns_check_status` MEGVÁLTOZIK (pl. `failed` → `verified` vagy fordítva), beír egy `admin_notifications` sort + meghívja `send-transactional-email`-t a partnernek (`domain-dns-status-changed` template).
- Új mező `partner_domain_requests.last_auto_check_at`, `auto_check_enabled` (default true, partner kikapcsolhatja).

### 3. Audit napló keresés/szűrés + CSV export (admin)
- Új admin oldal-szekció vagy bővítés a `PartnerApprovalsPanel`-ben: "Audit napló" tab.
- Szűrők: partner select (autocomplete), domain szöveg, akció multi-select, dátum tartomány (from/to), aktor user.
- Lekérdezés `partner_storefront_audit_log` + join `partners` és `partner_domain_requests` a `requested_domain`-ért (vagy az audit log `note`/`changed_fields`-ből).
- Eredmény táblázat lapozással (50/oldal).
- "CSV letöltés" gomb: kliens oldalon összeállítja a szűrt találatokból a CSV-t (`Blob` + `URL.createObjectURL`), oszlopok: created_at, action, partner_id, partner_name, storefront_id, actor_user_id, actor_role, ip, changed_fields, note.

### 4. E-mail értesítések partnernek
- Új transactional template-ek (`supabase/functions/_shared/transactional-email-templates/`):
  - `partner-domain-approved.tsx` — domain jóváhagyva (CTA: portál link).
  - `partner-domain-rejected.tsx` — domain elutasítva + admin indoklás.
  - `partner-domain-dns-status-changed.tsx` — DNS státusz változás (verified/failed) automata check-ből.
  - `partner-storefront-version-submitted.tsx` — partner új verziót küldött be jóváhagyásra (megerősítés a partnernek).
- Registry frissítése.
- Trigger pontok:
  - Admin a `PartnerApprovalsPanel`-ben jóváhagy/elutasít domaint → meghívja a `send-transactional-email`-t a megfelelő template-tel (partner e-mail a `partners.contact_email`-ből).
  - `StorefrontEditorTab` "Publikálás kérés" gomb → submit után `partner-storefront-version-submitted` küldés.
  - `verify-partner-domain-dns` scheduled módban státusz változáskor `partner-domain-dns-status-changed`.

### Technikai részletek
- **1 migráció**: új tábla `partner_domain_proof_versions` (RLS + GRANT), új oszlopok `partner_domain_requests`-en, trigger, pg_cron job a recheck-re.
- **1 edge function módosítás**: `verify-partner-domain-dns` (scheduled batch mód + state-change értesítés).
- **4 új e-mail template** + registry frissítés.
- **~5 frontend fájl**: `PartnerDomainTab.tsx` (verzió lista, auto_check toggle), `PartnerApprovalsPanel.tsx` (timeline + audit szűrő tab + e-mail trigger jóváhagyáskor), új `DomainProofTimeline.tsx`, új `AuditLogSearchTab.tsx`, `StorefrontEditorTab.tsx` (publikálás kéréskor e-mail).
- Prereq: email infra már létezik (`send-transactional-email` deployed).

### Amit NEM csinálunk
- Nem építünk vizuális diff-et a proof képekhez (csak egymás mellé jelenít meg).
- Auto-check nem fut sűrűbben 30 percnél (rate-limit / DNS lookup költség).
- Marketing/bulk e-mail nincs — kizárólag tranzakciós, egy esemény → egy címzett.
