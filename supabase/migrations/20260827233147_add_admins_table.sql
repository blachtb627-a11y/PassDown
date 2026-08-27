-- Admin status lives in its own table, never a column on profiles, so there is
-- no way for a regular user to grant themselves admin by updating their own row.
create table public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A user can check whether THEY are an admin (used for client-side UI gating);
-- nobody gets insert/update/delete access via the API — granting admin is a
-- deliberate manual action (SQL editor), never something the app exposes.
create policy "Users can check their own admin status" on public.admins
  for select using (user_id = (select auth.uid()));

-- To grant admin access to an account, run (from the SQL Editor):
--   insert into public.admins (user_id) values ('<user-uuid-here>');
