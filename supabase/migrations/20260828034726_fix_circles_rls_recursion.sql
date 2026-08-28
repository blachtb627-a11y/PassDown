-- The circle_members SELECT policy checked "is the caller a member of this
-- circle?" by querying circle_members from within circle_members's own policy.
-- That self-reference makes Postgres reject every query against either table
-- with "infinite recursion detected in policy for relation circle_members" —
-- circles_select_member also queries circle_members, so it was hit too.
--
-- Fix: move the membership check into a SECURITY DEFINER function. Called from
-- within a policy, it runs as its owner (bypassing RLS for its own internal
-- query), so it can check circle_members without re-triggering that table's
-- policy on itself.
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

drop policy if exists "circles_select_member" on public.circles;
create policy "circles_select_member" on public.circles
  for select using (public.is_circle_member(circles.id, (select auth.uid())));

drop policy if exists "circle_members_select_member" on public.circle_members;
create policy "circle_members_select_member" on public.circle_members
  for select using (public.is_circle_member(circle_members.circle_id, (select auth.uid())));
