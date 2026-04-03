import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/custom-dialog";
import LanguageSelector from "./LanguageSelector";
import { songs } from "@/lib/songs";
import { Filter, ArrowLeft, Home, Upload, Bookmark, User, LogOut, Settings, Heart, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from "@/hooks/use-theme";

interface HeaderProps {
  showSearch?: boolean;
  showSearchCentered?: boolean;
  breadcrumb?: string;
  hideSearch?: boolean;
}

export default function Header({ showSearch = true, showSearchCentered = false, breadcrumb, hideSearch = false }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();
  const { language } = useI18n();
  const es = language === 'es';
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const handleMakwinClick = () => document.dispatchEvent(new CustomEvent('reloadGallery'));
  const handleGoHome = () => navigate('/');
  const handleGoBack = () => {
    // Navigate to home instead of using browser history to avoid 404
    // This ensures users always have a safe place to go back to
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearching(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent('updateSearchTerm', { detail: { searchTerm } }));
  }, [searchTerm]);

  const isGalleryish = location.pathname.startsWith('/galeria') || location.pathname.startsWith('/merch') || location.pathname.startsWith('/marketplace');
  const headerRootClass = showSearchCentered
    ? `sticky top-3 z-50 bg-transparent border-none fast-theme w-full transition-all duration-500 ${isGalleryish ? 'gallery-navbar header-offset' : ''}`
    : `sticky top-0 z-50 bg-[hsl(var(--popover))/0.95] backdrop-blur-md border-b border-[hsl(var(--border))] shadow-sm fast-theme w-full`;

  const innerContainerClass = showSearchCentered
    ? 'w-full px-4 sm:px-6 py-2 sm:py-3 flex flex-col pointer-events-auto mx-auto max-w-6xl bg-[hsl(var(--popover))/0.95] backdrop-blur-md rounded-full border border-[hsl(var(--border))] shadow-md transition-all duration-500'
    : 'w-full px-4 sm:px-6 py-3 sm:py-4 flex flex-col transition-all duration-500';

  return (
    <header className={headerRootClass}>
      <div className={innerContainerClass}>
        <div className="w-full relative grid grid-cols-3 items-center gap-2 sm:gap-4">

          {/* Left: navigation + logo */}
          <div className="col-span-1 flex items-center gap-1 sm:gap-2 min-w-0">
            <button onClick={handleGoHome} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors shrink-0" aria-label="Home">
              <Home className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
            <button onClick={handleGoBack} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors shrink-0" aria-label="Atrás">
              <ArrowLeft className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
            <div onClick={handleMakwinClick} className="cursor-pointer flex items-center gap-2 ml-1 min-w-0">
              <span className={`font-black tracking-widest uppercase text-[hsl(var(--foreground))] hover:opacity-80 transition-opacity whitespace-nowrap leading-tight ${hideSearch ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'}`}>
                MAKWIN
              </span>
              {breadcrumb && <>
                <span className="text-[hsl(var(--muted-foreground))] font-light">/</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-light truncate">{breadcrumb}</span>
              </>}
            </div>
          </div>

          {/* Center: search */}
          <div className="col-span-1 flex items-center justify-center" ref={searchRef}>
            {!hideSearch && showSearch && (
              <div className="flex items-center w-full max-w-xs sm:max-w-xl">
                <input
                  id="site-search-input"
                  type="search"
                  placeholder={t('search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setIsSearching(true); }}
                  onFocus={() => setIsSearching(true)}
                  aria-label={t('search.placeholder')}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] transition-all placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <button
                  id="filter-btn"
                  className="ml-2 p-2 border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  onClick={() => document.dispatchEvent(new Event('toggleFilterPopup'))}
                >
                  <Filter size={16} className="text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
            )}
          </div>

          {/* Right: lang + music + user */}
          <div className="col-span-1 flex items-center justify-end gap-2 sm:gap-3">
            <div id="lang-selector-wrap" className="hidden sm:block whitespace-nowrap">
              <LanguageSelector />
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <button id="music-btn" className="text-xs font-light text-[hsl(var(--muted-foreground))] tracking-widest uppercase hover:text-[hsl(var(--foreground))] transition-colors whitespace-nowrap hidden sm:block">
                  Music
                </button>
              </DialogTrigger>
              <DialogContent className="dialog-enter sm:max-w-[920px] w-[92%] flex items-center justify-center">
                <iframe
                  style={{ borderRadius: "12px" }}
                  src="https://open.spotify.com/embed/artist/4VdvO63ngN1eiPqzuXcTUJ?utm_source=generator&theme=0"
                  width="100%" height="352" frameBorder="0" allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </DialogContent>
            </Dialog>

            {/* Upload shortcut */}
            {user && (
              <Link to="/subir-obra" className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" aria-label="Subir obra">
                <Upload className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </Link>
            )}

            {/* User avatar / login */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-sm font-medium">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" />
                      : <span>{(profile?.display_name ?? profile?.username ?? 'U').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{profile?.display_name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">@{profile?.username}</p>
                    </div>
                    <div className="py-1">
                      <Link to={`/u/${profile?.username}`} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <User className="w-4 h-4" /> Mi perfil
                      </Link>
                      <Link to="/favoritos" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Bookmark className="w-4 h-4" /> Guardados
                      </Link>
                      <Link to="/siguiendo" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Heart className="w-4 h-4" /> Siguiendo
                      </Link>
                      <Link to="/subir-obra" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Upload className="w-4 h-4" /> Subir obra
                      </Link>
                      <Link to="/configuracion" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Settings className="w-4 h-4" /> Configuración
                      </Link>
                      <button onClick={() => { toggleTheme(); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors w-full text-left">
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {isDark ? (es ? 'Modo claro' : 'Light mode') : (es ? 'Modo oscuro' : 'Dark mode')}
                      </button>
                      <div className="border-t border-[hsl(var(--border))] mt-1 pt-1">
                        <button onClick={async () => { 
                          await signOut(); 
                          setShowUserMenu(false);
                          // Redirect to public page if on one, otherwise go to gallery
                          const publicRoutes = ['/', '/galeria', '/marketplace', '/merch'];
                          const shouldStayOnRoute = publicRoutes.some(r => location.pathname.startsWith(r));
                          navigate(shouldStayOnRoute ? location.pathname : '/galeria');
                        }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors w-full text-left">
                          <LogOut className="w-4 h-4" /> Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="text-xs font-medium text-[hsl(var(--foreground))] border border-[hsl(var(--border))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors whitespace-nowrap">
                Entrar
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
