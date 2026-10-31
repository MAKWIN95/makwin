import React, { useContext, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/custom-dialog";
import LanguageSelector from "./LanguageSelector";
import GalleryFilter from "./GalleryFilter";
import { ArrowLeft, Upload, Bookmark, User, LogOut, Settings, Heart, Moon, Sun, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from "@/hooks/use-theme";
import { authHeaders } from "@/lib/adminApi";
import { morphHeader, PageShown } from "@/lib/header-morph";

const readSearch = (search: string) => (new URLSearchParams(search).get('search') ?? '').replace(/^#/, '').trim();

interface HeaderProps {
  showSearch?: boolean;
  showSearchCentered?: boolean;
  breadcrumb?: string;
  hideSearch?: boolean;
}

const ADMIN_HINT_KEY = 'makwin:admin-hint';
let adminChecked: string | null = null;

function readAdminHint(userId: string): boolean {
  try {
    return localStorage.getItem(ADMIN_HINT_KEY) === userId;
  } catch {
    return false;
  }
}

function writeAdminHint(userId: string, isAdmin: boolean) {
  try {
    if (isAdmin) localStorage.setItem(ADMIN_HINT_KEY, userId);
    else localStorage.removeItem(ADMIN_HINT_KEY);
  } catch {
    // Without storage the link simply appears after the check.
  }
}

export default function Header({ showSearch = true, showSearchCentered = false, breadcrumb, hideSearch = false }: HeaderProps) {
  const initialLocation = useLocation();
  const [searchTerm, setSearchTerm] = useState(() => readSearch(initialLocation.search));
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [themeTapped, setThemeTapped] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const shown = useContext(PageShown);
  const { t } = useI18n();
  const { language } = useI18n();
  const es = language === 'es';
  const { user, profile, signOut, loading: authLoading, initializationError, retryInitialization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const MUSIC_FEATURE_ENABLED = false;

  // Before the first paint: this header starts as the shape the last one had.
  useLayoutEffect(() => {
    if (shown) morphHeader(barRef.current);
  }, [shown]);

  const handleMakwinClick = () => navigate('/');
  const handleGoHome = () => navigate('/');
  const handleGoBack = () => {
    // Back to where you were, and to the gallery when there is nothing to go back to.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  useEffect(() => {
    // Pointer events: iOS only sends mousedown for elements it considers clickable,
    // so tapping empty space would never close the menu.
    const onDown = (e: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearching(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const isGallery = location.pathname === '/' || location.pathname.startsWith('/galeria');

  // Follow the address (hashtag links, "clear search", back button) without
  // fighting the spaces someone is still typing.
  useEffect(() => {
    const fromUrl = readSearch(location.search);
    setSearchTerm((current) => (current.replace(/^#/, '').trim() === fromUrl ? current : fromUrl));
  }, [location.search]);

  const writeSearch = (value: string) => {
    const params = new URLSearchParams(location.search);
    const cleaned = value.replace(/^#/, '').trim();
    if (cleaned) params.set('search', cleaned);
    else params.delete('search');
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(true);
    if (isGallery) writeSearch(value);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isGallery) return;
    const cleaned = searchTerm.replace(/^#/, '').trim();
    navigate(cleaned ? `/galeria?search=${encodeURIComponent(cleaned)}` : '/galeria');
  };

  // Only the server decides who is an administrator. The last answer is shown
  // straight away and refreshed once per visit; it only controls this link.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(readAdminHint(user.id));
    if (adminChecked === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/reports?scope=access', { headers: await authHeaders() });
        if (!response.ok) return;
        const { role } = await response.json();
        adminChecked = user.id;
        writeAdminHint(user.id, !!role);
        if (!cancelled) setIsAdmin(!!role);
      } catch {
        // Not being able to check simply keeps the last answer.
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const isGalleryish = location.pathname.startsWith('/galeria') || location.pathname.startsWith('/merch') || location.pathname.startsWith('/marketplace');
  const isHomePage = location.pathname === '/home';
  const headerRootClass = showSearchCentered
    ? `sticky top-4 phone:top-0 z-50 bg-transparent phone:py-1.5 border-none fast-theme w-full px-4 sm:px-8 phone:px-2 ${isGalleryish ? 'gallery-navbar header-offset' : ''}`
    : isHomePage
    ? `fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--popover))/0.95] backdrop-blur-md border-b shadow-sm fast-theme w-full transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-1 border-[rgba(80,80,80,0.2)] px-4`
    : `sticky top-0 z-50 border-b border-transparent fast-theme w-full px-4 phone:px-2`;

  const innerContainerClass = showSearchCentered
    ? 'w-full px-4 sm:px-6 phone:px-2 py-2 sm:py-3 phone:py-1.5 relative flex flex-col pointer-events-auto mx-auto border border-transparent'
    : isHomePage
    ? 'w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col transition-all duration-500'
    : breadcrumb
    ? 'w-full px-4 sm:px-6 phone:px-1 py-4 sm:py-5 phone:py-1.5 flex flex-col'
    : 'w-full px-4 sm:px-6 phone:px-1 py-3 sm:py-4 phone:py-1.5 flex flex-col';

  return (
    <header ref={barRef} data-header-bar={showSearchCentered ? 'floating' : isHomePage ? undefined : 'flat'} className={headerRootClass}>
      {!showSearchCentered && !isHomePage && <div data-header-glass aria-hidden="true" className="header-glass-layer header-glass-flat" />}
      <div className={innerContainerClass}>
        {showSearchCentered && <div data-header-glass aria-hidden="true" className="header-glass-layer glass-bar" />}
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
        <div className="w-full relative grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-3 sm:phone:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">

          {/* Left: navigation + logo */}
          <div className={`${isHomePage ? 'hidden' : 'col-span-1'} flex items-center gap-1 sm:gap-2 min-w-0 relative`}>
            <button data-morph="back" onClick={handleGoBack} className={`${isGallery ? 'max-sm:hidden' : ''} max-[359px]:hidden header-button ios-press p-0 w-10 h-10 phone:w-11 phone:h-11 max-[429px]:!w-9 max-[374px]:!w-8 flex items-center justify-center shrink-0`} aria-label={es ? 'Atrás' : 'Back'}>
              <ArrowLeft className="w-5 h-5 text-[hsl(var(--muted-foreground))] phone:text-[hsl(var(--foreground))] transition-colors duration-300" />
            </button>
            <div data-morph="logo" onClick={handleMakwinClick} className={`cursor-pointer flex items-center gap-2 ml-1 min-w-0 overflow-hidden phone:min-h-11 ${isGallery ? 'max-sm:ml-2 max-[359px]:ml-1' : ''}`}>
              <span className={`logo-makwin tracking-widest hover:opacity-80 transition-opacity duration-200 whitespace-nowrap leading-tight max-[374px]:!text-sm ${hideSearch ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'}`}>
                MAKWIN
              </span>
              {breadcrumb && <>
                <span data-morph-fade className="max-sm:hidden text-[hsl(var(--muted-foreground))] font-light">/</span>
                <span data-morph-fade className="max-sm:hidden text-base sm:text-lg text-[hsl(var(--muted-foreground))] font-light truncate">{breadcrumb}</span>
              </>}
            </div>
          </div>

          {/* Center: search */}
          <div className={`${isHomePage || hideSearch || !showSearch ? 'hidden sm:flex' : 'flex'} order-last col-span-2 sm:order-none sm:col-span-1 items-center justify-center`} ref={searchRef}>
            {!hideSearch && showSearch && (
              <form data-morph-fade role="search" onSubmit={handleSearchSubmit} className="relative flex items-stretch w-full sm:max-w-xl">
                <input
                  id="site-search-input"
                  type="search"
                  placeholder={t('search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearching(true)}
                  aria-label={t('search.placeholder')}
                  className={`flex-1 min-w-0 phone:h-11 px-3 sm:px-4 py-2 text-sm bg-transparent border border-[rgba(120,120,120,0.25)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] transition-all placeholder:text-[hsl(var(--muted-foreground))] ${filterExpanded ? 'max-xl:invisible' : ''}`}
                />
                {isGallery && <GalleryFilter onExpand={setFilterExpanded} />}
              </form>
            )}
          </div>

          {/* Right: lang + music + user */}
          <div data-morph="tools" className={`${isHomePage ? 'col-span-3 flex justify-center' : 'col-span-1 flex justify-end'} flex items-center gap-1`}>
            <div id="lang-selector-wrap" className="whitespace-nowrap">
              <LanguageSelector />
            </div>

            {MUSIC_FEATURE_ENABLED && (
              <Dialog>
                <DialogTrigger asChild>
                  <button id="music-btn" className="text-xs font-light text-[hsl(var(--muted-foreground))] tracking-widest uppercase hover:text-[hsl(var(--foreground))] transition-colors whitespace-nowrap hidden sm:block">
                  {es ? 'Música' : 'Music'}
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
            )}

            {/* Light / dark */}
            <button type="button" onClick={() => { setThemeTapped(true); toggleTheme(); }} className="ios-press header-button inline-flex items-center justify-center shrink-0 p-2 phone:p-0 phone:w-11 phone:h-11 max-[429px]:!w-9 max-[374px]:!w-8" aria-label={isDark ? (es ? 'Modo claro' : 'Light mode') : (es ? 'Modo oscuro' : 'Dark mode')}>
              <span key={String(isDark)} className={themeTapped ? 'theme-icon' : 'block'} onAnimationEnd={() => setThemeTapped(false)}>
                {isDark ? <Sun className="w-4 h-4 phone:w-5 phone:h-5 text-[hsl(var(--foreground))]" /> : <Moon className="w-4 h-4 phone:w-5 phone:h-5 text-[hsl(var(--foreground))]" />}
              </span>
            </button>

            {/* Upload shortcut */}
            <Link to={user || authLoading ? '/subir-obra' : '/login'} className="ios-press header-button inline-flex items-center justify-center shrink-0 p-2 phone:p-0 phone:w-11 phone:h-11 max-[429px]:!w-9 max-[374px]:!w-8" aria-label={es ? 'Subir obra' : 'Upload work'}>
              <Upload className="w-4 h-4 phone:w-5 phone:h-5 text-[hsl(var(--foreground))]" />
            </Link>

            {/* User avatar / login */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  aria-label={es ? 'Menú de usuario' : 'User menu'}
                  className="h-8 w-8 phone:h-11 phone:w-11 flex items-center justify-center shrink-0 rounded-xl p-0 transition-opacity hover:bg-transparent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-[hsl(var(--muted))] border border-[rgba(120,120,120,0.25)] flex items-center justify-center text-sm font-medium">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.display_name ?? ''} className="w-full h-full object-cover" />
                      : <span>{(profile?.display_name ?? profile?.username ?? 'U').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 glass-menu w-52 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain z-50">
                    <div className="px-4 py-3 border-b border-[rgba(120,120,120,0.25)]">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{profile?.display_name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">@{profile?.username}</p>
                    </div>
                    <div className="py-1">
                      <Link to={`/u/${profile?.username}`} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <User className="w-4 h-4" /> {es ? 'Mi perfil' : 'My profile'}
                      </Link>
                      <Link to="/favoritos" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Bookmark className="w-4 h-4" /> {es ? 'Guardados' : 'Saved works'}
                      </Link>
                      <Link to="/siguiendo" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Heart className="w-4 h-4" /> {es ? 'Siguiendo' : 'Following'}
                      </Link>
                      <Link to="/subir-obra" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Upload className="w-4 h-4" /> {es ? 'Subir obra' : 'Upload work'}
                      </Link>
                      <Link to="/configuracion" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                        <Settings className="w-4 h-4" /> {es ? 'Configuración' : 'Settings'}
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                          <Shield className="w-4 h-4" /> {es ? 'Administración' : 'Administration'}
                        </Link>
                      )}
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
                          const shouldStayOnRoute = location.pathname === '/'
                            || ['/galeria', '/marketplace', '/merch', '/work/', '/u/'].some(r => location.pathname.startsWith(r));
                          navigate(shouldStayOnRoute ? location.pathname : '/galeria', { replace: true });
                        }}
                          disabled={isLoggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 phone:py-3 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors w-full text-left disabled:opacity-50">
                          <LogOut className="w-4 h-4" /> {isLoggingOut ? (es ? 'Cerrando...' : 'Signing out...') : (es ? 'Cerrar sesión' : 'Sign out')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : authLoading ? (
              <div aria-label={es ? 'Comprobando sesión' : 'Checking session'} className="h-8 w-14 rounded-lg bg-[hsl(var(--muted))]/40 animate-pulse" />
            ) : initializationError ? (
              <button type="button" onClick={retryInitialization} className="rounded-lg px-2 py-1 phone:py-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]">
                {es ? 'Reintentar sesión' : 'Retry session'}
              </button>
            ) : (
              <Link to="/login"
                className="header-button text-xs phone:text-sm font-medium text-[hsl(var(--foreground))] border border-[rgba(120,120,120,0.25)] px-3 max-[429px]:!px-2.5 max-[429px]:!text-xs py-1.5 phone:py-2.5 whitespace-nowrap">
                {es ? 'Iniciar sesión' : 'Sign in'}
              </Link>
            )}
          </div>

        </div>
        )}
      </div>
    </header>
  );
}
