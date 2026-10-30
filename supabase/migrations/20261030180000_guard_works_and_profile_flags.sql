-- Apply right AFTER the release that publishes through /api/publish-work is live:
-- older clients still insert into works directly and would start failing.

-- Row security lets owners write their whole row, which allowed publishing
-- straight past the content filter. Works are now created and edited only by the
-- server; owners can still delete their own. Security definer functions such as
-- the like counter run as their owner, so they are not affected.
create or replace function public.guard_works_client_writes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'works can only be changed through the server' using errcode = '42501';
  end if;
  return NEW;
end;
$$;

drop trigger if exists works_client_writes_guard on public.works;
create trigger works_client_writes_guard
  before insert or update on public.works
  for each row execute function public.guard_works_client_writes();

-- The same row security let people verify or unban themselves, and clear the
-- finished-setup mark that keeps the first-password route closed. Ignored rather
-- than refused, so normal profile saves keep working.
create or replace function public.guard_profile_flags()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if TG_OP = 'INSERT' then
      NEW.is_verified := false;
      NEW.is_banned := false;
    else
      NEW.is_verified := OLD.is_verified;
      NEW.is_banned := OLD.is_banned;
      if OLD.google_setup_completed then
        NEW.google_setup_completed := true;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profile_flags_guard on public.profiles;
create trigger profile_flags_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile_flags();
