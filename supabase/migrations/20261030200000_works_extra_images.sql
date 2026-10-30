-- Carousels: the first photo stays in file_url, so everything that shows one image
-- keeps working. The rest of the photos of the same work, in order, live here.
alter table public.works
  add column if not exists extra_images text[] not null default '{}',
  add constraint works_extra_images_max check (cardinality(extra_images) <= 9);
