-- The previous migration (..._add_circle_invite_links.sql) replaced the
-- member-only SELECT policy on circles with one that let ANY signed-in user
-- see EVERY circle, reasoning that an invite link needed to resolve a
-- circle's name before the visitor had joined it. That reasoning was wrong:
-- the actual join flow (DeepLinkHandler) inserts the new circle_members row
-- FIRST and only fetches the circle's name AFTER that insert succeeds — by
-- which point the visitor already is a member, so the original
-- member-only policy would have worked the whole time. The widened policy
-- had no purpose and made every user's circles list (Circles tab, Home's
-- circle chips, the Share-to-Circle picker — all of which rely entirely on
-- RLS to scope "my circles", not an explicit membership filter) return
-- every circle from every account instead of just the caller's own.
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

create policy "circles_select_member" on public.circles
  for select using (public.is_circle_member(circles.id, (select auth.uid())));
