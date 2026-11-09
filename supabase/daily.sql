-- RaoPai "คำถามประจำวัน" — run once in Supabase Dashboard › SQL Editor.
-- One answer per person (a / b) per day.
create table if not exists public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  author text not null check (author in ('a', 'b')),
  answer text not null check (char_length(answer) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day, author)
);

create index if not exists daily_answers_day_idx on public.daily_answers (day desc);

alter table public.daily_answers enable row level security;

grant select, insert, update on public.daily_answers to anon;
drop policy if exists "raopai daily access" on public.daily_answers;
create policy "raopai daily access" on public.daily_answers
  for all to anon
  using (true)
  with check (true);
