-- Same chicken-and-egg problem as the earlier circles read-back fix, one
-- step later: circle_members_insert_owner checked "is the caller this
-- circle's creator?" via a raw subquery against public.circles — but that
-- subquery is itself filtered by circles' own SELECT policy (members only),
-- and the caller isn't a member yet at the exact moment they're being
-- inserted as the circle's first member. The subquery finds nothing, the
-- check fails, and Postgres reports it identically to a real permission
-- violation ("new row violates row-level security policy for table
-- circle_members").
--
-- Fix: move the ownership check into a SECURITY DEFINER function, same as
-- is_circle_member — it bypasses circles' RLS for its own internal query,
-- so it can check ownership without depending on membership existing yet.
create or replace function public.is_circle_owner(target_circle_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.circles
    where circles.id = target_circle_id
    and circles.created_by = target_user_id
  );
$$;

drop policy if exists "circle_members_insert_owner" on public.circle_members;
create policy "circle_members_insert_owner" on public.circle_members
  for insert with check (public.is_circle_owner(circle_members.circle_id, (select auth.uid())));

drop policy if exists "circle_members_delete_owner_or_self" on public.circle_members;
create policy "circle_members_delete_owner_or_self" on public.circle_members
  for delete using (
    user_id = (select auth.uid())
    or public.is_circle_owner(circle_members.circle_id, (select auth.uid()))
  );
