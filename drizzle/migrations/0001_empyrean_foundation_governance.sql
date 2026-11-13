-- EMPYREAN ∞ BLACK CROWN — FOUNDATION governed execution schema
-- Privileged writes flow only through SECURITY DEFINER functions; clients get read access (admin) plus RPC calls.

create table if not exists public.empyrean_capabilities (
  capability text primary key,
  target_table text not null,
  risk_level text not null default 'MEDIUM' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  requires_approval boolean not null default true,
  enabled boolean not null default true,
  max_payload_bytes integer not null default 32768 check (max_payload_bytes > 0),
  allowed_fields text[] not null default '{}',
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.empyrean_actions (
  id uuid primary key default gen_random_uuid(),
  capability text not null references public.empyrean_capabilities(capability) on delete restrict,
  target_table text not null,
  target_id uuid not null,
  tenant_id uuid,
  payload jsonb not null,
  payload_hash text not null,
  base_state jsonb not null,
  base_version text not null,
  state text not null default 'PROPOSED' check (state in ('PROPOSED','VALIDATED','AUTHORIZED','APPROVED','QUEUED','EXECUTING','VERIFIED','REJECTED','CANCELLED','EXPIRED','FAILED','TIMED_OUT','REQUIRES_REVIEW','COMPENSATION_REQUIRED','ROLLED_BACK')),
  agent_slug text,
  created_by uuid not null,
  idempotency_key text unique,
  policy_decision jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists empyrean_actions_state_idx on public.empyrean_actions (state, created_at desc);
create index if not exists empyrean_actions_target_idx on public.empyrean_actions (target_table, target_id);

create table if not exists public.empyrean_approvals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.empyrean_actions(id) on delete cascade,
  approved_by uuid not null,
  payload_hash text not null,
  target_version text not null,
  expires_at timestamptz not null,
  decided_at timestamptz not null default now(),
  decision text not null default 'APPROVED' check (decision in ('APPROVED','REJECTED'))
);

create table if not exists public.empyrean_execution_receipts (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.empyrean_actions(id) on delete cascade,
  executor_id uuid not null,
  executed_at timestamptz not null default now(),
  status text not null default 'EXECUTED' check (status in ('EXECUTED','FAILED','MISMATCH')),
  result jsonb,
  error text,
  rollback_ref jsonb,
  verifier_id uuid,
  verified_at timestamptz,
  verification jsonb,
  evidence_id text
);

create table if not exists public.empyrean_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  agent_slug text,
  action text not null,
  target text,
  detail jsonb
);
create index if not exists empyrean_audit_at_idx on public.empyrean_audit_log (at desc);
create rule empyrean_audit_no_update as on update to public.empyrean_audit_log do instead nothing;
create rule empyrean_audit_no_delete as on delete to public.empyrean_audit_log do instead nothing;

create table if not exists public.empyrean_emergency_controls (
  scope text primary key,
  paused boolean not null default true,
  read_only boolean not null default false,
  reason text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- ── grants (data api needs explicit grants) ────────────────────────────────
grant select on public.empyrean_capabilities to authenticated;
grant update on public.empyrean_capabilities to authenticated;
grant all on public.empyrean_capabilities to service_role;
grant select on public.empyrean_actions to authenticated;
grant all on public.empyrean_actions to service_role;
grant select on public.empyrean_approvals to authenticated;
grant all on public.empyrean_approvals to service_role;
grant select on public.empyrean_execution_receipts to authenticated;
grant all on public.empyrean_execution_receipts to service_role;
grant select on public.empyrean_audit_log to authenticated;
grant all on public.empyrean_audit_log to service_role;
grant select on public.empyrean_emergency_controls to authenticated;
grant all on public.empyrean_emergency_controls to service_role;
revoke all on public.empyrean_capabilities from anon;
revoke all on public.empyrean_actions from anon;
revoke all on public.empyrean_approvals from anon;
revoke all on public.empyrean_execution_receipts from anon;
revoke all on public.empyrean_audit_log from anon;
revoke all on public.empyrean_emergency_controls from anon;

-- ── rls: admin reads, nothing is written directly by clients ───────────────
alter table public.empyrean_capabilities enable row level security;
alter table public.empyrean_actions enable row level security;
alter table public.empyrean_approvals enable row level security;
alter table public.empyrean_execution_receipts enable row level security;
alter table public.empyrean_audit_log enable row level security;
alter table public.empyrean_emergency_controls enable row level security;

create policy "Empyrean admins read capabilities" on public.empyrean_capabilities
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins manage capabilities" on public.empyrean_capabilities
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins read actions" on public.empyrean_actions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins read approvals" on public.empyrean_approvals
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins read receipts" on public.empyrean_execution_receipts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins read audit" on public.empyrean_audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Empyrean admins read emergency controls" on public.empyrean_emergency_controls
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── seed ───────────────────────────────────────────────────────────────────
insert into public.empyrean_capabilities (capability, target_table, risk_level, requires_approval, enabled, allowed_fields, description)
values ('product_seo.update', 'partner_products', 'MEDIUM', true, true,
        array['title','description','category','tags'],
        'Termék SEO tartalom (cím, leírás, kategória, címkék) kontrollált módosítása')
on conflict (capability) do update
  set allowed_fields = excluded.allowed_fields, description = excluded.description;

insert into public.empyrean_emergency_controls (scope, paused, read_only, reason)
values ('global', true, false, 'FOUNDATION: a vészleállítás alapértelmezetten aktív; író művelet nem futtatható, amíg egy adminisztrátor fel nem oldja.')
on conflict (scope) do nothing;

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function public.empyrean_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), 'admin') $$;

