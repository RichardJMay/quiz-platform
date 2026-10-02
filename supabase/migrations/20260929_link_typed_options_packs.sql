-- Pair each listed typed pack with the uniquely matching listed options pack
-- in the same content area. Safe to rerun. Review the unmatched rows returned
-- at the end; those typed packs remain unavailable until explicitly paired.
begin;

with matching as (
  select t.id as typed_id, min(o.id::text)::uuid as options_id, count(*) as matches
  from public.quizzes t
  join public.quizzes o on o.category_id = t.category_id
    and lower(trim(o.title)) = lower(trim(t.title))
    and o.quiz_mode = 'banked' and coalesce(o.response_mode, 'options') = 'options'
    and o.is_listed = true
  where t.quiz_mode = 'banked' and t.response_mode = 'typed' and t.is_listed = true
  group by t.id
)
insert into public.adaptive_pack_links (typed_quiz_id, options_quiz_id)
select typed_id, options_id from matching where matches = 1
on conflict (typed_quiz_id) do nothing;

commit;

select c.name as content_area, t.title as typed_pack, t.id as typed_quiz_id
from public.quizzes t
join public.quiz_categories c on c.id = t.category_id
left join public.adaptive_pack_links l on l.typed_quiz_id = t.id
where t.quiz_mode = 'banked' and t.response_mode = 'typed'
  and t.is_listed = true and l.typed_quiz_id is null
order by c.name, t.title;
