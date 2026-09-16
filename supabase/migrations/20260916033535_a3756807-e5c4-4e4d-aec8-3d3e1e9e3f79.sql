alter table public.partner_campaign_plans
  add column if not exists category text not null default 'Általános';

create or replace function public.track_campaign_event(_plan_id uuid, _kind text, _amount numeric default 0)
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
  elsif _kind = 'order' then
    update public.partner_campaign_plans
      set order_count = order_count + 1,
          revenue_huf = revenue_huf + greatest(coalesce(_amount, 0), 0)
      where id = _plan_id and status = 'published';
  end if;
end;
$$;

grant execute on function public.track_campaign_event(uuid, text, numeric) to anon, authenticated;