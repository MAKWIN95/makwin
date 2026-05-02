-- SEED_CODED_WORKS.sql
-- Versión limpia: usa el usuario existente @makwin
-- Inserta 6 obras con soporte completo para likes/saves

-- 1. Obtener el user_id real de @makwin
WITH makwin_user AS (
  SELECT id FROM profiles WHERE username = 'makwin' LIMIT 1
)

-- 2. Insertar obras
INSERT INTO works (
  id,
  user_id,
  title,
  description,
  work_type,
  file_url,
  cover_url,
  lyrics,
  hashtags,
  status,
  like_count,
  view_count,
  language,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  makwin_user.id,
  w.title,
  w.description,
  w.work_type,
  w.file_url,
  w.cover_url,
  w.lyrics,
  string_to_array(w.hashtags, ','),
  w.status,
  0,
  0,
  w.language,
  NOW(),
  NOW()
FROM makwin_user,
(
  VALUES
  (
    'Before Summer Ends',
    'The feeling that summer is ending and you haven''t fulfilled what you set out to do.',
    'cancion',
    'https://example.com/audio/before-summer-ends.mp3',
    '/Portadas/Before Summer Ends.jpg',
    'My life takes down when you''re around...',
    'summer,freedom,pressure,growth',
    'published',
    'en'
  ),
  (
    'Porfavor, Quédate',
    'Dependencia emocional y contradicción interna.',
    'cancion',
    'https://example.com/audio/porfavor-quedate.mp3',
    '/Portadas/Porfavor, Quédate.jpg',
    'Qué haría sin ti...',
    'love,dependency,emotions,spanish',
    'published',
    'es'
  ),
  (
    'Song #3',
    'Third curated work',
    'cancion',
    'https://example.com/audio/song-3.mp3',
    '/Portadas/Song3.jpg',
    'Lyrics...',
    'curated,music',
    'published',
    'en'
  ),
  (
    'Song #4',
    'Fourth curated work',
    'cancion',
    'https://example.com/audio/song-4.mp3',
    '/Portadas/Song4.jpg',
    'Lyrics...',
    'curated,music',
    'published',
    'en'
  ),
  (
    'Song #5',
    'Fifth curated work',
    'cancion',
    'https://example.com/audio/song-5.mp3',
    '/Portadas/Song5.jpg',
    'Lyrics...',
    'curated,music',
    'published',
    'en'
  ),
  (
    'Song #6',
    'Sixth curated work',
    'cancion',
    'https://example.com/audio/song-6.mp3',
    '/Portadas/Song6.jpg',
    'Lyrics...',
    'curated,music',
    'published',
    'en'
  )
) AS w(
  title,
  description,
  work_type,
  file_url,
  cover_url,
  lyrics,
  hashtags,
  status,
  language
);

-- 3. Verificación
SELECT
  'Coded Works Inserted' as label,
  COUNT(*) as total
FROM works
WHERE user_id = (SELECT id FROM profiles WHERE username = 'makwin');