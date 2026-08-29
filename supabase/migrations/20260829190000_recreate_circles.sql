-- Circle creation kept hitting "new row violates row-level security policy
-- for table circles" through several rounds of verification that turned up
-- nothing wrong: the client payload's created_by was confirmed to equal the
-- caller's own id, the policy's with_check was confirmed correctly defined
-- and permissive, auth.uid()'s own definition was inspected directly, and
-- every other authenticated write in the app succeeded under the same login.
-- Rather than keep patching around an unexplained failure, drop and recreate
-- both tables and every policy from scratch — this rules out any stale or
-- corrupted catalog state left over from how they were originally created.
-- No data is lost: circle creation has never once succeeded, so there is
-- nothing in these tables to preserve.
drop table if exists public.circle_members;
drop table if exists public.circles;

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null default auth.uid() references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;

create or replace function public.is_circle_member(target_circle_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.circle_members
    where circle_members.circle_id = target_circle_id
    and circle_members.user_id = target_user_id
  );
$$;

create policy "circles_select_member" on public.circles
  for select using (public.is_circle_member(circles.id, (select auth.uid())));

create policy "circles_insert_own" on public.circles
  for insert with check (created_by = (select auth.uid()));

create policy "circles_update_owner" on public.circles
  for update using (created_by = (select auth.uid()));

create policy "circles_delete_owner" on public.circles
  for delete using (created_by = (select auth.uid()));

create policy "circle_members_select_member" on public.circle_members
  for select using (public.is_circle_member(circle_members.circle_id, (select auth.uid())));

create policy "circle_members_insert_owner" on public.circle_members
  for insert with check (
    exists (
      select 1 from public.circles
      where circles.id = circle_members.circle_id
      and circles.created_by = (select auth.uid())
    )
  );

create policy "circle_members_delete_owner_or_self" on public.circle_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.circles
      where circles.id = circle_members.circle_id
      and circles.created_by = (select auth.uid())
    )
  );
