-- Run after the baseline migration. Extends the opt-in preview only.
begin;

create table if not exists public.adaptive_teaching_plan (
  session_id uuid not null references public.adaptive_sessions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  term_id uuid not null references public.quiz_term_bank(id),
  question_id uuid not null references public.questions(id),
  option_term_ids uuid[] not null,
  support_level smallint not null default 0 check (support_level between 0 and 2),
  primary key (session_id, ordinal)
);
alter table public.adaptive_teaching_plan enable row level security;
-- No client policy. Only authenticated functions can show the current prompt.

-- Seed examples for the existing Verbal Behavior terms. Matches by quiz ID and
-- term spelling; a term absent from the current bank is left unchanged.
insert into public.adaptive_term_metadata (term_id, difficulty, example_in_context)
select t.id, v.difficulty, v.example
from (values
  ('Private Events', 2, 'Silently working through a math problem, or feeling anxious before a test.'),
  ('Echoic', 2, 'Saying ''ball'' after hearing ''ball''.'),
  ('Elementary Verbal Operants', 2, 'Mand, tact, echoic, intraverbal and so on.'),
  ('Point-to-Point Correspondence', 3, 'Hearing ''dog'' and saying ''dog'': each part matches.'),
  ('Textual', 2, 'Reading the word ''cat'' aloud.'),
  ('Intraverbal', 2, 'Answering ''dog'' to ''What barks?'''),
  ('Mand', 1, 'Saying ''juice'' when thirsty and getting juice.'),
  ('Transcription', 3, 'Writing down words during dictation.'),
  ('Rule-Governed Behavior', 2, 'Wearing a seatbelt because you were told it prevents injury.'),
  ('Verbal Behavior', 1, 'Asking a friend for a pen and receiving it.'),
  ('Tact', 1, 'Saying ''airplane'' when seeing one and receiving praise.'),
  ('Listener', 2, 'A parent who hands over a cup when the child says ''cup''.')
) as v(term, difficulty, example)
join public.quiz_term_bank t on lower(trim(t.term_text)) = lower(v.term)
  and t.quiz_id = 'a9ca3cef-1a70-4a4e-a2e0-43c54d9f40fb'::uuid
on conflict (term_id) do nothing;

do $$
begin
  if (select count(*) from public.adaptive_term_metadata m
    join public.quiz_term_bank t on t.id = m.term_id
    where t.quiz_id = 'a9ca3cef-1a70-4a4e-a2e0-43c54d9f40fb'::uuid
      and nullif(trim(m.example_in_context), '') is not null) < 12 then
    raise exception 'Verbal Behavior examples did not match all 12 existing terms';
  end if;
end $$;

create or replace function public.adaptive_teaching_view(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_options jsonb;
  v_text text;
  v_example text;
  v_answered integer;
  v_correct integer;
  v_ready integer;
  v_total integer;
  v_unlocked boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching';
  if not found then raise exception 'Teaching session not found'; end if;
  select count(*), count(*) filter (where is_correct)
    into v_answered, v_correct from public.adaptive_trials
    where session_id = p_session_id and trial_type <> 'study';
  select count(*) into v_total from public.quiz_term_bank where quiz_id = s.quiz_id;
  select count(*) into v_ready from public.adaptive_term_state st
    join public.quiz_term_bank t on t.id = st.term_id
    where st.user_id = auth.uid() and st.quiz_id = s.quiz_id
      and t.quiz_id = s.quiz_id and st.certified_at is not null;
  select exists(select 1 from public.adaptive_pack_progress
    where user_id = auth.uid() and quiz_id = s.quiz_id) into v_unlocked;
  if s.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'sessionId', s.id,
      'correct', v_correct, 'answered', v_answered, 'ready', v_ready,
      'terms', v_total, 'unlocked', v_unlocked);
  end if;
  if s.status <> 'in_progress' then
    return jsonb_build_object('status', s.status, 'sessionId', s.id);
  end if;
  select plan.* into p from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists
      (select 1 from public.adaptive_trials r
        where r.session_id = plan.session_id and r.ordinal = plan.ordinal)
    order by plan.ordinal limit 1;
  if not found then raise exception 'Teaching plan has no remaining prompt'; end if;
  select question_text into v_text from public.questions where id = p.question_id;
  if p.support_level = 2 then
    select example_in_context into v_example from public.adaptive_term_metadata
      where term_id = p.term_id;
  end if;
  select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.term_text) order by option_index)
    into v_options from unnest(p.option_term_ids) with ordinality as o(term_id, option_index)
    join public.quiz_term_bank t on t.id = o.term_id;
  return jsonb_build_object('status', 'in_progress', 'sessionId', s.id,
    'ordinal', p.ordinal, 'answered', v_answered,
    'total', (select count(*) from public.adaptive_teaching_plan where session_id = s.id),
    'ready', v_ready, 'terms', v_total, 'definition', v_text,
    'example', v_example, 'supportLevel', p.support_level, 'options', v_options);
