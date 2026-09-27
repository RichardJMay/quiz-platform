-- Add prospective pathway metadata without reclassifying historical attempts.
-- Run before deploying or locally testing the accuracy-first quiz UI.
-- Existing code can keep inserting rows because every new column is nullable.
begin;

alter table public.quiz_attempts
  add column if not exists session_id uuid,
  add column if not exists attempt_purpose text,
  add column if not exists response_mode text,
  add column if not exists independent boolean,
  add column if not exists assistance_used boolean,
  add column if not exists terminal_option_condition boolean,
  add column if not exists learner_local_date date,
  add column if not exists completed boolean,
  add column if not exists instructional_phase_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quiz_attempts'::regclass
      and conname = 'quiz_attempts_pathway_purpose_check'
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_pathway_purpose_check
      check (attempt_purpose is null or attempt_purpose in (
        'accuracy_probe', 'accuracy_practice', 'fluency_probe', 'fluency_practice'
      ));
  end if;
end $$;

create index if not exists quiz_attempts_pathway_order_idx
  on public.quiz_attempts (user_id, quiz_id, completed_at, id)
  where attempt_purpose is not null;

commit;
