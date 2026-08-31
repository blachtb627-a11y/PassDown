-- Click tracking, alongside the view tracking from ..._add_ads.sql — an
-- advertiser usually cares more about whether anyone tapped through than
-- just how many times an ad showed up.
alter table public.ads add column click_count integer not null default 0;

-- Same reasoning as record_ad_view(): a regular user has no general update
-- access to ads, so this is a narrow door that can only ever add exactly 1
-- to one specific ad's click_count.
create or replace function public.record_ad_click(ad_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ads set click_count = click_count + 1 where id = ad_id;
$$;

grant execute on function public.record_ad_click(uuid) to authenticated;
