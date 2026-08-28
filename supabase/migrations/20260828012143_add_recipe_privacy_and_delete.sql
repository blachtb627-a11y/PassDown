-- Recipes can be public (visible to everyone) or private (visible only to the
-- author and their followers). Defaults to public so every existing recipe
-- keeps its current (public) visibility.
alter table public.recipes add column is_private boolean not null default false;

-- Replace whatever SELECT/DELETE policies already exist on recipes (created
-- directly in the dashboard before this repo had migrations, so their exact
-- names aren't known here) rather than guessing names to ALTER/DROP by hand.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'recipes' and cmd in ('SELECT', 'DELETE')
  loop
    execute format('drop policy %I on public.recipes', pol.policyname);
  end loop;
end $$;

-- Visible to: the author (always, including their own drafts/private
-- recipes), or anyone else for a published (non-draft) recipe that is either
-- public, or private and the viewer follows the author.
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
        )
      )
    )
  );

-- An author can delete their own recipe (comments/likes/saves/etc. on it
-- cascade via each table's existing foreign key to recipes.id).
create policy "recipes_delete_own" on public.recipes
  for delete using (author_id = (select auth.uid()));