create or replace function public.empyrean_hash_payload(_payload jsonb)
returns text language sql immutable security definer set search_path = public
as $$ select encode(extensions.digest(coalesce(_payload, '{}'::jsonb)::text, 'sha256'), 'hex') $$;

-- ── propose: read product, capture version, register proposal ──────────────
create or replace function public.empyrean_propose_product_seo(
  _product_id uuid, _proposal jsonb, _idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_cap public.empyrean_capabilities;
  v_row public.partner_products;
  v_base jsonb;
  v_hash text;
  v_action_id uuid;
  v_existing uuid;
  v_key text;
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges a javaslathoz.';
  end if;

  select * into v_cap from public.empyrean_capabilities
   where capability = 'product_seo.update' and enabled;
  if not found then
    raise exception 'EMPYREAN: a product_seo.update capability nincs engedélyezve.';
  end if;

  if _proposal is null or jsonb_typeof(_proposal) <> 'object' then
    raise exception 'EMPYREAN: a javaslatnak JSON objektumnak kell lennie.';
  end if;
  if octet_length(_proposal::text) > v_cap.max_payload_bytes then
    raise exception 'EMPYREAN: a javaslat csomagja túl nagy.';
  end if;
  if not exists (select 1 from jsonb_object_keys(_proposal)) then
    raise exception 'EMPYREAN: üres javaslat nem nyújtható be.';
  end if;

  for v_key in select jsonb_object_keys(_proposal) loop
    if not (v_key = any (v_cap.allowed_fields)) then
      raise exception 'EMPYREAN: a(z) % mező nem módosítható ezen a jogosultságon.', v_key;
    end if;
  end loop;

  if _proposal ? 'title' and (jsonb_typeof(_proposal->'title') <> 'string' or length(trim(_proposal->>'title')) < 3) then
    raise exception 'EMPYREAN: a címnak legalább 3 karakteres szövegnek kell lennie.';
  end if;
  if _proposal ? 'description' and jsonb_typeof(_proposal->'description') not in ('string','null') then
    raise exception 'EMPYREAN: a leírásnak szövegnek kell lennie.';
  end if;
  if _proposal ? 'category' and jsonb_typeof(_proposal->'category') not in ('string','null') then
    raise exception 'EMPYREAN: a kategóriának szövegnek kell lennie.';
  end if;
  if _proposal ? 'tags' and (jsonb_typeof(_proposal->'tags') <> 'array' or exists (select 1 from jsonb_array_elements(_proposal->'tags') t where jsonb_typeof(t) <> 'string')) then
    raise exception 'EMPYREAN: a címkéknek szövegeket tartalmazó tömbnek kell lenniük.';
  end if;

  select * into v_row from public.partner_products where id = _product_id;
  if not found then
    raise exception 'EMPYREAN: a termék nem található.';
  end if;

  if _idempotency_key is not null then
    select id into v_existing from public.empyrean_actions where idempotency_key = _idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  v_base := jsonb_build_object(
    'title', v_row.title,
    'description', v_row.description,
    'category', v_row.category,
    'tags', to_jsonb(v_row.tags),
    'updated_at', v_row.updated_at
  );
  v_hash := public.empyrean_hash_payload(_proposal);

  insert into public.empyrean_actions
    (capability, target_table, target_id, tenant_id, payload, payload_hash, base_state, base_version, state, created_by, idempotency_key, policy_decision)
  values
    ('product_seo.update', 'partner_products', _product_id, v_row.partner_id, _proposal, v_hash, v_base, v_row.updated_at::text, 'PROPOSED', auth.uid(), _idempotency_key,
     jsonb_build_object('capability','product_seo.update','risk_level',v_cap.risk_level,'requires_approval',v_cap.requires_approval,'decision','ALLOWED','checked_at',now()))
  returning id into v_action_id;

  insert into public.empyrean_audit_log (actor_id, agent_slug, action, target, detail)
  values (auth.uid(), null, 'ACTION_PROPOSED', 'partner_products:' || _product_id,
          jsonb_build_object('action_id', v_action_id, 'payload_hash', v_hash, 'base_version', v_row.updated_at::text));

  return v_action_id;
end $$;

-- ── approve: bind approval to exact payload hash + target version ──────────
create or replace function public.empyrean_approve_action(
  _action_id uuid, _payload_hash text, _target_version text, _expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_action public.empyrean_actions;
  v_live_version text;
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges a jóváhagyáshoz.';
  end if;
  if _expires_at is null or _expires_at <= now() then
    raise exception 'EMPYREAN: a jóváhagyás lejárati ideje a jövőben kell legyen.';
  end if;

  select * into v_action from public.empyrean_actions where id = _action_id for update;
  if not found then
    raise exception 'EMPYREAN: a művelet nem található.';
  end if;
  if v_action.state not in ('PROPOSED','VALIDATED','AUTHORIZED','REJECTED') then
    raise exception 'EMPYREAN: ebben az állapotban nem hagyható jóvá a művelet (%).', v_action.state;
  end if;
  if v_action.payload_hash <> _payload_hash then
    raise exception 'EMPYREAN: a jóváhagyott csomag nem egyezik a javaslat csomagjával.';
  end if;
  if v_action.base_version <> _target_version then
    raise exception 'EMPYREAN: a célpont verziója nem egyezik a javaslattal.';
  end if;

  execute format('select updated_at::text from public.%I where id = $1', v_action.target_table)
    into v_live_version using v_action.target_id;
  if v_live_version is null then
    raise exception 'EMPYREAN: a célpont már nem létezik.';
  end if;
  if v_live_version <> _target_version then
    update public.empyrean_actions set state = 'REQUIRES_REVIEW', updated_at = now() where id = _action_id;
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'APPROVAL_STALE_TARGET', v_action.target_table || ':' || v_action.target_id,
            jsonb_build_object('action_id', _action_id, 'expected', _target_version, 'actual', v_live_version));
    raise exception 'EMPYREAN: a termék a javaslat óta módosult; a javaslatot újra ellenőrizni kell.';
  end if;

  insert into public.empyrean_approvals (action_id, approved_by, payload_hash, target_version, expires_at, decision)
  values (_action_id, auth.uid(), _payload_hash, _target_version, _expires_at, 'APPROVED')
  on conflict (action_id) do update
    set approved_by = excluded.approved_by,
        payload_hash = excluded.payload_hash,
        target_version = excluded.target_version,
        expires_at = excluded.expires_at,
        decided_at = now(),
        decision = 'APPROVED';

  update public.empyrean_actions set state = 'APPROVED', updated_at = now() where id = _action_id;

  insert into public.empyrean_audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'ACTION_APPROVED', v_action.target_table || ':' || v_action.target_id,
          jsonb_build_object('action_id', _action_id, 'payload_hash', _payload_hash, 'target_version', _target_version, 'expires_at', _expires_at));
  return true;
