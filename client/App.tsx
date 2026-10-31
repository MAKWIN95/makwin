import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams, type Location } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Global components
import GlobalStars from "./components/GlobalStars";

// Pages
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Merch from "./pages/Merch";
import Marketplace from "./pages/Marketplace";
import WorkDetail from "./pages/WorkDetail";
import UploadWork from "./pages/UploadWork";
import UserProfile from "./pages/UserProfile";
import Saved from "./pages/Saved";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Following from "./pages/Following";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import Admin from "./pages/Admin";

// Global UI
import { I18nProvider, useI18n } from "@/lib/i18n";
import Onboarding from '@/components/Onboarding';
import GoogleOnboardingPage from '@/pages/GoogleOnboarding';
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { WorksProvider } from "@/lib/WorksContext";
import { FollowProvider } from "@/lib/FollowContext";
import { PageShown, rememberHeader } from "@/lib/header-morph";

const queryClient = new QueryClient();

// Detect if we're on the makwin.art domain (Coming Soon experience)
const isComingSoonDomain = (): boolean => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const isMakwinDomain = hostname === "makwin.art" || hostname === "www.makwin.art";

  // Allow /beats to bypass the coming soon experience on makwin.art
  return isMakwinDomain && !pathname.startsWith("/beats");
};

const BeatsPage = () => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="w-full h-screen bg-black">
      <iframe
        title="MKWN Beats"
        src={`/public/beats/index.html${hash}`}
        className="w-full h-screen border-none"
      />
    </div>
  );
};

// Wrapper that waits for auth to be ready
const AppLayout = () => {
  // No "save image" on long press or right click, and no dragging a work out of the page.
  useEffect(() => {
    const keepWork = (event: Event) => {
      if ((event.target as Element).closest?.('img, video')) event.preventDefault();
    };
    document.addEventListener('contextmenu', keepWork);
    document.addEventListener('dragstart', keepWork);
    return () => {
      document.removeEventListener('contextmenu', keepWork);
      document.removeEventListener('dragstart', keepWork);
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* Routes wrapper */}
      <RoutesWrapper />
    </div>
  );
};

// Each work is a page of its own, also when you go from one straight to another.
const WorkPage = () => {
  const { id } = useParams();
  return <WorkDetail key={id} />;
};

const RoutesWrapper = () => {
  const { loading, initializationError, retryInitialization, needsUsernameSetup } = useAuth();
  const { language } = useI18n();
  const location = useLocation();
  const navigationType = useNavigationType();

  // Read while the old page is still on screen: the next header starts from this one.
  const lastPath = useRef(location.pathname);
  if (lastPath.current !== location.pathname) {
    lastPath.current = location.pathname;
    rememberHeader();
  }

  // The gallery stays alive once visited, so coming back finds it exactly as it was.
  // Its address is held while it is out of sight, or it would react to the other pages'.
  const onGallery = location.pathname === '/' || location.pathname === '/galeria';
  const galleryLocation = useRef<Location | null>(null);
  if (onGallery) galleryLocation.current = location;
  const wasOnGallery = useRef(onGallery);
  const galleryScroll = useRef(0);
  if (wasOnGallery.current && !onGallery) galleryScroll.current = window.scrollY;

  useLayoutEffect(() => {
    if (onGallery && !wasOnGallery.current) {
      window.scrollTo(0, navigationType === 'POP' ? galleryScroll.current : 0);
    }
    wasOnGallery.current = onGallery;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGallery]);

  // Track last page for redirect after settings changes
  useEffect(() => {
    const publicPages = ['/', '/galeria', '/merch', '/marketplace', '/favoritos', '/siguiendo'];
    if (publicPages.some(p => location.pathname.startsWith(p))) {
      try {
        sessionStorage.setItem('lastPage', location.pathname);
      } catch (e) {}
    }
  }, [location.pathname]);
  
  // Public pages can render while Supabase restores a persisted session. Keep
  // protected routes gated until Auth has a definitive result; profile loading
  // is already independent and must not hold up the public gallery.
  const requiresAuthResolution = ['/subir-obra', '/favoritos', '/siguiendo', '/configuracion', '/completar-perfil']
    .some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`));
  if (loading && requiresAuthResolution) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-sm mb-4">{language === 'es' ? 'Cargando autenticación…' : 'Loading authentication…'}</div>
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (initializationError && requiresAuthResolution) {
    return (
      <div role="alert" className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p>{language === 'es' ? 'No se pudo comprobar la sesión. Tu cuenta no se ha cerrado.' : 'We could not verify your session. You have not been signed out.'}</p>
        <button type="button" onClick={retryInitialization} className="rounded-lg border border-white/40 px-4 py-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {language === 'es' ? 'Reintentar' : 'Try again'}
        </button>
      </div>
    );
  }

  // If the user needs to complete onboarding, force the onboarding page
  if (needsUsernameSetup && !location.pathname.startsWith('/completar-perfil')) {
    return <Navigate to="/completar-perfil" replace />;
  }

  return (
    <>
    {galleryLocation.current && (
      <div style={onGallery ? undefined : { display: 'none' }}>
        <PageShown.Provider value={onGallery}>
          <Routes location={galleryLocation.current}>
            <Route path="*" element={<Gallery />} />
          </Routes>
        </PageShown.Provider>
      </div>
    )}
    <Routes>
      {/* Main: Gallery is now home, kept alive above */}
      <Route path="/" element={null} />
      <Route path="/home" element={<Home />} />
      <Route path="/galeria" element={null} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/marketplace" element={<Marketplace />} />

      {/* Onboarding for Google users */}
      <Route path="/completar-perfil" element={<GoogleOnboardingPage />} />

      <Route path="/work/:id" element={<WorkPage />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated */}
      <Route path="/subir-obra" element={<UploadWork />} />
      <Route path="/favoritos" element={<Saved />} />
      <Route path="/siguiendo" element={<Following />} />
      <Route path="/configuracion" element={<Settings />} />
      <Route path="/u/:username" element={<UserProfile />} />
      <Route path="/beats/*" element={<BeatsPage />} />

      {/* Legacy redirects */}
      <Route path="/enviar-obra" element={<Navigate to="/subir-obra" replace />} />
      <Route path="/obras-enviadas" element={<Navigate to="/" replace />} />
      <Route path="/admin" element={<Admin />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
};

const App = () => {
  // If we're on makwin.art, show Coming Soon page without providers
  if (isComingSoonDomain()) {
    return <ComingSoon />;
  }

  // Otherwise render the full app with all providers
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <AuthProvider>
              <FollowProvider>
                <WorksProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <GlobalStars />
                    <AppLayout />
                  </BrowserRouter>
                </WorksProvider>
              </FollowProvider>
          </AuthProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
