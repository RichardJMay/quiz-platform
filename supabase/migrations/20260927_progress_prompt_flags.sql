-- Additive fields for distinguishing hints from fewer-options support.
-- Existing attempts remain unknown (NULL); live clients may keep inserting.
begin;
alter table public.quiz_attempts
  add column if not exists hint_used_any boolean,
  add column if not exists fewer_options_used boolean;
commit;
