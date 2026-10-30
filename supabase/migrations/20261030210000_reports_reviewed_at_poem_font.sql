-- Reviewed reports stay visible for 48 hours, counted from this moment.
alter table public.policy_reports add column if not exists reviewed_at timestamptz;
update public.policy_reports set reviewed_at = now() where reviewed and reviewed_at is null;

-- The typeface the author chose for a poem. Empty means the classic one.
alter table public.works
  add column if not exists poem_font text,
  add constraint works_poem_font_known check (poem_font is null or poem_font in ('clasica', 'elegante', 'moderna', 'maquina', 'manuscrita'));
