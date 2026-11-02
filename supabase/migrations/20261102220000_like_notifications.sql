-- Likes as news, without a viral work burying anyone: all the likes a work gets until
-- you look are one single notice that keeps growing, and round numbers get their own.
-- The numbers are always counted from the likes themselves, so taking one back,
-- or liking over and over, cannot inflate them.
begin;

alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in ('work_held', 'work_approved', 'work_rejected', 'admin_granted', 'admin_revoked', 'new_follower', 'work_liked', 'work_milestone'));

-- For a group of likes, how many people since when; for a round number, that number.
alter table public.notifications
  add column amount integer,
  add column since timestamptz;

create unique index notifications_one_open_per_work on public.notifications (user_id, work_id)
  where kind = 'work_liked' and read_at is null;

create unique index notifications_one_per_milestone on public.notifications (user_id, work_id, amount)
  where kind = 'work_milestone';

create index likes_work_recent on public.likes (work_id, created_at desc);

create function public.notify_work_liked() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  work_title text;
  total integer;
begin
  begin
    select user_id, title, like_count into owner_id, work_title, total
    from public.works where id = new.work_id;
    if owner_id is null then
      return null;
    end if;

    -- Your own like is not news. Nor is someone taking theirs back and giving it again
    -- right after you saw it, unless there is already a notice open for it to join.
    if new.user_id <> owner_id and (
      exists (
        select 1 from public.notifications
        where user_id = owner_id and work_id = new.work_id and kind = 'work_liked' and read_at is null
      )
      or not exists (
        select 1 from public.notifications
        where user_id = owner_id and work_id = new.work_id and kind = 'work_liked' and actor_id = new.user_id
          and created_at > now() - interval '1 day'
      )
    ) then
      insert into public.notifications (user_id, kind, work_id, title, actor_id, amount, since)
      values (owner_id, 'work_liked', new.work_id, work_title, new.user_id, 1, new.created_at)
      on conflict (user_id, work_id) where kind = 'work_liked' and read_at is null do update set
        actor_id = excluded.actor_id,
        title = excluded.title,
        created_at = now(),
        amount = (
          select count(*) from public.likes as liked
          where liked.work_id = notifications.work_id
            and liked.user_id <> notifications.user_id
            and liked.created_at >= notifications.since
        );

      -- What was already seen does not pile up for ever.
      delete from public.notifications
      where user_id = owner_id and work_id = new.work_id and kind = 'work_liked' and read_at < now() - interval '30 days';
    end if;

    if total = any (array[10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]) then
      insert into public.notifications (user_id, kind, work_id, title, amount)
      values (owner_id, 'work_milestone', new.work_id, work_title, total)
      on conflict (user_id, work_id, amount) where kind = 'work_milestone' do nothing;
    end if;
  -- A notice failing must never stop the like itself.
  exception when others then
    raise warning 'notify_work_liked: %', sqlerrm;
  end;
  return null;
end;
$$;

-- A like taken back leaves the open notice as if it had never been given.
create function public.forget_work_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  notice public.notifications%rowtype;
  remaining integer;
begin
  begin
    select * into notice from public.notifications
    where work_id = old.work_id and kind = 'work_liked' and read_at is null;
    if not found then
      return null;
    end if;

    select count(*) into remaining from public.likes as liked
    where liked.work_id = old.work_id and liked.user_id <> notice.user_id and liked.created_at >= notice.since;

    if remaining = 0 then
      delete from public.notifications where id = notice.id;
    else
      update public.notifications set
        amount = remaining,
        actor_id = case when actor_id = old.user_id then (
          select liked.user_id from public.likes as liked
          where liked.work_id = old.work_id and liked.user_id <> notice.user_id and liked.created_at >= notice.since
          order by liked.created_at desc limit 1
        ) else actor_id end
      where id = notice.id;
    end if;
  exception when others then
    raise warning 'forget_work_like: %', sqlerrm;
  end;
  return null;
end;
$$;

-- An account going must not take with it the notice of everyone else who liked the
-- work alongside it: the notice passes to the next person, or goes if there is nobody.
create function public.pass_on_like_notices() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  notice public.notifications%rowtype;
  next_actor uuid;
begin
  begin
    for notice in
      select * from public.notifications where actor_id = old.id and kind = 'work_liked'
    loop
      select liked.user_id into next_actor from public.likes as liked
      where liked.work_id = notice.work_id and liked.user_id not in (old.id, notice.user_id)
        and liked.created_at >= notice.since
      order by liked.created_at desc limit 1;

      if next_actor is null then
        delete from public.notifications where id = notice.id;
      else
        update public.notifications set actor_id = next_actor, amount = greatest(amount - 1, 1) where id = notice.id;
      end if;
    end loop;
  exception when others then
    raise warning 'pass_on_like_notices: %', sqlerrm;
  end;
  return old;
end;
$$;

-- Likes of a work that no longer exists have nothing left to say.
create function public.forget_work_notices() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    delete from public.notifications where work_id = old.id and kind in ('work_liked', 'work_milestone');
  exception when others then
    raise warning 'forget_work_notices: %', sqlerrm;
  end;
  return old;
end;
$$;

revoke all on function public.notify_work_liked() from public, anon, authenticated;
revoke all on function public.forget_work_like() from public, anon, authenticated;
revoke all on function public.pass_on_like_notices() from public, anon, authenticated;
revoke all on function public.forget_work_notices() from public, anon, authenticated;

-- Named to run after likes_count_trigger, so the work's count already includes this like.
create trigger likes_notify_work_liked after insert on public.likes
  for each row execute function public.notify_work_liked();

create trigger likes_forget_work_like after delete on public.likes
  for each row execute function public.forget_work_like();

create trigger profiles_pass_on_like_notices before delete on public.profiles
  for each row execute function public.pass_on_like_notices();

create trigger works_forget_notices before delete on public.works
  for each row execute function public.forget_work_notices();

commit;