end $$;

-- ── execute: revalidate everything, then write through controlled path ─────
create or replace function public.empyrean_execute_action(_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_action public.empyrean_actions;
  v_cap public.empyrean_capabilities;
  v_control public.empyrean_emergency_controls;
  v_approval public.empyrean_approvals;
  v_live_version text;
  v_after jsonb;
  v_receipt_id uuid;
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges a végrehajtáshoz.';
  end if;

  select * into v_control from public.empyrean_emergency_controls where scope = 'global';
  if coalesce(v_control.paused, true) or coalesce(v_control.read_only, false) then
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'EXECUTION_BLOCKED_BY_EMERGENCY_PAUSE', 'empyrean_actions:' || _action_id,
            jsonb_build_object('paused', v_control.paused, 'read_only', v_control.read_only));
    raise exception 'EMPYREAN: a globális vészleállítás aktív — író művelet nem futtatható.';
  end if;

  select * into v_action from public.empyrean_actions where id = _action_id for update;
  if not found then
    raise exception 'EMPYREAN: a művelet nem található.';
  end if;
  if v_action.state = 'VERIFIED' or v_action.state = 'EXECUTING' then
    raise exception 'EMPYREAN: a művelet már végrehajtásra került (%).', v_action.state;
  end if;
  if v_action.state <> 'APPROVED' then
    raise exception 'EMPYREAN: a művelet nincs jóváhagyott állapotban (%).', v_action.state;
  end if;

  select * into v_cap from public.empyrean_capabilities where capability = v_action.capability and enabled;
  if not found then
    raise exception 'EMPYREAN: a jogosultság nincs engedélyezve.';
  end if;

  select * into v_approval from public.empyrean_approvals where action_id = _action_id;
  if not found or v_approval.decision <> 'APPROVED' then
    raise exception 'EMPYREAN: érvényes jóváhagyás nélkül a művelet nem futtatható.';
  end if;
  if v_approval.expires_at <= now() then
    update public.empyrean_actions set state = 'EXPIRED', updated_at = now() where id = _action_id;
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'APPROVAL_EXPIRED', v_action.target_table || ':' || v_action.target_id, jsonb_build_object('action_id', _action_id));
    raise exception 'EMPYREAN: a jóváhagyás lejárt.';
  end if;
  if v_approval.payload_hash <> v_action.payload_hash then
    raise exception 'EMPYREAN: a jóváhagyás nem ehhez a csomaghoz tartozik.';
  end if;

  execute format('select updated_at::text from public.%I where id = $1', v_action.target_table)
    into v_live_version using v_action.target_id;
  if v_live_version is null or v_live_version <> v_action.base_version then
    update public.empyrean_actions set state = 'REQUIRES_REVIEW', updated_at = now() where id = _action_id;
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'EXECUTION_STALE_TARGET', v_action.target_table || ':' || v_action.target_id,
            jsonb_build_object('action_id', _action_id, 'expected', v_action.base_version, 'actual', v_live_version));
    raise exception 'EMPYREAN: a termék a jóváhagyás óta módosult — a művelet ellenőrzést igényel.';
  end if;

  update public.empyrean_actions set state = 'EXECUTING', updated_at = now() where id = _action_id;

  begin
    execute format(
      'update public.%I set
         title = case when $2 ? ''title'' then $2->>''title'' else title end,
         description = case when $2 ? ''description'' then $2->>''description'' else description end,
         category = case when $2 ? ''category'' then $2->>''category'' else category end,
         tags = case when $2 ? ''tags'' then array(select jsonb_array_elements_text($2->''tags'')) else tags end,
         updated_at = now()
       where id = $1
       returning jsonb_build_object(''title'',title,''description'',description,''category'',category,''tags'',to_jsonb(tags),''updated_at'',updated_at)',
      v_action.target_table)
      into v_after using v_action.target_id, v_action.payload;
  exception when others then
    update public.empyrean_actions set state = 'FAILED', updated_at = now() where id = _action_id;
    insert into public.empyrean_execution_receipts (action_id, executor_id, status, error)
    values (_action_id, auth.uid(), 'FAILED', sqlerrm())
    on conflict (action_id) do update set status = 'FAILED', error = excluded.error, executed_at = now();
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'ACTION_FAILED', v_action.target_table || ':' || v_action.target_id,
            jsonb_build_object('action_id', _action_id, 'error', sqlerrm()));
    raise exception 'EMPYREAN: a mentés sikertelen: %', sqlerrm();
  end;

  insert into public.empyrean_execution_receipts (action_id, executor_id, status, result, rollback_ref)
  values (_action_id, auth.uid(), 'EXECUTED', v_after, v_action.base_state)
  on conflict (action_id) do update
    set executor_id = excluded.executor_id, status = 'EXECUTED', result = excluded.result,
        rollback_ref = excluded.rollback_ref, executed_at = now(), error = null;
  select id into v_receipt_id from public.empyrean_execution_receipts where action_id = _action_id;

  insert into public.empyrean_audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'ACTION_EXECUTED', v_action.target_table || ':' || v_action.target_id,
          jsonb_build_object('action_id', _action_id, 'receipt_id', v_receipt_id, 'after', v_after));

  return jsonb_build_object('action_id', _action_id, 'receipt_id', v_receipt_id, 'state', 'EXECUTING', 'after', v_after);
