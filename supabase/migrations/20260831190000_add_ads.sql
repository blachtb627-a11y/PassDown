-- The ad system: admins create an ad (image or video, a run length, and an
-- optional view cap) from the Admin Portal's Ad Deployment tab, and it shows
-- up once per Home feed load for regular users until it expires or hits its
-- cap.
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id),
  company_name text not null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  link_url text,
  target_view_count integer check (target_view_count is null or target_view_count > 0),
  view_count integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

-- Admins can do everything: create, edit (pause/resume), delete, and see
-- every ad regardless of whether it's currently eligible to run.
create policy "ads_admin_all" on public.ads
  for all using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
  );

-- Everyone else can only see an ad that's actually eligible to be shown right
-- now — active, started, not past its end date, and under its view cap (if
-- it has one) — and nothing else about ad management.
create policy "ads_select_eligible_for_everyone" on public.ads
  for select using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and (target_view_count is null or view_count < target_view_count)
  );

-- A regular user has no UPDATE access to ads (only the admin-only policy
-- above grants that), so recording a view needs a narrow, safe door: this
-- function can only ever add exactly 1 to one specific ad's view_count. It
-- can't be used to reset a count, inflate it by an arbitrary amount, or
-- touch any other column — unlike a broad "any authenticated user can
-- update ads" policy would allow.
create or replace function public.record_ad_view(ad_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ads set view_count = view_count + 1 where id = ad_id;
$$;

grant execute on function public.record_ad_view(uuid) to authenticated;

-- Storage bucket for ad images/videos. Public read (ads need to be visible
-- to every user without a signed URL dance); only admins can upload or
-- delete, mirroring the ads table's own admin-only write policy.
insert into storage.buckets (id, name, public)
values ('ad-media', 'ad-media', true)
on conflict (id) do nothing;

create policy "ad_media_select_public" on storage.objects
  for select using (bucket_id = 'ad-media');

create policy "ad_media_insert_admin" on storage.objects
  for insert with check (
    bucket_id = 'ad-media'
    and exists (select 1 from public.admins where user_id = (select auth.uid()))
  );

create policy "ad_media_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'ad-media'
    and exists (select 1 from public.admins where user_id = (select auth.uid()))
  );
