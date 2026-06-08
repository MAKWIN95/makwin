import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// Global components
import NavMenu from "./components/NavMenu";
import GlobalStars from "./components/GlobalStars";

// Pages
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Merch from "./pages/Merch";
import Marketplace from "./pages/Marketplace";
import Attuned from "./pages/Attuned";
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

// Global UI
import { I18nProvider } from "@/lib/i18n";
import LanguagePrompt from '@/components/LanguagePrompt';
import Onboarding from '@/components/Onboarding';
import GoogleSignupModal from '@/components/GoogleSignupModal';
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { WorksProvider } from "@/lib/WorksContext";
import { SidebarProvider } from "@/lib/SidebarContext";
import { AttuneProvider } from "@/lib/AttuneContext";
import { FollowProvider } from "@/lib/FollowContext";

const queryClient = new QueryClient();

// Detect if we're on the makwin.art domain (Coming Soon experience)
const isComingSoonDomain = (): boolean => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const isMakwinDomain = hostname === "makwin.art" || hostname === "www.makwin.art";

  // Allow /beats to bypass the coming soon experience on makwin.art
  return isMakwinDomain && !pathname.startsWith("/beats");
};

const BeatsPage = () => (
  <div className="w-full h-screen bg-black">
    <iframe
      title="MKWN Beats"
      src="/beats/index.html"
      className="w-full h-screen border-none"
    />
  </div>
);

// Wrapper that waits for auth to be ready
// Global app layout with NavMenu and overlay at viewport root
const AppLayout = () => {
  return (
    <div className="relative w-full">
      {/* NavMenu: viewport-fixed at root level */}
      <NavMenu />
      {/* Routes wrapper */}
      <RoutesWrapper />
    </div>
  );
};

const RoutesWrapper = () => {
  const { loading } = useAuth();
  const location = useLocation();

  // Track last page for redirect after settings changes
  useEffect(() => {
    const publicPages = ['/', '/galeria', '/merch', '/marketplace', '/favoritos', '/siguiendo'];
    if (publicPages.some(p => location.pathname.startsWith(p))) {
      try {
        sessionStorage.setItem('lastPage', location.pathname);
      } catch (e) {}
    }
  }, [location.pathname]);
  
  // Show nothing while loading auth
  if (loading) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <Routes>
      {/* Main: Gallery is now home */}
      <Route path="/" element={<Gallery />} />
      <Route path="/home" element={<Home />} />
      <Route path="/galeria" element={<Gallery />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/attuned" element={<Attuned />} />
      <Route path="/work/:id" element={<WorkDetail />} />

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
      <Route path="/admin" element={<Navigate to="/" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
            <SidebarProvider>
              <FollowProvider>
                <WorksProvider>
                  <AttuneProvider>
                    <Toaster />
                    <Sonner />
                    <LanguagePrompt />
                    <GoogleSignupModal />
                    <BrowserRouter>
                      <GlobalStars />
                      <AppLayout />
                    </BrowserRouter>
                  </AttuneProvider>
                </WorksProvider>
              </FollowProvider>
            </SidebarProvider>
          </AuthProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);

