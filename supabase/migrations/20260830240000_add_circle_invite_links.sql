-- Circle invite links: a link like https://passdown.it.com/circle/<id>/join
-- lets whoever opens it join that circle directly, instead of the owner
-- having to search for and add each person one at a time. The circle's
-- UUID is unguessable, so knowing the link is treated as equivalent to
-- having been invited — no separate invite-code table needed.

-- Let any signed-in user look up a circle's own row (id, name, created_by) —
-- needed to resolve an invite link and show/confirm what's being joined
-- before the visitor is a member. This does NOT expose membership, shared
-- recipes, or chat — those keep their own membership-gated policies below
-- and are unaffected. Replaces whatever SELECT policy exists on circles
-- (its exact name isn't known here — see ..._add_recipe_privacy_and_delete.sql
-- for why this drops by query instead of by a guessed name).
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'circles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.circles', pol.policyname);
  end loop;
end $$;

create policy "circles_select_any_authenticated" on public.circles
  for select using ((select auth.uid()) is not null);

-- A user can always add themselves to a circle (the invite-link join flow)
-- alongside the existing "owner adds anyone" policy — Postgres OR's multiple
-- policies for the same command together, so both paths remain available.
create policy "circle_members_insert_self" on public.circle_members
  for insert with check (user_id = (select auth.uid()));
