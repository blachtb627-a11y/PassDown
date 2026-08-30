-- Group chat within a circle: any member can post a message, every member
-- can read the full history. Reuses the is_circle_member() helper already
-- defined for circles/circle_members RLS (see
-- ..._fix_circles_rls_recursion.sql) instead of a raw subquery, since that's
-- the established, known-safe way to check membership from another table's
-- policy in this schema.
create table public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.circle_messages enable row level security;

create policy "circle_messages_select_member" on public.circle_messages
  for select using (public.is_circle_member(circle_messages.circle_id, (select auth.uid())));

create policy "circle_messages_insert_member" on public.circle_messages
  for insert with check (
    author_id = (select auth.uid())
    and public.is_circle_member(circle_messages.circle_id, (select auth.uid()))
  );

-- So a message shows up for every other member's chat immediately, not just
-- on their next manual refresh.
alter publication supabase_realtime add table public.circle_messages;
