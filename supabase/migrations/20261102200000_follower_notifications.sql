-- Someone new following you is news too. Follows are written straight from the app,
-- so the database itself leaves the notice, and nobody can write one by hand.
begin;

alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in ('work_held', 'work_approved', 'work_rejected', 'admin_granted', 'admin_revoked', 'new_follower'));

alter table public.notifications
  add column actor_id uuid references public.profiles (id) on delete cascade;

-- However many times someone follows you again, it is one notice.
create unique index notifications_one_per_follower on public.notifications (user_id, actor_id)
  where kind = 'new_follower';

-- A notice failing must never stop the follow itself.
create function public.notify_new_follower() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    insert into public.notifications (user_id, kind, actor_id)
    values (new.following_id, 'new_follower', new.follower_id)
    on conflict (user_id, actor_id) where kind = 'new_follower' do nothing;
  exception when others then
    raise warning 'notify_new_follower: %', sqlerrm;
  end;
  return null;
end;
$$;

-- Changing your mind before they have seen it leaves nothing behind.
create function public.forget_new_follower() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    delete from public.notifications
    where user_id = old.following_id and actor_id = old.follower_id and kind = 'new_follower' and read_at is null;
  exception when others then
    raise warning 'forget_new_follower: %', sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.notify_new_follower() from public, anon, authenticated;
revoke all on function public.forget_new_follower() from public, anon, authenticated;

create trigger follows_notify_new_follower after insert on public.follows
  for each row execute function public.notify_new_follower();

create trigger follows_forget_new_follower after delete on public.follows
  for each row execute function public.forget_new_follower();

commit;
