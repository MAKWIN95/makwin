-- Likes come from people who do not own the work, and row security only lets
-- owners update works, so the counter silently stayed at zero.
create or replace function public.update_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update works set like_count = like_count + 1 where id = NEW.work_id;
  elsif TG_OP = 'DELETE' then
    update works set like_count = greatest(like_count - 1, 0) where id = OLD.work_id;
  end if;
  return null;
end;
$$;

update works w
set like_count = (select count(*) from likes l where l.work_id = w.id);

-- Three reports withdraw a work automatically, so each person may only count once
-- and reports must go through the validated API.
create unique index if not exists policy_reports_one_per_reporter
  on policy_reports (work_id, reporter_id);

drop policy if exists reports_auth_insert on policy_reports;
