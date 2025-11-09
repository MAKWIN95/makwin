import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/custom-dialog";
import LanguageSelector from "./LanguageSelector";
import { songs } from "@/lib/songs";
import { Link } from "react-router-dom";

interface HeaderProps {
  showSearch?: boolean;
  breadcrumb?: string; // optional: when provided show MAKWIN > breadcrumb
}

export default function Header({ showSearch = true, breadcrumb }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleMakwinClick = () => {
    window.location.href = "/";
  };

  const filteredSongs = searchTerm
    ? songs.filter(song => 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
  <header className="sticky top-0 z-50 bg-[hsl(var(--popover))/0.95] backdrop-blur-md border-b border-[rgba(0,0,0,0.05)] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_5px_0_rgba(255,255,255,0.03)] fast-theme w-full">
      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:gap-3 cursor-pointer min-w-0" onClick={handleMakwinClick} aria-label="Ir al inicio">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))/0.8] transition-colors duration-150 whitespace-nowrap leading-tight">
                MAKWIN
              </span>
              {breadcrumb && (
                <span className="text-sm sm:text-xl md:text-2xl text-[hsl(var(--muted-foreground))] font-light whitespace-nowrap">&gt;</span>
              )}
            </div>
            {breadcrumb && (
              <span className="text-sm sm:text-xl md:text-2xl text-[hsl(var(--muted-foreground))] font-light whitespace-nowrap">{breadcrumb}</span>
            )}
          </div>
          <div className="flex-1 max-w-md relative" ref={searchRef}>
            {showSearch ? (
              <>
                <input
                  id="site-search-input"
                  type="search"
                  placeholder="Buscar canciones..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  aria-label="Buscar canciones"
                  className="w-full px-4 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] transition-all duration-300 placeholder:text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--ring))/0.5]"
                />
                {isSearching && searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-50">
                    {filteredSongs.length > 0 ? (
                      <div className="py-2">
                        {filteredSongs.map((song) => (
                          <Link
                            key={song.id}
                            to={`/song/${song.id}`}
                            onClick={() => {
                              setSearchTerm("");
                              setIsSearching(false);
                            }}
                            className="flex items-start gap-3 px-4 py-2 hover:bg-[hsl(var(--accent))/0.1] transition-colors"
                          >
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[hsl(var(--foreground))] text-sm font-medium truncate">
                                {song.title}
                              </p>
                              <p className="text-[hsl(var(--muted-foreground))] text-xs truncate">
                                {song.artist}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        No se encontraron canciones
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div id="lang-selector-wrap" className="whitespace-nowrap"><LanguageSelector /></div>
            <Dialog>
              <DialogTrigger asChild>
                <button id="music-btn" className="text-sm font-light text-[hsl(var(--foreground))/0.5] tracking-widest uppercase hover:text-[hsl(var(--foreground))/0.7] transition-colors duration-150 whitespace-nowrap">
                  Music
                </button>
              </DialogTrigger>
              <DialogContent className="dialog-enter sm:max-w-[920px] w-[92%] flex items-center justify-center data-[state=open]:animate-contentShow data-[state=closed]:animate-contentHide origin-[50%_50%]">
                <iframe
                  data-testid="embed-iframe"
                  style={{ borderRadius: "12px", marginTop: '-8px' }}
                  src="https://open.spotify.com/embed/artist/4VdvO63ngN1eiPqzuXcTUJ?utm_source=generator&theme=0"
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
