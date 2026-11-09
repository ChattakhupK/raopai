-- RaoPai "ทายใจตรงกัน" — run once in Supabase Dashboard › SQL Editor.
-- One pick (0 = first option, 1 = second) per person per day. Picks can't be changed.
create table if not exists public.match_answers (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  author text not null check (author in ('a', 'b')),
  choice smallint not null check (choice in (0, 1)),
  created_at timestamptz not null default now(),
  unique (day, author)
);

create index if not exists match_answers_day_idx on public.match_answers (day desc);

alter table public.match_answers enable row level security;

grant select, insert on public.match_answers to anon;
drop policy if exists "raopai match access" on public.match_answers;
create policy "raopai match access" on public.match_answers
  for all to anon
  using (true)
  with check (true);
