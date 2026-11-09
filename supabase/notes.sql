-- RaoPai "ฝากข้อความ" — run once in Supabase Dashboard › SQL Editor.
-- Notes are shown for 24 hours from created_at, then hidden (and cleaned up later by the app).
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists notes_created_at_idx on public.notes (created_at desc);

alter table public.notes enable row level security;

-- Same access model as places (the app uses the publishable key from the server only).
grant select, insert, delete on public.notes to anon;
drop policy if exists "raopai notes access" on public.notes;
create policy "raopai notes access" on public.notes
  for all to anon
  using (true)
  with check (true);
