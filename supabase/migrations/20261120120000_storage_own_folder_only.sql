-- Files can only go into your own folder, and only photos, audio or video of a normal size.
-- Before this, any signed-in account could add files anywhere in the "works" and "avatars"
-- buckets (it could not change or delete someone else's, those rules were already per folder).
-- Applied by hand in the Supabase SQL editor on 2026-11-20, with the owner's OK.

drop policy if exists "avatars_auth_upload" on storage.objects;
drop policy if exists "works_auth_upload" on storage.objects;
drop policy if exists "works_owner_upload" on storage.objects;

-- "Users can upload their own avatar" already keeps avatars inside the own folder.
create policy "works_owner_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'works' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Same sizes the app already allows: 5 MB for a profile photo, 25 MB for a work's file.
update storage.buckets
  set file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']
  where id = 'avatars';

update storage.buckets
  set file_size_limit = 26214400,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif', 'audio/*', 'video/*']
  where id = 'works';
