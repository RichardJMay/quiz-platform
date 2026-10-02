-- Run after adaptive_teaching.sql. Makes enabled options packs discoverable to
-- signed-in clients and links a matching Verbal Behavior typed pack, if present.
begin;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'adaptive_pack_settings'
    and policyname = 'Read enabled adaptive pack settings') then
    create policy "Read enabled adaptive pack settings"
      on public.adaptive_pack_settings for select to authenticated using (enabled);
  end if;
end $$;

do $$
declare
  v_options uuid := 'a9ca3cef-1a70-4a4e-a2e0-43c54d9f40fb';
  v_typed uuid;
  v_count integer;
begin
  select count(*), min(t.id) into v_count, v_typed
    from public.quizzes t join public.quizzes o on o.id = v_options
    where t.category_id = o.category_id
      and lower(trim(t.title)) = lower(trim(o.title))
      and t.quiz_mode = 'banked' and t.response_mode = 'typed';
  if v_count > 1 then raise exception 'More than one typed Verbal Behavior pack matches'; end if;
  if v_count = 0 and exists (
    select 1 from public.quizzes t join public.quizzes o on o.id = v_options
      where t.category_id = o.category_id and t.quiz_mode = 'banked'
        and t.response_mode = 'typed' and t.title ilike '%Verbal%'
  ) then
    raise exception 'A typed Verbal Behavior pack exists but its title does not match the options pack';
  end if;
  if v_count = 1 then
    insert into public.adaptive_pack_links (typed_quiz_id, options_quiz_id)
      values (v_typed, v_options) on conflict (typed_quiz_id) do nothing;
  end if;
end $$;

commit;
