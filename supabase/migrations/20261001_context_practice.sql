-- Apply after 20261001_finalised_content_and_definition_variants.sql.
-- Context practice uses a separate record: it never updates definition mastery or fluency models.
begin;
create table if not exists public.context_practice_unlocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 quiz_id uuid not null references public.quizzes(id), unlocked_at timestamptz not null default now(),
 primary key(user_id,quiz_id)
);
create table if not exists public.context_practice_attempts (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 quiz_id uuid not null references public.quizzes(id),
 total_questions integer not null check(total_questions>0),
 correct_answers integer not null check(correct_answers>=0 and correct_answers<=total_questions),
 total_time_minutes double precision not null check(total_time_minutes>0 and total_time_minutes<=30),
 fluency_rate double precision not null, accuracy_percentage double precision not null,
 completed_at timestamptz not null default now()
);
alter table public.context_practice_unlocks enable row level security;
alter table public.context_practice_attempts enable row level security;
revoke all on public.context_practice_unlocks,public.context_practice_attempts from anon,authenticated;
grant select on public.context_practice_unlocks,public.context_practice_attempts to authenticated;
drop policy if exists "Own context unlocks" on public.context_practice_unlocks;
create policy "Own context unlocks" on public.context_practice_unlocks for select to authenticated using(user_id=auth.uid());
drop policy if exists "Own context attempts" on public.context_practice_attempts;
create policy "Own context attempts" on public.context_practice_attempts for select to authenticated using(user_id=auth.uid());
create index if not exists context_practice_history_idx on public.context_practice_attempts(user_id,quiz_id,completed_at);