end $$;

-- ── verify: independent read-back by a DIFFERENT admin ─────────────────────
create or replace function public.empyrean_verify_action(_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_action public.empyrean_actions;
  v_receipt public.empyrean_execution_receipts;
  v_actual jsonb;
  v_expected jsonb;
  v_match boolean;
  v_evidence text;
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges az ellenőrzéshez.';
  end if;

  select * into v_action from public.empyrean_actions where id = _action_id for update;
  if not found then
    raise exception 'EMPYREAN: a művelet nem található.';
  end if;
  if v_action.state <> 'EXECUTING' then
    raise exception 'EMPYREAN: csak végrehajtott művelet ellenőrizhető (%).', v_action.state;
  end if;

  select * into v_receipt from public.empyrean_execution_receipts where action_id = _action_id;
  if not found or v_receipt.status <> 'EXECUTED' then
    raise exception 'EMPYREAN: nincs sikeres végrehajtási bizonylat az ellenőrzéshez.';
  end if;
  if v_receipt.executor_id = auth.uid() then
    raise exception 'EMPYREAN: a független ellenőrzést nem a végrehajtó adminisztrátor végezheti el.';
  end if;

  execute format('select jsonb_build_object(''title'',title,''description'',description,''category'',category,''tags'',to_jsonb(tags)) from public.%I where id = $1', v_action.target_table)
    into v_actual using v_action.target_id;
  if v_actual is null then
    raise exception 'EMPYREAN: a célpont már nem olvasható.';
  end if;

  v_expected := (v_action.base_state || v_action.payload) - 'updated_at';
  select bool_and(v_actual -> k.key is not distinct from v_expected -> k.key)
    into v_match
    from (select jsonb_object_keys(v_expected) as key) k;
  v_evidence := 'sha256:' || encode(extensions.digest(v_actual::text, 'sha256'), 'hex');

  if coalesce(v_match, false) then
    update public.empyrean_execution_receipts
       set verifier_id = auth.uid(), verified_at = now(),
           verification = jsonb_build_object('expected', v_expected, 'actual', v_actual, 'matched', true),
           evidence_id = v_evidence
     where id = v_receipt.id;
    update public.empyrean_actions set state = 'VERIFIED', updated_at = now() where id = _action_id;
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'ACTION_VERIFIED', v_action.target_table || ':' || v_action.target_id,
            jsonb_build_object('action_id', _action_id, 'evidence_id', v_evidence, 'executor_id', v_receipt.executor_id));
    return jsonb_build_object('action_id', _action_id, 'state', 'VERIFIED', 'evidence_id', v_evidence, 'actual', v_actual);
  else
    update public.empyrean_execution_receipts
       set status = 'MISMATCH', verifier_id = auth.uid(), verified_at = now(),
           verification = jsonb_build_object('expected', v_expected, 'actual', v_actual, 'matched', false)
     where id = v_receipt.id;
    update public.empyrean_actions set state = 'REQUIRES_REVIEW', updated_at = now() where id = _action_id;
    insert into public.empyrean_audit_log (actor_id, action, target, detail)
    values (auth.uid(), 'ACTION_VERIFICATION_MISMATCH', v_action.target_table || ':' || v_action.target_id,
            jsonb_build_object('action_id', _action_id, 'expected', v_expected, 'actual', v_actual));
    raise exception 'EMPYREAN: az ellenőrzés nem erősítette meg a várt eredményt.';
  end if;
