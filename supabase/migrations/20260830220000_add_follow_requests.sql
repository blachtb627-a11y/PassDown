-- Follows now require approval (like a private-account model on
-- Instagram/TikTok) instead of taking effect instantly. Existing follows
-- already represent an established relationship, so they're grandfathered
-- in as accepted rather than suddenly needing re-approval.
alter table public.follows add column if not exists status text not null default 'pending';
update public.follows set status = 'accepted';
alter table public.follows add constraint follows_status_check check (status in ('pending', 'accepted'));

-- Replace whatever policies already exist on follows (created directly in
-- the dashboard before this repo had migrations, so their exact names
-- aren't known here) rather than guessing names to ALTER/DROP by hand.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'follows'
  loop
    execute format('drop policy %I on public.follows', pol.policyname);
  end loop;
end $$;

-- An accepted follow is public (needed for follower/following lists and
-- counts); a still-pending request is only visible to the two people it
-- involves — nobody else needs to see who's waiting on whom.
create policy "follows_select" on public.follows
  for select using (
    status = 'accepted'
    or follower_id = (select auth.uid())
    or followee_id = (select auth.uid())
  );

-- Sending a request: only as yourself, and it always starts pending — the
-- target has to accept it before it's a real follow.
create policy "follows_insert" on public.follows
  for insert with check (
    follower_id = (select auth.uid())
    and status = 'pending'
  );

-- Accepting a request: only the person being followed can flip their own
-- incoming pending request to accepted.
create policy "follows_update_accept" on public.follows
  for update using (
    followee_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    followee_id = (select auth.uid())
    and status = 'accepted'
  );

-- Either side can remove a follow row: the follower to unfollow or cancel
-- their own pending request, the followee to decline a pending request or
-- remove an existing follower.
create policy "follows_delete" on public.follows
  for delete using (
    follower_id = (select auth.uid())
    or followee_id = (select auth.uid())
  );

-- Private recipes are visible to followers whose follow has actually been
-- accepted, not just requested.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'recipes' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.recipes', pol.policyname);
  end loop;
end $$;

create policy "recipes_select" on public.recipes
  for select using (
    author_id = (select auth.uid())
    or (
      is_draft = false
      and (
        is_private = false
        or exists (
          select 1 from public.follows
          where follows.follower_id = (select auth.uid())
          and follows.followee_id = recipes.author_id
          and follows.status = 'accepted'
        )
      )
    )
  );
