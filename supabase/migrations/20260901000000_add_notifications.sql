-- The Home feed's bell icon needs something to actually show. Rather than
-- trusting the client to insert "so-and-so liked your recipe" rows directly
-- (which would let any signed-in user write an arbitrary notification
-- claiming to be anyone, to anyone), notifications are created by database
-- triggers that fire on the existing follows/likes/comments/made_this_posts
-- inserts — the same events those tables already record, just fanned out to
-- a notification for whoever should be told about it.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('follow', 'like', 'comment', 'made_this')),
  recipe_id uuid references public.recipes(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_id) where not is_read;

alter table public.notifications enable row level security;

-- A user can only ever see and mark-as-read their own notifications. There's
-- no insert/delete policy for regular users at all — the trigger functions
-- below are the only thing that ever creates a row, and they run as
-- SECURITY DEFINER so RLS on this table doesn't apply to them.
create policy notifications_select_own on public.notifications
  for select using (recipient_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.followee_id then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.followee_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

create trigger notify_on_follow_trigger
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_author_id uuid;
begin
  select author_id into recipe_author_id from public.recipes where id = new.recipe_id;
  if recipe_author_id is not null and recipe_author_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, recipe_id)
    values (recipe_author_id, new.user_id, 'like', new.recipe_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_like_trigger
  after insert on public.likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_author_id uuid;
begin
  select author_id into recipe_author_id from public.recipes where id = new.recipe_id;
  if recipe_author_id is not null and recipe_author_id <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, recipe_id)
    values (recipe_author_id, new.author_id, 'comment', new.recipe_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_comment_trigger
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_made_this()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_author_id uuid;
begin
  select author_id into recipe_author_id from public.recipes where id = new.recipe_id;
  if recipe_author_id is not null and recipe_author_id <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, recipe_id)
    values (recipe_author_id, new.author_id, 'made_this', new.recipe_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_made_this_trigger
  after insert on public.made_this_posts
  for each row execute function public.notify_on_made_this();

-- So the bell's unread badge updates live instead of only on next refresh,
-- same reasoning as circle_messages.
alter publication supabase_realtime add table public.notifications;