-- Same permanent options-accuracy prerequisite as the existing pathway.
create or replace function public.context_options_accuracy_ready(p_quiz_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return false; end if;
 if exists(select 1 from public.adaptive_pack_progress where user_id=auth.uid() and quiz_id=p_quiz_id) then return true; end if;
 if (select count(distinct coalesce(completed_day_ldn,completed_at::date)) from public.quiz_attempts
   where user_id=auth.uid() and quiz_id=p_quiz_id and attempt_purpose is null
     and completed_at is not null and total_questions>0 and correct_answers=total_questions)>=2 then return true; end if;
 return exists(
  with probes as (
   select id,completed_at,session_id,coalesce(completed and independent and not assistance_used
      and terminal_option_condition and total_questions>0 and correct_answers=total_questions
      and session_id is not null,false) passed
   from public.quiz_attempts where user_id=auth.uid() and quiz_id=p_quiz_id and attempt_purpose='accuracy_probe'
  ), runs as (
   select *,sum(case when passed then 0 else 1 end) over(order by completed_at,id) failure_group from probes
  ) select 1 from runs where passed group by failure_group having count(distinct session_id)>=2
 );
end $$;
revoke all on function public.context_options_accuracy_ready(uuid) from public,anon,authenticated;

create or replace function public.context_practice_access(p_quiz_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.quizzes where id=p_quiz_id and is_listed
   and quiz_mode='banked' and coalesce(response_mode,'options')='options') then return false; end if;
 if not exists(select 1 from public.questions q join public.quiz_term_bank t on t.id=q.correct_term_id
   where q.quiz_id=p_quiz_id and q.prompt_kind='definition' and q.definition_variant=0 and nullif(trim(q.context_question),'') is not null and t.is_active) then return false; end if;
 if exists(select 1 from public.context_practice_unlocks where user_id=auth.uid() and quiz_id=p_quiz_id) then return true; end if;
 if not public.context_options_accuracy_ready(p_quiz_id) then return false; end if;
 -- Match the existing first daily fluency record: practice retries do not count as daily probes.
 if exists(
  select 1 from (
   select a.*,row_number() over(partition by coalesce(a.learner_local_date,a.completed_day_ldn,a.completed_at::date)
     order by a.completed_at,a.id) daily_position
   from public.quiz_attempts a where a.user_id=auth.uid() and a.quiz_id=p_quiz_id
     and a.completed is distinct from false and a.completed_at is not null
     and a.total_questions>0 and a.total_time_minutes>0 and a.total_time_minutes<=30
     and (a.attempt_purpose is null or a.attempt_purpose='fluency_probe')
  ) timings where daily_position=1 and correct_answers=total_questions
    and fluency_rate>=15 and assistance_used is distinct from true
    and hint_used_any is distinct from true and fewer_options_used is distinct from true
 ) then
  insert into public.context_practice_unlocks(user_id,quiz_id) values(auth.uid(),p_quiz_id) on conflict do nothing;
  return true;
 end if;
 return false;
end $$;

create or replace function public.context_practice_packs()
returns setof uuid language plpgsql security definer set search_path='' as $$
declare p record;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 for p in select id from public.quizzes where is_listed and quiz_mode='banked'
   and coalesce(response_mode,'options')='options' loop
  if public.context_practice_access(p.id) then return next p.id; end if;
 end loop;
end $$;

create or replace function public.context_practice_items(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_terms jsonb; v_questions jsonb;
begin
 if not public.context_practice_access(p_quiz_id) then raise exception 'Reach the options fluency aim to unlock practice questions'; end if;
 select jsonb_agg(jsonb_build_object('id',id,'term_text',term_text) order by random()) into v_terms
 from public.quiz_term_bank where quiz_id=p_quiz_id and is_active;
 select jsonb_agg(jsonb_build_object('id',q.id,'question_text',q.context_question,'correct_term_id',q.correct_term_id,
   'explanation',q.question_text,'hint',null) order by random()) into v_questions
 from public.questions q join public.quiz_term_bank t on t.id=q.correct_term_id
 where q.quiz_id=p_quiz_id and t.is_active and q.prompt_kind='definition' and q.definition_variant=0 and nullif(trim(q.context_question),'') is not null;
 if jsonb_array_length(v_terms)<>jsonb_array_length(v_questions) then raise exception 'Each active term needs one context question'; end if;
 return jsonb_build_object('terms',v_terms,'questions',v_questions);
end $$;

create table if not exists public.context_practice_responses (
 user_id uuid not null references auth.users(id) on delete cascade, attempt_id uuid not null,
 quiz_id uuid not null references public.quizzes(id), question_id uuid not null references public.questions(id),
 selected_term_id uuid not null references public.quiz_term_bank(id), is_correct boolean not null,
 presented_question text not null, responded_at timestamptz not null default now(),
 primary key(user_id,attempt_id,question_id)
);
alter table public.context_practice_responses enable row level security;
revoke all on public.context_practice_responses from anon,authenticated;
grant select on public.context_practice_responses to authenticated;
drop policy if exists "Own context responses" on public.context_practice_responses;
create policy "Own context responses" on public.context_practice_responses for select to authenticated using(user_id=auth.uid());
create or replace function public.save_context_response(p_attempt_id uuid,p_quiz_id uuid,p_question_id uuid,p_selected_term_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare q public.questions%rowtype;
begin
 if not public.context_practice_access(p_quiz_id) then raise exception 'Practice questions are locked'; end if;
 if p_attempt_id is null then raise exception 'Missing attempt ID'; end if;
 select * into q from public.questions where id=p_question_id and quiz_id=p_quiz_id
  and prompt_kind='definition' and definition_variant=0 and nullif(trim(context_question),'') is not null;
 if not found then raise exception 'Context question not found'; end if;
 if not exists(select 1 from public.quiz_term_bank where id=q.correct_term_id and quiz_id=p_quiz_id and is_active)
   or not exists(select 1 from public.quiz_term_bank where id=p_selected_term_id and quiz_id=p_quiz_id and is_active) then
  raise exception 'Response term is not in this active pack';
 end if;
 insert into public.context_practice_responses(user_id,attempt_id,quiz_id,question_id,selected_term_id,is_correct,presented_question)
 values(auth.uid(),p_attempt_id,p_quiz_id,q.id,p_selected_term_id,p_selected_term_id=q.correct_term_id,q.context_question)
 on conflict(user_id,attempt_id,question_id) do nothing;
end $$;

create or replace function public.save_context_practice(p_attempt_id uuid,p_quiz_id uuid,p_total integer,p_correct integer,p_minutes double precision)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not public.context_practice_access(p_quiz_id) then raise exception 'Practice questions are locked'; end if;
 if p_attempt_id is null or p_total is null or p_correct is null or p_minutes is null
   or p_minutes<=0 or p_minutes>30 or p_minutes='NaN'::double precision or p_correct<0 or p_correct>p_total
   or p_total<>(select count(*) from public.quiz_term_bank where quiz_id=p_quiz_id and is_active) then
  raise exception 'Invalid completed context timing';
 end if;
 if p_total<>(select count(*) from public.context_practice_responses where user_id=auth.uid() and attempt_id=p_attempt_id and quiz_id=p_quiz_id)
   or p_correct<>(select count(*) from public.context_practice_responses where user_id=auth.uid() and attempt_id=p_attempt_id and quiz_id=p_quiz_id and is_correct) then
  raise exception 'All item responses must be saved before this timing can be recorded';
 end if;
 insert into public.context_practice_attempts(id,user_id,quiz_id,total_questions,correct_answers,total_time_minutes,fluency_rate,accuracy_percentage)
 values(p_attempt_id,auth.uid(),p_quiz_id,p_total,p_correct,p_minutes,p_correct/p_minutes,100.0*p_correct/p_total)
 on conflict(id) do nothing;
 if not exists(select 1 from public.context_practice_attempts where id=p_attempt_id and user_id=auth.uid() and quiz_id=p_quiz_id) then
  raise exception 'Attempt could not be saved';
 end if;
 return p_attempt_id;
end $$;
revoke all on function public.context_practice_access(uuid),public.context_practice_packs(),public.context_practice_items(uuid),public.save_context_practice(uuid,uuid,integer,integer,double precision),public.save_context_response(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.context_practice_access(uuid),public.context_practice_packs(),public.context_practice_items(uuid),public.save_context_practice(uuid,uuid,integer,integer,double precision),public.save_context_response(uuid,uuid,uuid,uuid) to authenticated;
commit;
