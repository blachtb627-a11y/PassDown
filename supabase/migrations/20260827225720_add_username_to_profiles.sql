-- Every account gets a unique, required username (separate from the freeform
-- display name), and email uniqueness + confirmation are Supabase Auth's own
-- default behavior (not something this schema needs to enforce).

alter table public.profiles add column username text;

-- Backfill in case any profiles already exist without one.
update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

alter table public.profiles
  add constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$');

create unique index profiles_username_unique_idx on public.profiles (lower(username));

alter table public.profiles alter column username set not null;

-- handle_new_user now requires a username to be passed in signup metadata;
-- the unique index above makes a duplicate username fail the whole signup.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'username'
  );

  insert into public.collections (user_id, name) values
    (new.id, 'Quick Dinners'),
    (new.id, 'Holiday');

  return new;
end; $$;
