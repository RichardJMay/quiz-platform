-- Run after 20260929_adaptive_accuracy_foundation.sql. No pack is enabled here.
-- The functions execute under the database owner and use auth.uid() for identity.
begin;

create table if not exists public.adaptive_baseline_plan (
  session_id uuid not null references public.adaptive_sessions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  term_id uuid not null references public.quiz_term_bank(id),
  question_id uuid not null references public.questions(id),
  option_term_ids uuid[] not null,
  primary key (session_id, ordinal)
);
alter table public.adaptive_baseline_plan enable row level security;
-- No client policy: the response key and plan are returned only through RPC.

-- Returns only the current prompt. Completed baseline results appear at the end.
create or replace function public.adaptive_baseline_view(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.adaptive_sessions%rowtype;
  v_plan public.adaptive_baseline_plan%rowtype;
  v_options jsonb;
  v_correct integer;
  v_total integer;
  v_text text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into v_session from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'baseline';
  if not found then raise exception 'Baseline session not found'; end if;

  select count(*), count(*) filter (where is_correct)
    into v_total, v_correct from public.adaptive_trials where session_id = p_session_id;
  if v_session.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'sessionId', p_session_id,
      'total', v_total, 'correct', v_correct);
  end if;
  if v_session.status <> 'in_progress' then
    return jsonb_build_object('status', v_session.status, 'sessionId', p_session_id);
  end if;

  select p.* into v_plan from public.adaptive_baseline_plan p
    where p.session_id = p_session_id
      and not exists (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal)
    order by p.ordinal limit 1;
  if not found then raise exception 'Baseline plan has no remaining prompt'; end if;

  select question_text into v_text from public.questions where id = v_plan.question_id;
  select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.term_text) order by option_index)
    into v_options
    from unnest(v_plan.option_term_ids) with ordinality as o(term_id, option_index)
    join public.quiz_term_bank t on t.id = o.term_id;

  return jsonb_build_object('status', 'in_progress', 'sessionId', p_session_id,
    'ordinal', v_plan.ordinal, 'answered', v_total,
    'total', array_length(v_session.term_ids, 1), 'definition', v_text,
    'options', v_options);
end $$;

create or replace function public.adaptive_begin_baseline(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session_id uuid;
  v_term_ids uuid[];
  v_term_id uuid;
  v_question_id uuid;
  v_options uuid[];
  v_ordinal integer := 0;
  v_term_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(p_quiz_id::text));
  if not exists (select 1 from public.adaptive_pack_settings s
    join public.quizzes q on q.id = s.quiz_id
    where s.quiz_id = p_quiz_id and s.enabled
      and q.quiz_mode = 'banked' and coalesce(q.response_mode, 'options') = 'options') then
    raise exception 'Adaptive baseline is not enabled for this options pack';
  end if;

  select id into v_session_id from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and kind = 'baseline'
      and status = 'in_progress' order by started_at desc limit 1;
  if found then return public.adaptive_baseline_view(v_session_id); end if;
  select id into v_session_id from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and kind = 'baseline'
      and status = 'completed' order by completed_at desc limit 1;
  if found then return public.adaptive_baseline_view(v_session_id); end if;

  select array_agg(id order by random()), count(*) into v_term_ids, v_term_count
    from public.quiz_term_bank where quiz_id = p_quiz_id;
  if v_term_count < 2 or v_term_count > 30 then
    raise exception 'Baseline requires 2 to 30 terms';
  end if;
  if (select count(distinct correct_term_id) from public.questions
      where quiz_id = p_quiz_id and correct_term_id = any(v_term_ids)) <> v_term_count then
    raise exception 'Every baseline term needs a definition';
  end if;

  insert into public.adaptive_sessions (user_id, quiz_id, kind, term_ids)
    values (auth.uid(), p_quiz_id, 'baseline', v_term_ids) returning id into v_session_id;
  foreach v_term_id in array v_term_ids loop
    select id into v_question_id from public.questions
      where quiz_id = p_quiz_id and correct_term_id = v_term_id
      order by id limit 1;
    select array_agg(id order by random()) into v_options
      from public.quiz_term_bank where id = any(v_term_ids);
    insert into public.adaptive_baseline_plan
      (session_id, ordinal, term_id, question_id, option_term_ids)
      values (v_session_id, v_ordinal, v_term_id, v_question_id, v_options);
    v_ordinal := v_ordinal + 1;
  end loop;
  return public.adaptive_baseline_view(v_session_id);
end $$;

