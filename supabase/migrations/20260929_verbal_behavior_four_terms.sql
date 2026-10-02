-- Adds four terms to the existing Verbal Behavior pack(s). No new quiz is
-- created. Historical sessions and permanent fluency unlocks are untouched.
-- An open session retains its original term snapshot; the next one uses 16.
begin;

do $$
declare
  v_options uuid := 'a9ca3cef-1a70-4a4e-a2e0-43c54d9f40fb';
  v_typed uuid;
  v_pack uuid;
  v_term uuid;
  v_term_count integer;
  v_question_count integer;
  v_link_count integer;
  v_old_definition text;
  v_row record;
begin
  if not exists (select 1 from public.quizzes q
    where q.id = v_options and q.title = 'Principles: Verbal Behavior'
      and q.quiz_mode = 'banked' and coalesce(q.response_mode, 'options') = 'options') then
    raise exception 'Expected Verbal Behavior options pack not found';
  end if;

  select count(*), (array_agg(l.typed_quiz_id))[1] into v_link_count, v_typed
    from public.adaptive_pack_links l
    join public.quizzes q on q.id = l.typed_quiz_id
    where l.options_quiz_id = v_options and q.quiz_mode = 'banked'
      and q.response_mode = 'typed' and q.title = 'Principles: Verbal Behavior';
  if v_link_count > 1 then raise exception 'Several typed packs are linked to this options pack'; end if;
  if v_link_count = 0 and exists (
    select 1 from public.quizzes t join public.quizzes o on o.id = v_options
      where t.category_id = o.category_id and t.quiz_mode = 'banked'
        and t.response_mode = 'typed' and t.title = o.title
  ) then
    raise exception 'Matching typed pack exists but is not linked; no content was changed';
  end if;

  -- Compare the original bank so a rerun can fill a newly linked typed pack.
  if v_typed is not null and (
    exists (select lower(trim(term_text)) from public.quiz_term_bank where quiz_id = v_options
      and lower(trim(term_text)) not in ('multiple control', 'convergent multiple control',
        'divergent multiple control', 'autoclitic')
      except select lower(trim(term_text)) from public.quiz_term_bank where quiz_id = v_typed
      and lower(trim(term_text)) not in ('multiple control', 'convergent multiple control',
        'divergent multiple control', 'autoclitic'))
    or exists (select lower(trim(term_text)) from public.quiz_term_bank where quiz_id = v_typed
      and lower(trim(term_text)) not in ('multiple control', 'convergent multiple control',
        'divergent multiple control', 'autoclitic')
      except select lower(trim(term_text)) from public.quiz_term_bank where quiz_id = v_options
      and lower(trim(term_text)) not in ('multiple control', 'convergent multiple control',
        'divergent multiple control', 'autoclitic'))
  ) then
    raise exception 'Options and typed Verbal Behavior term banks differ; review before importing';
  end if;

  for v_pack in select v_options union select v_typed where v_typed is not null loop
    for v_row in select * from (values
      ('Multiple Control',
       'Control of verbal behavior by more than one variable at once, or of several responses by one variable',
       'Saying ''coffee'' is evoked both by seeing the pot and by being tired.'),
      ('Convergent Multiple Control',
       'A single verbal response controlled by more than one variable at the same time',
       'A child says ''cookie'' because they see a cookie and also want one (tact and mand).'),
      ('Divergent Multiple Control',
       'A single variable that strengthens several different verbal responses',
       'Seeing a dog can evoke ''dog'', ''puppy'' or ''woof''.'),
      ('Autoclitic',
       'Verbal behavior that depends on the speaker''s other verbal behavior and modifies its effect on the listener',
       '''I think it''s raining'': ''I think'' tells the listener how certain the speaker is.')
    ) as content(term_text, definition_text, example_text) loop
      select count(*), (array_agg(t.id))[1] into v_term_count, v_term
        from public.quiz_term_bank t where t.quiz_id = v_pack
          and lower(trim(t.term_text)) = lower(v_row.term_text);
      if v_term_count > 1 then raise exception 'Duplicate term: %', v_row.term_text; end if;
      if v_term_count = 0 then
        insert into public.quiz_term_bank (quiz_id, term_text)
          values (v_pack, v_row.term_text) returning id into v_term;
      end if;

      select count(*), (array_agg(q.question_text))[1]
        into v_question_count, v_old_definition
        from public.questions q where q.quiz_id = v_pack and q.correct_term_id = v_term;
      if v_question_count > 1 then raise exception 'Multiple definitions for %', v_row.term_text; end if;
      if v_question_count = 0 then
        insert into public.questions (quiz_id, question_text, correct_term_id, explanation)
          values (v_pack, v_row.definition_text, v_term, v_row.example_text);
      elsif v_old_definition is distinct from v_row.definition_text then
        raise exception 'Existing definition differs for %; no content was changed', v_row.term_text;
      end if;

      insert into public.adaptive_term_metadata as m (term_id, difficulty, example_in_context)
        values (v_term, 3, v_row.example_text)
        on conflict (term_id) do update set
          difficulty = coalesce(m.difficulty, excluded.difficulty),
          example_in_context = coalesce(m.example_in_context, excluded.example_in_context),
          updated_at = now();
    end loop;

    if (select count(*) from public.quiz_term_bank where quiz_id = v_pack) <> 16 or
       (select count(distinct correct_term_id) from public.questions where quiz_id = v_pack) <> 16 then
      raise exception 'Pack % did not finish with 16 terms and definitions', v_pack;
    end if;
  end loop;
end $$;

commit;