end $$;

create or replace function public.adaptive_begin_teaching(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_all uuid[];
  v_picked uuid[] := '{}'::uuid[];
  v_term uuid;
  v_question uuid;
  v_options uuid[];
  v_length integer;
  v_cap integer;
  v_target_count integer;
  v_previous_session_started timestamptz;
  v_ordinal integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(p_quiz_id::text));
  select least(s.session_length, (select count(*) from public.quiz_term_bank where quiz_id = p_quiz_id)),
    s.independent_option_cap, greatest(1, ceil(s.target_fraction * s.session_length)::integer)
    into v_length, v_cap, v_target_count
    from public.adaptive_pack_settings s where s.quiz_id = p_quiz_id and s.enabled;
  if v_length is null then raise exception 'Teaching is not enabled for this pack'; end if;
  if not exists (select 1 from public.adaptive_sessions where user_id = auth.uid()
    and quiz_id = p_quiz_id and kind = 'baseline' and status = 'completed') then
    raise exception 'Complete the baseline first';
  end if;
  select id into v_id from public.adaptive_sessions where user_id = auth.uid()
    and quiz_id = p_quiz_id and kind = 'teaching' and status = 'in_progress'
    order by started_at desc limit 1;
  if found then return public.adaptive_teaching_view(v_id); end if;
  if exists (select 1 from public.adaptive_pack_progress where user_id = auth.uid()
    and quiz_id = p_quiz_id) then
    return jsonb_build_object('status', 'unlocked');
  end if;
  select array_agg(id) into v_all from public.quiz_term_bank where quiz_id = p_quiz_id;
  select started_at into v_previous_session_started from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and status = 'completed'
    order by completed_at desc limit 1;

  -- Give about 70% of the set to highest-priority uncertified terms, then
  -- intersperse ready or stronger terms. Each term occurs at most once.
  select coalesce(array_agg(id), '{}'::uuid[]) into v_picked from (
    select t.id from public.quiz_term_bank t
    left join public.adaptive_term_state st on st.term_id = t.id
      and st.user_id = auth.uid() and st.quiz_id = p_quiz_id
    where t.quiz_id = p_quiz_id and st.certified_at is null
    order by (1 - coalesce(st.p_known, 0.3)
      + case when st.last_error_at >= v_previous_session_started then 0.2 else 0 end
      + case when exists (select 1 from public.adaptive_trials r
        where r.user_id = auth.uid() and r.quiz_id = p_quiz_id and r.term_id = t.id
          and r.selected_term_id is not null and not r.is_correct) then 0.2 else 0 end) desc,
      st.last_seen_at asc nulls first, t.id
    limit least(v_length, v_target_count)
  ) ranked;
  for v_term in
    select t.id from public.quiz_term_bank t
    left join public.adaptive_term_state st on st.term_id = t.id
      and st.user_id = auth.uid() and st.quiz_id = p_quiz_id
    where t.quiz_id = p_quiz_id and not t.id = any(v_picked)
    order by (st.certified_at is null), st.last_seen_at asc nulls first,
      st.p_known desc nulls last, t.id
  loop
    exit when array_length(v_picked, 1) >= v_length;
    v_picked := array_append(v_picked, v_term);
  end loop;
  if coalesce(array_length(v_picked, 1), 0) <> v_length then
    raise exception 'Could not build teaching set';
  end if;
  insert into public.adaptive_sessions (user_id, quiz_id, kind, term_ids)
    values (auth.uid(), p_quiz_id, 'teaching', v_all) returning id into v_id;
  for v_term in select unnest(v_picked) order by random() loop
    select id into v_question from public.questions
      where quiz_id = p_quiz_id and correct_term_id = v_term order by id limit 1;
    if v_question is null then raise exception 'Term needs a definition'; end if;
    select array_agg(id order by random()) into v_options from (
      select v_term as id union all
      select d.id from (select t.id from public.quiz_term_bank t
        where t.quiz_id = p_quiz_id and t.id <> v_term
        order by random() limit greatest(1, least(v_cap, array_length(v_all, 1)) - 1)) d
    ) chosen;
    insert into public.adaptive_teaching_plan
      (session_id, ordinal, term_id, question_id, option_term_ids)
      values (v_id, v_ordinal, v_term, v_question, v_options);
    v_ordinal := v_ordinal + 1;
  end loop;
  return public.adaptive_teaching_view(v_id);
