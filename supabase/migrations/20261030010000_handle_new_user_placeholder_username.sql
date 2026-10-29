-- Google sign-ups carry no chosen username, so handle_new_user used the email
-- prefix. When that prefix was already a username (e.g. makwin@gmail.com while
-- @makwin exists) the unique constraint aborted the auth.users insert and the
-- person could not sign up at all ("Database error saving new user"). It also
-- reserved the prefix for people who never finished onboarding.
--
-- Users without a chosen username now get a unique placeholder until Google
-- onboarding sets the real one. Email sign-ups keep the username they picked.
--
-- Rollback: re-create the previous body, which used
--   coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
-- as the username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(lower(trim(new.raw_user_meta_data->>'username')), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 12)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