end $$;

-- ── rollback: restore captured base state ──────────────────────────────────
create or replace function public.empyrean_rollback_action(_action_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_action public.empyrean_actions;
  v_receipt public.empyrean_execution_receipts;
  v_base jsonb;
  v_restored jsonb;
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges a visszaállításhoz.';
  end if;

  select * into v_action from public.empyrean_actions where id = _action_id for update;
  if not found then
    raise exception 'EMPYREAN: a művelet nem található.';
  end if;
  if v_action.state not in ('EXECUTING','VERIFIED','REQUIRES_REVIEW','FAILED') then
    raise exception 'EMPYREAN: ebben az állapotban nem állítható vissza a művelet (%).', v_action.state;
  end if;

  select rollback_ref into v_base from public.empyrean_execution_receipts where action_id = _action_id;
  v_base := coalesce(v_base, v_action.base_state);
  if v_base is null then
    raise exception 'EMPYREAN: nincs mentett kiinduló állapot a visszaállításhoz.';
  end if;

  execute format(
    'update public.%I set
       title = coalesce($2->>''title'', title),
       description = case when $2 ? ''description'' then $2->>''description'' else description end,
       category = case when $2 ? ''category'' then $2->>''category'' else category end,
       tags = case when $2 ? ''tags'' then array(select jsonb_array_elements_text($2->''tags'')) else tags end,
       updated_at = now()
     where id = $1
     returning jsonb_build_object(''title'',title,''description'',description,''category'',category,''tags'',to_jsonb(tags),''updated_at'',updated_at)',
    v_action.target_table)
    into v_restored using v_action.target_id, v_base;

  update public.empyrean_actions set state = 'ROLLED_BACK', updated_at = now() where id = _action_id;
  insert into public.empyrean_audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'ACTION_ROLLED_BACK', v_action.target_table || ':' || v_action.target_id,
          jsonb_build_object('action_id', _action_id, 'restored', v_restored));
  return jsonb_build_object('action_id', _action_id, 'state', 'ROLLED_BACK', 'restored', v_restored);
