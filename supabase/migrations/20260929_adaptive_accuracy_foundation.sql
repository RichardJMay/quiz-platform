-- Foundation for an opt-in accuracy pathway. This migration does not enable
-- any pack, change the current quiz screens, or rewrite historical attempts.
-- Apply once, before deploying code that uses these tables.
begin;

create table if not exists public.adaptive_pack_settings (
  quiz_id uuid primary key references public.quizzes(id) on delete cascade,
  enabled boolean not null default false,
  session_length integer not null default 12 check (session_length between 5 and 30),
  independent_option_cap integer not null default 10 check (independent_option_cap between 2 and 30),
  reduced_option_count integer not null default 3 check (reduced_option_count between 2 and 10),
  target_fraction numeric(3,2) not null default 0.70 check (target_fraction between 0 and 1),
  slip numeric(4,3) not null default 0.080 check (slip > 0 and slip < 1),
  learning_rate numeric(4,3) not null default 0.150 check (learning_rate >= 0 and learning_rate < 1),
  prior_by_difficulty jsonb not null default '{"1":0.5,"2":0.4,"3":0.3,"4":0.2,"5":0.1}'::jsonb,
  fallback_prior numeric(4,3) not null default 0.300 check (fallback_prior > 0 and fallback_prior < 1),
  updated_at timestamptz not null default now()
);

-- Pack link is explicit: a typed pack has a different quiz ID. Its fluency
-- access will later be checked against the linked options pack.
create table if not exists public.adaptive_pack_links (
  typed_quiz_id uuid primary key references public.quizzes(id) on delete cascade,
  options_quiz_id uuid not null references public.quizzes(id) on delete cascade,
  check (typed_quiz_id <> options_quiz_id)
);

create table if not exists public.adaptive_term_metadata (
  term_id uuid primary key references public.quiz_term_bank(id) on delete cascade,
  difficulty smallint check (difficulty between 1 and 5),
  example_in_context text,
  updated_at timestamptz not null default now()
);

create table if not exists public.adaptive_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  kind text not null check (kind in ('baseline', 'teaching')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  -- Snapshot membership so adding a term cannot change a running session.
  term_ids uuid[] not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed') = (completed_at is not null))
);

create unique index if not exists adaptive_one_open_session_per_pack
  on public.adaptive_sessions (user_id, quiz_id) where status = 'in_progress';
create index if not exists adaptive_sessions_history_idx
  on public.adaptive_sessions (user_id, quiz_id, completed_at desc);

-- Immutable response history. Only completed sessions can contribute to
-- certification; a retry for the same ordinal must return its saved result.
create table if not exists public.adaptive_trials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adaptive_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  term_id uuid not null references public.quiz_term_bank(id),
  question_id uuid not null references public.questions(id),
  ordinal integer not null check (ordinal >= 0),
  trial_type text not null check (trial_type in ('baseline', 'study', 'teach', 'check')),
  support_level smallint not null check (support_level between 0 and 2),
  option_term_ids uuid[] not null,
  is_standard_format boolean not null,
  selected_term_id uuid references public.quiz_term_bank(id),
  dont_know boolean not null default false,
  is_correct boolean,
  latency_ms integer check (latency_ms >= 0),
  p_known_before numeric(7,6) not null check (p_known_before between 0 and 1),
  p_known_after numeric(7,6) not null check (p_known_after between 0 and 1),
  answered_at timestamptz not null default now(),
  unique (session_id, ordinal),
  check (not dont_know or selected_term_id is null),
  check (trial_type <> 'study' or (selected_term_id is null and not dont_know and is_correct is null)),
  check (trial_type = 'study' or is_correct is not null),
  check (not is_standard_format or support_level = 0)
);

create index if not exists adaptive_trials_term_history_idx
  on public.adaptive_trials (user_id, quiz_id, term_id, answered_at, id);

-- Cached learner state. The trial log is the source for auditing or rebuilding.
create table if not exists public.adaptive_term_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  term_id uuid not null references public.quiz_term_bank(id) on delete cascade,
  p_known numeric(7,6) not null check (p_known between 0 and 1),
  n_correct integer not null default 0 check (n_correct >= 0),
  n_incorrect integer not null default 0 check (n_incorrect >= 0),
  consecutive_errors integer not null default 0 check (consecutive_errors >= 0),
  last_seen_at timestamptz,
  last_error_at timestamptz,
  last_independent_correct boolean,
  certified_at timestamptz,
  primary key (user_id, quiz_id, term_id)
);

-- Unlock is permanent for this pack, including if content is added later.
create table if not exists public.adaptive_pack_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  fluency_unlocked_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

alter table public.adaptive_pack_settings enable row level security;
alter table public.adaptive_pack_links enable row level security;
alter table public.adaptive_term_metadata enable row level security;
alter table public.adaptive_sessions enable row level security;
alter table public.adaptive_trials enable row level security;
alter table public.adaptive_term_state enable row level security;
alter table public.adaptive_pack_progress enable row level security;

-- The future server-side transaction will own all writes. Clients may read
-- their own history but cannot write answers, states or unlocks directly.
create policy "Read own adaptive sessions" on public.adaptive_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own adaptive trials" on public.adaptive_trials
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own adaptive term state" on public.adaptive_term_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own adaptive pack progress" on public.adaptive_pack_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read typed and options pack links" on public.adaptive_pack_links
  for select to authenticated using (true);
create policy "Read study examples" on public.adaptive_term_metadata
  for select to authenticated using (true);

commit;
