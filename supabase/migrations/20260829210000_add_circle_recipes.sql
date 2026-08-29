-- Lets circle members actually do something with a circle besides see who's
-- in it: share a recipe into it. Any member can share (not just the recipe's
-- author) and any member can un-share what they personally added; the
-- circle's owner can also remove anything. Sharing a recipe into a circle
-- makes it visible to every member regardless of the recipe's own public/
-- private/followers-only visibility — that's the point of a trusted circle.
create table public.circle_recipes (
  circle_id uuid not null references public.circles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  added_by uuid not null default auth.uid() references public.profiles(id),
  added_at timestamptz not null default now(),
  primary key (circle_id, recipe_id)
);

alter table public.circle_recipes enable row level security;

create policy "circle_recipes_select_member" on public.circle_recipes
  for select using (public.is_circle_member(circle_recipes.circle_id, (select auth.uid())));

create policy "circle_recipes_insert_member" on public.circle_recipes
  for insert with check (public.is_circle_member(circle_recipes.circle_id, (select auth.uid())));

create policy "circle_recipes_delete_adder_or_owner" on public.circle_recipes
  for delete using (
    added_by = (select auth.uid())
    or public.is_circle_owner(circle_recipes.circle_id, (select auth.uid()))
  );

create policy "recipes_select_circle_shared" on public.recipes
  for select using (
    exists (
      select 1 from public.circle_recipes
      where circle_recipes.recipe_id = recipes.id
      and public.is_circle_member(circle_recipes.circle_id, (select auth.uid()))
    )
  );