end $$;

create or replace function public.adaptive_choose_help(
  p_session_id uuid, p_ordinal integer, p_level smallint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_current integer;
  v_options uuid[];
  v_prior numeric;
  v_after numeric;
  v_rate numeric;
  v_count integer;
  v_example text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching' for update;
  if not found or s.status <> 'in_progress' then raise exception 'Teaching session is closed'; end if;
  if p_level not in (1, 2) then raise exception 'Unknown help level'; end if;
  select min(ordinal) into v_current from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal);
  if p_ordinal is distinct from v_current then raise exception 'Select help for the current prompt'; end if;
  select * into p from public.adaptive_teaching_plan
    where session_id = s.id and ordinal = p_ordinal for update;
  if p.support_level >= p_level then return public.adaptive_teaching_view(s.id); end if;
  if p_level = 2 then
    select example_in_context into v_example from public.adaptive_term_metadata
      where term_id = p.term_id;
    if nullif(trim(v_example), '') is null then
      raise exception 'An example is not available for this term';
    end if;
  end if;
  if p.support_level = 0 then
    select reduced_option_count into v_count from public.adaptive_pack_settings
      where quiz_id = s.quiz_id;
    select array_agg(id order by random()) into v_options from (
      select p.term_id as id union all
      select d.id from (select t.id from public.quiz_term_bank t
        where t.id = any(s.term_ids) and t.id <> p.term_id
        order by random() limit greatest(1, least(v_count, array_length(s.term_ids, 1)) - 1)) d
    ) choices;
  else
    v_options := p.option_term_ids;
  end if;
  if p_level = 2 then
    select st.p_known into v_prior from public.adaptive_term_state st
      where st.user_id = auth.uid() and st.quiz_id = s.quiz_id and st.term_id = p.term_id;
    if v_prior is null then v_prior := 0.3; end if;
    select learning_rate into v_rate from public.adaptive_pack_settings where quiz_id = s.quiz_id;
    v_after := v_prior + (1 - v_prior) * v_rate;
    insert into public.adaptive_trials
      (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
       support_level, option_term_ids, is_standard_format, p_known_before, p_known_after)
      values (s.id, auth.uid(), s.quiz_id, p.term_id, p.question_id, 1000 + p.ordinal,
        'study', 2, '{}'::uuid[], false, v_prior, v_after);
    insert into public.adaptive_term_state
      (user_id, quiz_id, term_id, p_known, last_seen_at)
      values (auth.uid(), s.quiz_id, p.term_id, v_after, now())
      on conflict (user_id, quiz_id, term_id) do update set
        p_known = excluded.p_known, last_seen_at = excluded.last_seen_at;
  end if;
  update public.adaptive_teaching_plan set support_level = p_level, option_term_ids = v_options
    where session_id = s.id and ordinal = p.ordinal;
  return public.adaptive_teaching_view(s.id);
