-- RaoPai schema — run once in Supabase Dashboard › SQL Editor.
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  visited_on date not null,
  note text,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists places_visited_on_idx on public.places (visited_on desc, created_at desc);

-- Lock the table: no public (anon) access. The app talks to it only from the server with the secret key.
alter table public.places enable row level security;