create or replace function public.adaptive_answer_baseline(
  p_session_id uuid, p_ordinal integer, p_selected_term_id uuid,
  p_dont_know boolean, p_latency_ms integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.adaptive_sessions%rowtype;
  v_plan public.adaptive_baseline_plan%rowtype;
  v_previous public.adaptive_trials%rowtype;
  v_next_ordinal integer;
  v_prior numeric;
  v_posterior numeric;
  v_guess numeric;
  v_numerator numeric;
  v_slip numeric;
  v_learning_rate numeric;
  v_correct boolean;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into v_session from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'baseline' for update;
  if not found then raise exception 'Baseline session not found'; end if;
  select * into v_plan from public.adaptive_baseline_plan
    where session_id = p_session_id and ordinal = p_ordinal;
  if not found then raise exception 'Prompt does not belong to this session'; end if;

  -- A retried request returns the saved result without applying BKT again.
  select * into v_previous from public.adaptive_trials
    where session_id = p_session_id and ordinal = p_ordinal;
  if found then
    if v_previous.selected_term_id is distinct from p_selected_term_id or
       v_previous.dont_know is distinct from p_dont_know then
      raise exception 'This prompt already has a different saved response';
    end if;
    return public.adaptive_baseline_view(p_session_id);
  end if;

  if v_session.status <> 'in_progress' then raise exception 'Session is closed'; end if;
  if p_dont_know is null or p_dont_know = (p_selected_term_id is not null) then
    raise exception 'Choose an option or do not know';
  end if;
  if p_latency_ms is not null and (p_latency_ms < 0 or p_latency_ms > 1800000) then
    raise exception 'Invalid response time';
  end if;
  if not p_dont_know and not (p_selected_term_id = any(v_plan.option_term_ids)) then
    raise exception 'Selected term is not an option';
  end if;
  select min(ordinal) into v_next_ordinal from public.adaptive_baseline_plan p
    where p.session_id = p_session_id
      and not exists (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal);
  if p_ordinal <> v_next_ordinal then raise exception 'Answer the current prompt first'; end if;

  select s.slip, s.learning_rate into v_slip, v_learning_rate
    from public.adaptive_pack_settings s where s.quiz_id = v_session.quiz_id;
  select st.p_known into v_prior from public.adaptive_term_state st
    where st.user_id = auth.uid() and st.quiz_id = v_session.quiz_id
      and st.term_id = v_plan.term_id;
  if v_prior is null then
    select coalesce((s.prior_by_difficulty ->> m.difficulty::text)::numeric, s.fallback_prior)
      into v_prior from public.adaptive_pack_settings s
      left join public.adaptive_term_metadata m on m.term_id = v_plan.term_id
      where s.quiz_id = v_session.quiz_id;
  end if;
  v_correct := not p_dont_know and p_selected_term_id = v_plan.term_id;
  v_count := array_length(v_plan.option_term_ids, 1);
  v_guess := case when p_dont_know then 0 else 1.0 / v_count end;
  if v_correct then
    v_numerator := v_prior * (1 - v_slip);
    v_posterior := v_numerator / (v_numerator + (1 - v_prior) * v_guess);
  else
    v_numerator := v_prior * v_slip;
    v_posterior := v_numerator / (v_numerator + (1 - v_prior) * (1 - v_guess));
  end if;
  v_posterior := v_posterior + (1 - v_posterior) * v_learning_rate;

  insert into public.adaptive_trials
    (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
      support_level, option_term_ids, is_standard_format, selected_term_id,
      dont_know, is_correct, latency_ms, p_known_before, p_known_after)
    values (p_session_id, auth.uid(), v_session.quiz_id, v_plan.term_id,
      v_plan.question_id, p_ordinal, 'baseline', 0, v_plan.option_term_ids,
      true, p_selected_term_id, p_dont_know, v_correct, p_latency_ms,
      v_prior, v_posterior);
  insert into public.adaptive_term_state
    (user_id, quiz_id, term_id, p_known, n_correct, n_incorrect,
      consecutive_errors, last_seen_at, last_error_at, last_independent_correct)
    values (auth.uid(), v_session.quiz_id, v_plan.term_id, v_posterior,
      case when v_correct then 1 else 0 end,
      case when v_correct then 0 else 1 end,
      case when v_correct then 0 else 1 end,
      now(), case when v_correct then null else now() end, v_correct)
    on conflict (user_id, quiz_id, term_id) do update set
      p_known = excluded.p_known,
      n_correct = public.adaptive_term_state.n_correct + excluded.n_correct,
      n_incorrect = public.adaptive_term_state.n_incorrect + excluded.n_incorrect,
      consecutive_errors = case when v_correct then 0
        else public.adaptive_term_state.consecutive_errors + 1 end,
      last_seen_at = excluded.last_seen_at,
      last_error_at = case when v_correct then public.adaptive_term_state.last_error_at
        else excluded.last_error_at end,
      last_independent_correct = v_correct;

  if not exists (select 1 from public.adaptive_baseline_plan p
    where p.session_id = p_session_id and not exists
      (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal)) then
    update public.adaptive_sessions set status = 'completed', completed_at = now()
      where id = p_session_id;
  end if;
  return public.adaptive_baseline_view(p_session_id);
end $$;

revoke all on function public.adaptive_baseline_view(uuid) from public;
revoke all on function public.adaptive_begin_baseline(uuid) from public;
revoke all on function public.adaptive_answer_baseline(uuid, integer, uuid, boolean, integer) from public;
revoke all on function public.adaptive_baseline_view(uuid) from anon;
revoke all on function public.adaptive_begin_baseline(uuid) from anon;
revoke all on function public.adaptive_answer_baseline(uuid, integer, uuid, boolean, integer) from anon;
grant execute on function public.adaptive_baseline_view(uuid) to authenticated;
grant execute on function public.adaptive_begin_baseline(uuid) to authenticated;
grant execute on function public.adaptive_answer_baseline(uuid, integer, uuid, boolean, integer) to authenticated;
commit;
