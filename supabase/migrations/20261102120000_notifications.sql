-- What used to reach people by email and does not need to: the news about their
-- works and their account, waiting for them in the app. Only the server writes
-- here; people can read their own and mark them as read, nothing else.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('work_held', 'work_approved', 'work_rejected', 'admin_granted', 'admin_revoked')),
  work_id uuid references public.works (id) on delete set null,
  title text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_recent on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_read_own on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

create policy notifications_mark_own on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
