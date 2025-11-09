import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { songs } from '@/lib/songs';
import Header from '@/components/Header';

export default function Index() {
  const [searchTerm, setSearchTerm] = useState("");
  // (debug removed) - production UI shouldn't display import counts
  
  const handleMakwinClick = () => {
    window.location.href = '/';
  };

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    const term = searchTerm.toLowerCase().trim();
    return songs.filter(song => 
      song.title.toLowerCase().includes(term) || 
      song.artist.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />

      {/* debug info removed from UI */}

      {/* Main Content */}
      <main className="w-full page-enter">
        {/* Grid Container */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {filteredSongs.map((song) => (
              <Link
                key={song.id}
                to={`/song/${song.slug ?? song.id}`}
                className="group flex flex-col cursor-pointer"
              >
                {/* Cover Image */}
                <div className="relative overflow-hidden rounded-2xl glass-effect aspect-square mb-3 transition-all duration-700 ease-out group-hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.2)] group-hover:-translate-y-0.5 group-hover:border-transparent">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.15),transparent)]"></div>
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-transform duration-1000 ease-out group-hover:translate-y-[60%] pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent blur-sm"></div>
                  </div>
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>

                {/* Title and Artist */}
                <div className="flex flex-col min-w-0 px-1">
                  <h3 className="text-xs sm:text-sm font-light text-[hsl(var(--foreground))] whitespace-normal break-words group-hover:text-[hsl(var(--foreground))/0.7] transition-colors duration-300">
                    {song.title}
                  </h3>
                  <p className="text-xs font-light text-[hsl(var(--foreground))/0.4] mt-0.5 transition-colors duration-300 group-hover:text-[hsl(var(--foreground))/0.5]">
                    {song.artist}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
