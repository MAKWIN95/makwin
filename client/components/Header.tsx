import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/custom-dialog";
import LanguageSelector from "./LanguageSelector";
import { Filter, ArrowLeft, Upload, Bookmark, User, LogOut, Settings, Heart, Moon, Sun, Menu } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/lib/SidebarContext";

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();
  const { language } = useI18n();
  const es = language === 'es';
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  const handleMakwinClick = () => navigate('/');
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
  const isHomePage = location.pathname === '/home';
  const headerRootClass = showSearchCentered
    ? `sticky top-4 z-50 bg-transparent border-none fast-theme w-full transition-all duration-500 px-4 ${isGalleryish ? 'gallery-navbar header-offset' : ''}`
    : isHomePage
    ? `fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--popover))/0.95] backdrop-blur-md border-b shadow-sm fast-theme w-full transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-1 border-[rgba(80,80,80,0.2)] px-4`
    : `sticky top-4 z-50 bg-[hsl(var(--popover))/0.95] backdrop-blur-md border-b shadow-sm fast-theme w-full transition-all duration-500 border-[rgba(80,80,80,0.2)] px-4`;

  const innerContainerClass = showSearchCentered
    ? 'w-full px-4 sm:px-6 py-2 sm:py-3 flex flex-col pointer-events-auto mx-auto max-w-6xl bg-[hsl(var(--popover))/0.95] backdrop-blur-md rounded-full border border-[rgba(120,120,120,0.25)] shadow-md transition-all duration-500'
    : isHomePage
    ? 'w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col transition-all duration-500'
    : breadcrumb
    ? 'w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col transition-all duration-500'
    : 'w-full px-4 sm:px-6 py-3 sm:py-4 flex flex-col transition-all duration-500';

  return (
    <header className={headerRootClass}>
      <div className={innerContainerClass}>
        {isHomePage ? (
          /* HOME PAGE LAYOUT - CENTERED MAKWIN */
          <div className="w-full flex items-center justify-center">
            <div onClick={handleMakwinClick} className="cursor-pointer flex items-center gap-2">
              <span className="logo-makwin tracking-widest hover:opacity-80 transition-opacity duration-200 whitespace-nowrap leading-tight text-2xl sm:text-3xl md:text-4xl">
                MAKWIN
              </span>
            </div>
          </div>
        ) : (
          /* NORMAL LAYOUT */
        <div className="w-full relative grid grid-cols-3 items-center gap-2 sm:gap-4">

          {/* Left: navigation + logo */}
          <div className={`${isHomePage ? 'hidden' : 'col-span-1'} flex items-center gap-1 sm:gap-2 min-w-0 relative`}>
            <button onClick={toggleSidebar} className="p-0 w-10 h-10 rounded-lg transition-all duration-200 ease-out flex items-center justify-center shrink-0 hover:scale-105 hover:bg-[hsl(var(--muted))] active:scale-95" aria-label="Menu">
              <Menu className="w-5 h-5 text-[hsl(var(--muted-foreground))] transition-colors duration-300" />
            </button>
            <button onClick={handleGoBack} className="p-0 w-10 h-10 rounded-lg transition-all duration-200 ease-out flex items-center justify-center shrink-0 hover:scale-105 hover:bg-[hsl(var(--muted))] active:scale-95" aria-label="Atrás">
              <ArrowLeft className="w-5 h-5 text-[hsl(var(--muted-foreground))] transition-colors duration-300" />
            </button>
            <div onClick={handleMakwinClick} className="cursor-pointer flex items-center gap-2 ml-1 min-w-0">
              <span className={`logo-makwin tracking-widest hover:opacity-80 transition-opacity duration-200 whitespace-nowrap leading-tight ${hideSearch ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'}`}>
                MAKWIN
              </span>
              {breadcrumb && <>
                <span className="text-[hsl(var(--muted-foreground))] font-light">/</span>
                <span className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] font-light truncate">{breadcrumb}</span>
              </>}
            </div>
          </div>

          {/* Center: search */}
          <div className={`${isHomePage ? 'hidden' : 'col-span-1'} flex items-center justify-center`} ref={searchRef}>
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
                  className="flex-1 px-3 sm:px-4 py-2 text-sm bg-[hsl(var(--popover))/0.6] backdrop-blur-sm border border-[rgba(120,120,120,0.25)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] transition-all placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <button
                  id="filter-btn"
                  className="ml-2 p-2 border border-[rgba(120,120,120,0.25)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors duration-200"
                  onClick={() => document.dispatchEvent(new Event('toggleFilterPopup'))}
                >
                  <Filter size={16} className="text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
            )}
          </div>

          {/* Right: lang + music + user */}
          <div className={`${isHomePage ? 'col-span-3 flex justify-center' : 'col-span-1 flex justify-end'} flex items-center gap-2 sm:gap-3`}>
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
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[hsl(var(--muted))] border border-[rgba(120,120,120,0.25)] flex items-center justify-center text-sm font-medium">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" />
                      : <span>{(profile?.display_name ?? profile?.username ?? 'U').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[hsl(var(--popover))] border border-[rgba(120,120,120,0.25)] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-[rgba(120,120,120,0.25)]">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{profile?.display_name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">@{profile?.username}</p>
                    </div>
                    <div className="py-1">
                      <Link to={`/u/${profile?.username}`} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <User className="w-4 h-4" /> {es ? 'Mi perfil' : 'My profile'}
                      </Link>
                      <Link to="/favoritos" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Bookmark className="w-4 h-4" /> {es ? 'Guardados' : 'Saved works'}
                      </Link>
                      <Link to="/siguiendo" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Heart className="w-4 h-4" /> {es ? 'Siguiendo' : 'Following'}
                      </Link>
                      <Link to="/subir-obra" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Upload className="w-4 h-4" /> {es ? 'Subir obra' : 'Upload work'}
                      </Link>
                      <Link to="/configuracion" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Settings className="w-4 h-4" /> {es ? 'Configuración' : 'Settings'}
                      </Link>
                      <button onClick={() => { toggleTheme(); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors w-full text-left">
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {isDark ? (es ? 'Modo claro' : 'Light mode') : (es ? 'Modo oscuro' : 'Dark mode')}
                      </button>
                      <div className="border-t border-[rgba(120,120,120,0.25)] mt-1 pt-1">
                        <button onClick={async () => { 
                          setIsLoggingOut(true);
                          // Fade out effect
                          document.documentElement.style.opacity = '0';
                          document.documentElement.style.transition = 'opacity 0.3s ease-out';
                          await new Promise(r => setTimeout(r, 300));
                          await signOut();
                          // Reset opacity for next page
                          document.documentElement.style.opacity = '1';
                          document.documentElement.style.transition = 'none';
                          const publicRoutes = ['/', '/galeria', '/marketplace', '/merch'];
                          const shouldStayOnRoute = publicRoutes.some(r => location.pathname.startsWith(r));
                          navigate(shouldStayOnRoute ? location.pathname : '/galeria', { replace: true });
                        }}
                          disabled={isLoggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors w-full text-left disabled:opacity-50">
                          <LogOut className="w-4 h-4" /> {isLoggingOut ? (es ? 'Cerrando...' : 'Signing out...') : (es ? 'Cerrar sesión' : 'Sign out')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="text-xs font-medium text-[hsl(var(--foreground))] border border-[rgba(120,120,120,0.25)] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors duration-200 whitespace-nowrap">
                {es ? 'Entrar' : 'Sign in'}
              </Link>
            )}
          </div>

        </div>
        )}
      </div>
    </header>
  );
}
