-- ================================================================
-- MAKWIN — Supabase Schema completo
-- Pegar en: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid references auth.users on delete cascade primary key,
  username      text unique not null,
  display_name  text,
  bio           text,
  avatar_url    text,
  website       text,
  is_verified   boolean default false,
  is_banned     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Trigger: crear perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── WORKS ────────────────────────────────────────────────────────────────────
create table if not exists works (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade not null,
  title         text not null,
  description   text,
  work_type     text not null check (work_type in ('pintura','fotografia','poema','cancion','video')),
  file_url      text,
  cover_url     text,
  lyrics        text,
  hashtags      text[] default '{}',
  is_for_sale   boolean default false,
  price         numeric(10,2),
  status        text default 'published' check (status in ('published','removed_policy','removed_user')),
  policy_flags  text[] default '{}',
  like_count    integer default 0,
  view_count    integer default 0,
  language      text default 'es',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Índices para el feed algorítmico
create index if not exists works_created_at_idx on works(created_at desc);
create index if not exists works_user_id_idx on works(user_id);
create index if not exists works_status_idx on works(status);
create index if not exists works_like_count_idx on works(like_count desc);

-- ─── LIKES ────────────────────────────────────────────────────────────────────
create table if not exists likes (
  user_id     uuid references profiles(id) on delete cascade,
  work_id     uuid references works(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, work_id)
);

-- Trigger: actualizar like_count en works automáticamente
-- Incluye logging y error handling
create or replace function update_like_count()
returns trigger language plpgsql as $$
declare
  v_work_id uuid;
  v_affected_rows integer;
begin
  if TG_OP = 'INSERT' then
    v_work_id := NEW.work_id;
    update works set like_count = like_count + 1 where id = v_work_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    if v_affected_rows = 0 then
      raise warning '[update_like_count:INSERT] No work found with id: %', v_work_id;
    end if;
    
  elsif TG_OP = 'DELETE' then
    v_work_id := OLD.work_id;
    update works set like_count = greatest(like_count - 1, 0) where id = v_work_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    if v_affected_rows = 0 then
      raise warning '[update_like_count:DELETE] No work found with id: %', v_work_id;
    end if;
  end if;
  
  return null;
exception when others then
  raise warning '[update_like_count] Error: % - %', SQLSTATE, SQLERRM;
  return null;
end;
$$;

drop trigger if exists likes_count_trigger on likes;
create trigger likes_count_trigger
  after insert or delete on likes
  for each row execute procedure update_like_count();

-- ─── SAVES (FAVORITOS) ────────────────────────────────────────────────────────
create table if not exists saves (
  user_id     uuid references profiles(id) on delete cascade,
  work_id     uuid references works(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, work_id)
);

-- ─── FOLLOWS ──────────────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id   uuid references profiles(id) on delete cascade,
  following_id  uuid references profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ─── POLICY REPORTS ───────────────────────────────────────────────────────────
create table if not exists policy_reports (
  id          uuid primary key default gen_random_uuid(),
  work_id     uuid references works(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete cascade,
  reason      text not null check (reason in ('porno','gore','spam','acoso','otro')),
  details     text,
  reviewed    boolean default false,
  created_at  timestamptz default now()
);

-- Auto-ocultar obra si supera 3 reportes sin revisar
create or replace function auto_flag_work()
returns trigger language plpgsql security definer as $$
declare
  report_count integer;
begin
  select count(*) into report_count
  from policy_reports
  where work_id = NEW.work_id and reviewed = false;

  if report_count >= 3 then
    update works
    set status = 'removed_policy',
        policy_flags = array_append(policy_flags, NEW.reason)
    where id = NEW.work_id and status = 'published';
  end if;
  return NEW;
end;
$$;

drop trigger if exists auto_flag_trigger on policy_reports;
create trigger auto_flag_trigger
  after insert on policy_reports
  for each row execute procedure auto_flag_work();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

-- Profiles: todo el mundo puede leer, solo el dueño edita
alter table profiles enable row level security;
create policy "profiles_public_read" on profiles for select using (true);
create policy "profiles_owner_update" on profiles for update using (auth.uid() = id);

-- Works: solo obras publicadas son visibles para todos
alter table works enable row level security;
create policy "works_public_read" on works for select using (status = 'published');
create policy "works_owner_all" on works for all using (auth.uid() = user_id);

-- Likes: autenticados pueden leer todos los likes, solo insertar/borrar los propios
alter table likes enable row level security;
create policy "likes_public_read" on likes for select using (true);
create policy "likes_owner_write" on likes for insert with check (auth.uid() = user_id);
create policy "likes_owner_delete" on likes for delete using (auth.uid() = user_id);

-- Saves: privados, solo el dueño ve los suyos
alter table saves enable row level security;
create policy "saves_owner_all" on saves for all using (auth.uid() = user_id);

-- Follows: públicos
alter table follows enable row level security;
create policy "follows_public_read" on follows for select using (true);
create policy "follows_owner_write" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_owner_delete" on follows for delete using (auth.uid() = follower_id);

-- Reports: solo autenticados, anónimos para el reportado
alter table policy_reports enable row level security;
create policy "reports_auth_insert" on policy_reports for insert with check (auth.uid() = reporter_id);
create policy "reports_owner_read" on policy_reports for select using (auth.uid() = reporter_id);

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────
-- Ejecutar en Supabase Dashboard → Storage → New bucket:
--   Nombre: "avatars"   → Public: YES
--   Nombre: "works"     → Public: YES
--
-- O ejecutar estas políticas tras crear los buckets:
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('works', 'works', true) on conflict do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_auth_upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_owner_delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "works_public_read" on storage.objects for select using (bucket_id = 'works');
create policy "works_auth_upload" on storage.objects for insert with check (bucket_id = 'works' and auth.role() = 'authenticated');
create policy "works_owner_delete" on storage.objects for delete using (bucket_id = 'works' and auth.uid()::text = (storage.foldername(name))[1]);

-- ─── FUNCIÓN DE FEED ALGORÍTMICO ─────────────────────────────────────────────
create or replace function get_feed(
  p_user_id uuid default null,
  p_limit   integer default 40,
  p_offset  integer default 0
)
returns table (
  id uuid, user_id uuid, title text, description text, work_type text,
  file_url text, cover_url text, hashtags text[], is_for_sale boolean,
  price numeric, like_count integer, view_count integer, created_at timestamptz,
  username text, display_name text, avatar_url text,
  liked_by_me boolean, saved_by_me boolean, score numeric
)
language sql stable as $$
  select
    w.id, w.user_id, w.title, w.description, w.work_type,
    w.file_url, w.cover_url, w.hashtags, w.is_for_sale,
    w.price, w.like_count, w.view_count, w.created_at,
    p.username, p.display_name, p.avatar_url,
    (case when p_user_id is not null then exists(select 1 from likes l where l.user_id = p_user_id and l.work_id = w.id) else false end) as liked_by_me,
    (case when p_user_id is not null then exists(select 1 from saves s where s.user_id = p_user_id and s.work_id = w.id) else false end) as saved_by_me,
    (
      w.like_count * 3.0
      + w.view_count * 0.5
      + case
          when w.created_at > now() - interval '6 hours'  then 20
          when w.created_at > now() - interval '24 hours' then 10
          when w.created_at > now() - interval '7 days'   then 5
          else 0
        end
      + case
          when p_user_id is not null and exists(
            select 1 from follows f where f.follower_id = p_user_id and f.following_id = w.user_id
          ) then 15
          else 0
        end
    )::numeric as score
  from works w
  join profiles p on w.user_id = p.id
  where w.status = 'published' and p.is_banned = false
  order by score desc, w.created_at desc
  limit p_limit
  offset p_offset;
$$;
