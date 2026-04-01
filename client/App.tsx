import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Landing from "./pages/Landing";
import Gallery from "./pages/Gallery";
import Merch from "./pages/Merch";
import Marketplace from "./pages/Marketplace";
import SongDetail from "./pages/SongDetail";
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

// Global UI
import ThemeBulb from "@/components/ThemeBulb";
import { I18nProvider } from "@/lib/i18n";
import LanguagePrompt from '@/components/LanguagePrompt';
import Onboarding from '@/components/Onboarding';
import { AuthProvider, useAuth } from "@/lib/AuthContext";

const queryClient = new QueryClient();

// Wrapper that waits for auth to be ready
const RoutesWrapper = () => {
  const { loading } = useAuth();
  
  // Show nothing while loading auth
  if (loading) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/galeria" element={<Gallery />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/song/:id" element={<SongDetail />} />
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

      {/* Legacy redirects */}
      <Route path="/enviar-obra" element={<Navigate to="/subir-obra" replace />} />
      <Route path="/obras-enviadas" element={<Navigate to="/galeria" replace />} />
      <Route path="/admin" element={<Navigate to="/galeria" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <ThemeBulb />
          <LanguagePrompt />
          <Onboarding />
          <BrowserRouter>
            <RoutesWrapper />
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

