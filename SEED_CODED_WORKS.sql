-- Seed script for coded works
-- Creates a MAKWIN Bot user and 6 predefined works with full functionality

-- 1. Insert MAKWIN Bot user if not exists
INSERT INTO profiles (id, username, display_name, email, avatar_url, bio, is_verified, created_at, updated_at)
VALUES (
  'makwin-bot-user-id',
  'makwin',
  'MAKWIN',
  'bot@makwin.com',
  'https://via.placeholder.com/150?text=MAKWIN',
  'Official MAKWIN curated works',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert the 6 coded works
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
) VALUES
-- Work 1: Before Summer Ends
(
  'makwin-song-1',
  'makwin-bot-user-id',
  'Before Summer Ends',
  'The feeling that summer is ending and you haven''t fulfilled what you set out to do.',
  'cancion',
  'https://example.com/audio/before-summer-ends.mp3',
  '/Portadas/Before Summer Ends.jpg',
  'My life takes down when you''re around...',
  ARRAY['summer', 'freedom', 'pressure', 'growth'],
  'published',
  0,
  0,
  'en',
  NOW(),
  NOW()
),
-- Work 2: Porfavor, Quédate
(
  'makwin-song-2',
  'makwin-bot-user-id',
  'Porfavor, Quédate',
  'A primera vista puede parecer que esta canción habla sobre la dependencia emocional, y en parte es cierto.',
  'cancion',
  'https://example.com/audio/porfavor-quedate.mp3',
  '/Portadas/Porfavor, Quédate.jpg',
  'Qué haría sin ti...',
  ARRAY['love', 'dependency', 'emotions', 'spanish'],
  'published',
  0,
  0,
  'es',
  NOW(),
  NOW()
),
-- Work 3: ID '3'
(
  'makwin-song-3',
  'makwin-bot-user-id',
  'Song #3',
  'Third curated work from MAKWIN collection',
  'cancion',
  'https://example.com/audio/song-3.mp3',
  '/Portadas/Song3.jpg',
  'Lyrics here...',
  ARRAY['curated', 'music', 'artist'],
  'published',
  0,
  0,
  'en',
  NOW(),
  NOW()
),
-- Work 4: ID '4'
(
  'makwin-song-4',
  'makwin-bot-user-id',
  'Song #4',
  'Fourth curated work from MAKWIN collection',
  'cancion',
  'https://example.com/audio/song-4.mp3',
  '/Portadas/Song4.jpg',
  'Lyrics here...',
  ARRAY['curated', 'music', 'artist'],
  'published',
  0,
  0,
  'en',
  NOW(),
  NOW()
),
-- Work 5: ID '5'
(
  'makwin-song-5',
  'makwin-bot-user-id',
  'Song #5',
  'Fifth curated work from MAKWIN collection',
  'cancion',
  'https://example.com/audio/song-5.mp3',
  '/Portadas/Song5.jpg',
  'Lyrics here...',
  ARRAY['curated', 'music', 'artist'],
  'published',
  0,
  0,
  'en',
  NOW(),
  NOW()
),
-- Work 6: ID '6'
(
  'makwin-song-6',
  'makwin-bot-user-id',
  'Song #6',
  'Sixth curated work from MAKWIN collection',
  'cancion',
  'https://example.com/audio/song-6.mp3',
  '/Portadas/Song6.jpg',
  'Lyrics here...',
  ARRAY['curated', 'music', 'artist'],
  'published',
  0,
  0,
  'en',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Verify insertion
SELECT 'MAKWIN Bot Profile' as description, COUNT(*) as profiles_count FROM profiles WHERE username = 'makwin'
UNION ALL
SELECT 'Coded Works' as description, COUNT(*) as works_count FROM works WHERE user_id = 'makwin-bot-user-id';
