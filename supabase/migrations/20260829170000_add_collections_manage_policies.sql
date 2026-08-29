-- Collections predate this repo's migrations folder (created directly via the
-- Supabase dashboard) with only SELECT/INSERT policies — there was no way to
-- rename or delete a collection, or add/remove a saved recipe from one.
alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;

drop policy if exists "collections_update_owner" on public.collections;
create policy "collections_update_owner" on public.collections
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "collections_delete_owner" on public.collections;
create policy "collections_delete_owner" on public.collections
  for delete using (user_id = (select auth.uid()));

drop policy if exists "collection_recipes_insert_owner" on public.collection_recipes;
create policy "collection_recipes_insert_owner" on public.collection_recipes
  for insert with check (
    exists (
      select 1 from public.collections
      where collections.id = collection_recipes.collection_id
      and collections.user_id = (select auth.uid())
    )
  );

drop policy if exists "collection_recipes_delete_owner" on public.collection_recipes;
create policy "collection_recipes_delete_owner" on public.collection_recipes
  for delete using (
    exists (
      select 1 from public.collections
      where collections.id = collection_recipes.collection_id
      and collections.user_id = (select auth.uid())
    )
  );
