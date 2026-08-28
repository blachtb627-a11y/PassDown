-- Circles: private named groups (family, friends, etc.) a user creates and invites
-- people into directly. This is the foundation for the "Circles" page — group chat
-- and attaching recipes to a circle are deliberately not part of this pass.
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;

-- Circles are only visible to their members (the creator is added as a member at
-- creation time, so this alone covers "owner can see their own circle" too).
create policy "circles_select_member" on public.circles
  for select using (
    exists (
      select 1 from public.circle_members
      where circle_members.circle_id = circles.id
      and circle_members.user_id = (select auth.uid())
    )
  );

create policy "circles_insert_own" on public.circles
  for insert with check (created_by = (select auth.uid()));

create policy "circles_update_owner" on public.circles
  for update using (created_by = (select auth.uid()));

create policy "circles_delete_owner" on public.circles
  for delete using (created_by = (select auth.uid()));

-- A member can see the roster of any circle they belong to.
create policy "circle_members_select_member" on public.circle_members
  for select using (
    exists (
      select 1 from public.circle_members as m
      where m.circle_id = circle_members.circle_id
      and m.user_id = (select auth.uid())
    )
  );

-- Only the circle's owner can add members (no invite/accept flow yet — keeping this
-- simple for a first pass means being added is immediate, not consent-based).
create policy "circle_members_insert_owner" on public.circle_members
  for insert with check (
    exists (
      select 1 from public.circles
      where circles.id = circle_members.circle_id
      and circles.created_by = (select auth.uid())
    )
  );

-- The owner can remove anyone; anyone can remove themselves (leave the circle).
create policy "circle_members_delete_owner_or_self" on public.circle_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.circles
      where circles.id = circle_members.circle_id
      and circles.created_by = (select auth.uid())
    )
  );