end $$;

-- ── emergency control ──────────────────────────────────────────────────────
create or replace function public.empyrean_set_pause(_paused boolean, _reason text default null)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.empyrean_is_admin() then
    raise exception 'EMPYREAN: adminisztrátori jogosultság szükséges a vészleállításhoz.';
  end if;
  update public.empyrean_emergency_controls
     set paused = _paused, reason = coalesce(_reason, reason), updated_by = auth.uid(), updated_at = now()
   where scope = 'global';
  insert into public.empyrean_audit_log (actor_id, action, target, detail)
  values (auth.uid(), case when _paused then 'EMERGENCY_PAUSE_ENGAGED' else 'EMERGENCY_PAUSE_RELEASED' end, 'global',
          jsonb_build_object('paused', _paused, 'reason', _reason));
  return true;
end $$;

-- ── snapshot for the control plane UI ──────────────────────────────────────
create or replace function public.empyrean_action_snapshot(_action_id uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'action', to_jsonb(a),
    'approval', (select to_jsonb(ap) from public.empyrean_approvals ap where ap.action_id = a.id),
    'receipt', (select to_jsonb(r) from public.empyrean_execution_receipts r where r.action_id = a.id)
  )
  from public.empyrean_actions a
  where a.id = _action_id
    and public.has_role(auth.uid(), 'admin')
$$;

-- ── function grants ────────────────────────────────────────────────────────
revoke all on function public.empyrean_is_admin() from public;
revoke all on function public.empyrean_hash_payload(jsonb) from public;
revoke all on function public.empyrean_propose_product_seo(uuid, jsonb, text) from public;
revoke all on function public.empyrean_approve_action(uuid, text, text, timestamptz) from public;
revoke all on function public.empyrean_execute_action(uuid) from public;
revoke all on function public.empyrean_verify_action(uuid) from public;
revoke all on function public.empyrean_rollback_action(uuid) from public;
revoke all on function public.empyrean_set_pause(boolean, text) from public;
revoke all on function public.empyrean_action_snapshot(uuid) from public;

grant execute on function public.empyrean_propose_product_seo(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.empyrean_approve_action(uuid, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.empyrean_execute_action(uuid) to authenticated, service_role;
grant execute on function public.empyrean_verify_action(uuid) to authenticated, service_role;
grant execute on function public.empyrean_rollback_action(uuid) to authenticated, service_role;
grant execute on function public.empyrean_set_pause(boolean, text) to authenticated, service_role;
grant execute on function public.empyrean_action_snapshot(uuid) to authenticated, service_role;
grant execute on function public.empyrean_hash_payload(jsonb) to authenticated, service_role;