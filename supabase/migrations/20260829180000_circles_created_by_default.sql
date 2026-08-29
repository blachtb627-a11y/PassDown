-- Creating a circle sent an explicit created_by (matching the caller's own id,
-- confirmed by inspecting the live request) yet still hit "new row violates
-- row-level security policy for table circles" — the with_check comparison
-- (created_by = auth.uid()) rejected a value that provably equaled auth.uid().
-- Rather than keep guessing at why that specific comparison misbehaves, remove
-- the client-supplied value from the equation entirely: let the column default
-- to auth.uid() itself, so it's always computed the same way the policy reads it.
alter table public.circles alter column created_by set default auth.uid();
