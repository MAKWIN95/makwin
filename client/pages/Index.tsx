import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { songs } from '@/lib/songs';
import Header from '@/components/Header';

interface PublishedWork {
  submissionId: string;
  artistName: string;
  workType: string;
  title: string;
  description: string;
  fileUrl: string | null;
  coverImageUrl?: string | null;
  status: string;
  publishedAt: string;
}

export default function Index() {
  const [searchTerm, setSearchTerm] = useState("");
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  
  const handleMakwinClick = () => {
    window.location.href = '/';
  };

  // Fetch published works
  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const response = await fetch("/api/get-submissions");
        const data = await response.json();
        if (data.submissions) {
          const published = data.submissions.filter(
            (work: PublishedWork) => work.status === "published"
          );
          setWorks(published);
        }
      } catch (error) {
        console.error("Error fetching published works:", error);
      } finally {
        setLoadingWorks(false);
      }
    };

    fetchWorks();
  }, []);

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

      {/* Main Content */}
      <main className="w-full page-enter">
        {/* Grid Container - Songs and Works Combined */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {/* Songs */}
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

            {/* Published Works */}
            {!loadingWorks && works.map((work) => {
              const isPoem = work.workType.toLowerCase().includes('poesia') || 
                            work.workType.toLowerCase().includes('poema') || 
                            work.workType.toLowerCase().includes('texto');
              const gradient = getWorkGradient(work.workType);
              const showCoverImage = work.coverImageUrl && isPoem;
              const showMainImage = work.fileUrl && (work.workType.toLowerCase().includes('fotografia') || work.workType.toLowerCase().includes('fotografía'));

              return (
                <Link
                  key={work.submissionId}
                  to={`/work/${work.submissionId}`}
                  className="group flex flex-col cursor-pointer"
                >
                  {/* Work Image/Preview */}
                  <div className={`relative overflow-hidden rounded-2xl glass-effect aspect-square mb-3 transition-all duration-700 ease-out group-hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.2)] group-hover:-translate-y-0.5 group-hover:border-transparent ${!showCoverImage && !showMainImage ? `bg-gradient-to-br ${gradient}` : ''} flex items-center justify-center`}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]"></div>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.15),transparent)]"></div>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-transform duration-1000 ease-out group-hover:translate-y-[60%] pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent blur-sm"></div>
                    </div>
                    {showCoverImage ? (
                      <img
                        src={work.coverImageUrl}
                        alt={work.title}
                        className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
                      />
                    ) : showMainImage ? (
                      <img
                        src={work.fileUrl}
                        alt={work.title}
                        className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
                      />
                    ) : isPoem ? (
                      <div className="p-4 text-center flex items-center justify-center h-full">
                        <p className="text-[hsl(var(--card-foreground))] text-xs line-clamp-4 px-2">
                          "{work.description.split('\n')[0].substring(0, 40)}..."
                        </p>
                      </div>
                    ) : (
                      <span className="text-4xl">🎨</span>
                    )}
                  </div>

                  {/* Title and Artist */}
                  <div className="flex flex-col min-w-0 px-1">
                    <h3 className="text-xs sm:text-sm font-light text-[hsl(var(--foreground))] whitespace-normal break-words group-hover:text-[hsl(var(--foreground))/0.7] transition-colors duration-300">
                      {work.title}
                    </h3>
                    <p className="text-xs font-light text-[hsl(var(--foreground))/0.4] mt-0.5 transition-colors duration-300 group-hover:text-[hsl(var(--foreground))/0.5]">
                      {work.artistName}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function getWorkGradient(workType: string): string {
  const type = workType.toLowerCase();
  if (type.includes('musica') || type.includes('música')) return 'from-purple-600 to-purple-900';
  if (type.includes('fotografia') || type.includes('fotografía')) return 'from-blue-600 to-blue-900';
  if (type.includes('video')) return 'from-red-600 to-red-900';
  if (type.includes('poesia') || type.includes('poema') || type.includes('texto')) return 'from-pink-600 to-pink-900';
  return 'from-gray-600 to-gray-800';
}
