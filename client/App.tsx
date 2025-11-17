import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SongDetail from "./pages/SongDetail";
import WorkDetail from "./pages/WorkDetail";
import NotFound from "./pages/NotFound";
import SubmitWork from "./pages/SubmitWork";
import SubmittedWorks from "./pages/SubmittedWorks";
import Admin from "./pages/Admin";
import ThemeBulb from "@/components/ThemeBulb";
import SubmitButton from "@/components/SubmitButton";
import { I18nProvider } from "@/lib/i18n";
import LanguagePrompt from '@/components/LanguagePrompt';
import Onboarding from '@/components/Onboarding';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
  <Toaster />
        <Sonner />
        <ThemeBulb />
  <LanguagePrompt />
  <Onboarding />
        <BrowserRouter>
          <SubmitButton />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/work/:id" element={<WorkDetail />} />
            <Route path="/enviar-obra" element={<SubmitWork />} />
            <Route path="/obras-enviadas" element={<SubmittedWorks />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

