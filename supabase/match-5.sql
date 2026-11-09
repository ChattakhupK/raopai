-- RaoPai ทายใจ: 5 questions per day. Run once in Supabase › SQL Editor (after match.sql).
-- Existing answers become question 1 (slot 0) of their day.
alter table public.match_answers
  add column if not exists slot smallint not null default 0 check (slot between 0 and 4);

alter table public.match_answers drop constraint if exists match_answers_day_author_key;
alter table public.match_answers drop constraint if exists match_answers_day_author_slot_key;
alter table public.match_answers
  add constraint match_answers_day_author_slot_key unique (day, author, slot);

-- optional: remove the test rounds made before the game started
delete from public.match_answers where day < '2026-11-09';
