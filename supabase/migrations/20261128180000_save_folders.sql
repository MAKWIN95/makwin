-- Folders inside «Guardados» (v1.1.39), like TikTok's collections: each person can make
-- folders with the name they like and put their saved works in them. Private: only the
-- owner sees or touches their folders. Additive: older pages simply don't use them.
begin;

create table public.save_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create index save_folders_by_owner on public.save_folders (user_id, created_at);

-- A work can be in several folders; the same work only once per folder.
create table public.save_folder_works (
  folder_id uuid not null references public.save_folders (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, work_id)
);
create index save_folder_works_by_owner on public.save_folder_works (user_id, work_id);

alter table public.save_folders enable row level security;
alter table public.save_folder_works enable row level security;

create policy save_folders_own on public.save_folders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only into your own folder, and only a work you have saved.
create policy save_folder_works_own on public.save_folder_works
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.save_folders f where f.id = folder_id and f.user_id = auth.uid())
    and exists (select 1 from public.saves s where s.user_id = auth.uid() and s.work_id = save_folder_works.work_id)
  );

revoke all on public.save_folders, public.save_folder_works from anon, authenticated;
grant select, insert, update (name), delete on public.save_folders to authenticated;
grant select, insert, delete on public.save_folder_works to authenticated;
grant all on public.save_folders, public.save_folder_works to service_role;

-- No one ends up with hundreds of folders by accident (or on purpose).
create function public.limit_save_folders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.save_folders where user_id = new.user_id) >= 100 then
    raise exception 'Has llegado al máximo de 100 carpetas.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger save_folders_limit before insert on public.save_folders
  for each row execute function public.limit_save_folders();

-- Taking a work out of «Guardados» takes it out of your folders too.
create function public.forget_unsaved_in_folders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.save_folder_works where user_id = old.user_id and work_id = old.work_id;
  return null;
end;
$$;
create trigger saves_forget_in_folders after delete on public.saves
  for each row execute function public.forget_unsaved_in_folders();

commit;
