alter table public.partner_campaign_plans
  add column if not exists view_count integer not null default 0,
  add column if not exists click_count integer not null default 0,
  add column if not exists order_count integer not null default 0,
  add column if not exists revenue_huf numeric not null default 0,
  add column if not exists forecast jsonb,
  add column if not exists source text not null default 'manual',
  add column if not exists storefront_version_id uuid;

alter table public.partner_storefronts
  add column if not exists active_campaign_plan_id uuid;

drop policy if exists "Public can read published campaign plans" on public.partner_campaign_plans;
create policy "Public can read published campaign plans"
  on public.partner_campaign_plans for select
  to anon, authenticated
  using (status = 'published');

grant select on public.partner_campaign_plans to anon;

create or replace function public.track_campaign_event(_plan_id uuid, _kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _kind = 'view' then
    update public.partner_campaign_plans
      set view_count = view_count + 1
      where id = _plan_id and status = 'published';
  elsif _kind = 'click' then
    update public.partner_campaign_plans
      set click_count = click_count + 1
      where id = _plan_id and status = 'published';
  end if;
end;
$$;

grant execute on function public.track_campaign_event(uuid, text) to anon, authenticated;