end $$;

create or replace function public.adaptive_answer_teaching(
  p_session_id uuid, p_ordinal integer, p_selected_term_id uuid,
  p_dont_know boolean, p_latency_ms integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_previous public.adaptive_trials%rowtype;
  v_current integer;
  v_prior numeric;
  v_after numeric;
  v_guess numeric;
  v_num numeric;
  v_slip numeric;
  v_rate numeric;
  v_correct boolean;
  v_term text;
  v_n integer;
  v_successes integer;
  v_latest boolean;
  v_term_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching' for update;
  if not found then raise exception 'Teaching session not found'; end if;
  select * into p from public.adaptive_teaching_plan
    where session_id = s.id and ordinal = p_ordinal;
  if not found then raise exception 'Prompt not found'; end if;
  select * into v_previous from public.adaptive_trials
    where session_id = s.id and ordinal = p_ordinal;
  if found then
    if v_previous.selected_term_id is distinct from p_selected_term_id or
       v_previous.dont_know is distinct from p_dont_know then
      raise exception 'This prompt already has a different saved response';
    end if;
    select term_text into v_term from public.quiz_term_bank where id = p.term_id;
    return jsonb_build_object('status', 'feedback', 'correct', v_previous.is_correct,
      'correctTerm', v_term, 'next', public.adaptive_teaching_view(s.id));
  end if;
  if s.status <> 'in_progress' then raise exception 'Session is closed'; end if;
  if p_dont_know is null or p_dont_know = (p_selected_term_id is not null) then
    raise exception 'Choose an option or do not know';
  end if;
  if p_latency_ms is not null and (p_latency_ms < 0 or p_latency_ms > 1800000) then
    raise exception 'Invalid response time';
  end if;
  if not p_dont_know and not (p_selected_term_id = any(p.option_term_ids)) then
    raise exception 'Selected term is not an option';
  end if;
  select min(ordinal) into v_current from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal);
  if p_ordinal is distinct from v_current then raise exception 'Answer the current prompt first'; end if;

  select st.p_known into v_prior from public.adaptive_term_state st
    where st.user_id = auth.uid() and st.quiz_id = s.quiz_id and st.term_id = p.term_id;
  if v_prior is null then v_prior := 0.3; end if;
  select slip, learning_rate into v_slip, v_rate from public.adaptive_pack_settings
    where quiz_id = s.quiz_id;
  v_correct := not p_dont_know and p_selected_term_id = p.term_id;
  v_n := array_length(p.option_term_ids, 1);
  v_guess := case when p_dont_know then 0 else 1.0 / v_n end;
  if v_correct then
    v_num := v_prior * (1 - v_slip);
    v_after := v_num / (v_num + (1 - v_prior) * v_guess);
  else
    v_num := v_prior * v_slip;
    v_after := v_num / (v_num + (1 - v_prior) * (1 - v_guess));
  end if;
  v_after := v_after + (1 - v_after) * v_rate;
  insert into public.adaptive_trials
    (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
      support_level, option_term_ids, is_standard_format, selected_term_id,
      dont_know, is_correct, latency_ms, p_known_before, p_known_after)
    values (s.id, auth.uid(), s.quiz_id, p.term_id, p.question_id, p.ordinal,
      case when p.support_level = 0 then 'check' else 'teach' end,
      p.support_level, p.option_term_ids, p.support_level = 0,
      p_selected_term_id, p_dont_know, v_correct, p_latency_ms, v_prior, v_after);
  insert into public.adaptive_term_state
    (user_id, quiz_id, term_id, p_known, n_correct, n_incorrect,
      consecutive_errors, last_seen_at, last_error_at, last_independent_correct)
    values (auth.uid(), s.quiz_id, p.term_id, v_after,
      case when v_correct then 1 else 0 end,
      case when v_correct then 0 else 1 end,
      case when v_correct then 0 else 1 end,
      now(), case when v_correct then null else now() end,
      case when p.support_level = 0 then v_correct else null end)
    on conflict (user_id, quiz_id, term_id) do update set
      p_known = excluded.p_known,
      n_correct = public.adaptive_term_state.n_correct + excluded.n_correct,
      n_incorrect = public.adaptive_term_state.n_incorrect + excluded.n_incorrect,
      consecutive_errors = case when v_correct then 0
        else public.adaptive_term_state.consecutive_errors + 1 end,
      last_seen_at = excluded.last_seen_at,
      last_error_at = case when v_correct then public.adaptive_term_state.last_error_at
        else excluded.last_error_at end,
      last_independent_correct = case when p.support_level = 0 then v_correct
        else public.adaptive_term_state.last_independent_correct end;

  if not exists (select 1 from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal)) then
    update public.adaptive_sessions set status = 'completed', completed_at = now()
      where id = s.id;
    -- Certification uses completed sessions only. Neither support level counts.
    for v_term_id in select id from public.quiz_term_bank where quiz_id = s.quiz_id loop
      select count(distinct r.session_id) into v_successes
        from public.adaptive_trials r join public.adaptive_sessions a on a.id = r.session_id
        where r.user_id = auth.uid() and r.quiz_id = s.quiz_id and r.term_id = v_term_id
          and a.status = 'completed' and r.is_standard_format and r.support_level = 0
          and r.is_correct;
      select r.is_correct into v_latest from public.adaptive_trials r
        join public.adaptive_sessions a on a.id = r.session_id
        where r.user_id = auth.uid() and r.quiz_id = s.quiz_id and r.term_id = v_term_id
          and a.status = 'completed' and r.is_standard_format and r.support_level = 0
          and r.is_correct is not null
        order by a.completed_at desc, r.answered_at desc, r.id desc limit 1;
      update public.adaptive_term_state set certified_at =
        case when v_successes >= 2 and v_latest then coalesce(certified_at, now()) else null end
        where user_id = auth.uid() and quiz_id = s.quiz_id and term_id = v_term_id;
    end loop;
    if not exists (select 1 from public.quiz_term_bank t
      left join public.adaptive_term_state st on st.term_id = t.id
        and st.user_id = auth.uid() and st.quiz_id = s.quiz_id
      where t.quiz_id = s.quiz_id and st.certified_at is null) then
      insert into public.adaptive_pack_progress (user_id, quiz_id)
        values (auth.uid(), s.quiz_id) on conflict do nothing;
    end if;
  end if;
  select term_text into v_term from public.quiz_term_bank where id = p.term_id;
  return jsonb_build_object('status', 'feedback', 'correct', v_correct,
    'correctTerm', v_term, 'next', public.adaptive_teaching_view(s.id));
end $$;

revoke all on function public.adaptive_teaching_view(uuid) from public, anon;
revoke all on function public.adaptive_begin_teaching(uuid) from public, anon;
revoke all on function public.adaptive_choose_help(uuid, integer, smallint) from public, anon;
revoke all on function public.adaptive_answer_teaching(uuid, integer, uuid, boolean, integer) from public, anon;
grant execute on function public.adaptive_teaching_view(uuid) to authenticated;
grant execute on function public.adaptive_begin_teaching(uuid) to authenticated;
grant execute on function public.adaptive_choose_help(uuid, integer, smallint) to authenticated;
grant execute on function public.adaptive_answer_teaching(uuid, integer, uuid, boolean, integer) to authenticated;
commit;
