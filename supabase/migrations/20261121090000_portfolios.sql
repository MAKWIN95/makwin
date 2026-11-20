-- Artists' portfolios. Only adds: a new table, a function to read it and PDF in the
-- works bucket. Nothing that exists changes, so pages already open keep working.

create table if not exists public.portfolios (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- 'private': only its owner. 'link': whoever has the secret link. 'public': everyone, from the profile.
  visibility text not null default 'private' check (visibility in ('private', 'link', 'public')),
  share_key text not null,
  -- Everything the owner made, as they made it.
  content jsonb not null default '{}'::jsonb,
  -- What others see: hidden parts left out, uploaded pictures and videos only once checked.
  public_content jsonb not null default '{}'::jsonb,
  -- Uploaded pictures and videos the automatic check let through, or stopped.
  checked_media text[] not null default '{}',
  held_media text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

-- The owner reads their own. Nobody writes from the page: every save goes through the
-- server, which checks it first (words, own files, pictures).
drop policy if exists "portfolios_owner_read" on public.portfolios;
create policy "portfolios_owner_read" on public.portfolios
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.portfolios from anon;
revoke insert, update, delete on public.portfolios from authenticated;

-- One way in for everyone: the owner gets all of it, anyone else only what may be seen,
-- and only if it is public or they bring the right secret link.
create or replace function public.get_portfolio(p_username text, p_key text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', f.user_id,
    'visibility', f.visibility,
    'content', case when f.user_id = auth.uid() then f.content else f.public_content end,
    'updated_at', f.updated_at,
    'mine', coalesce(f.user_id = auth.uid(), false),
    'share_key', case when f.user_id = auth.uid() then f.share_key end,
    'checked_media', case when f.user_id = auth.uid() then to_jsonb(f.checked_media) end,
    'held_media', case when f.user_id = auth.uid() then to_jsonb(f.held_media) end
  )
  from public.profiles p
  join public.portfolios f on f.user_id = p.id
  where p.username = lower(p_username)
    and not coalesce(p.is_banned, false)
    and (
      f.user_id = auth.uid()
      or f.visibility = 'public'
      or (f.visibility = 'link' and p_key is not null and f.share_key = p_key)
    )
$$;

revoke all on function public.get_portfolio(text, text) from public;
grant execute on function public.get_portfolio(text, text) to anon, authenticated;

-- A portfolio may hold a PDF (a dossier, a rider), up to the same 25 MB as the rest.
update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif', 'audio/*', 'video/*', 'application/pdf']
  where id = 'works';
