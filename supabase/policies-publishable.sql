-- Run AFTER schema.sql, only if the app uses the publishable key (sb_publishable_…)
-- instead of a secret key. This lets that key read/write the places table.
-- Note: anyone who knows the project URL + publishable key can then access this table.
-- To lock it again later: switch to SUPABASE_SECRET_KEY and drop this policy.
grant select, insert, update, delete on public.places to anon;

drop policy if exists "memomap app access" on public.places;
create policy "memomap app access" on public.places
  for all to anon
  using (true)
  with check (true);
