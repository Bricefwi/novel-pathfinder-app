import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Destinations from "./pages/Destinations";
import Planning from "./pages/Planning";
import Hebergement from "./pages/Hebergement";
import CarnetVoyage from "./pages/CarnetVoyage";
import Galerie from "./pages/Galerie";
import Contact from "./pages/Contact";
import DemandeDevis from "./pages/DemandeDevis";
import Auth from "./pages/Auth";
import MonEspace from "./pages/MonEspace";
import Onboarding from "./pages/Onboarding";
import CGU from "./pages/CGU";
import CGV from "./pages/CGV";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import Cookies from "./pages/Cookies";
import MentionsLegales from "./pages/MentionsLegales";
import Admin from "./pages/Admin";
import PreparerVoyage from "./pages/PreparerVoyage";
import EcoSysteme from "./pages/EcoSysteme";
import EcoSystemeArticle from "./pages/EcoSystemeArticle";
import ProposerLieu from "./pages/ProposerLieu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/hebergement" element={<Hebergement />} />
          <Route path="/carnet-de-voyage" element={<CarnetVoyage />} />
          <Route path="/galerie" element={<Galerie />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/demande-devis" element={<DemandeDevis />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/mon-espace" element={<MonEspace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/cgv" element={<CGV />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/preparer-voyage" element={<PreparerVoyage />} />
          <Route path="/eco-systeme" element={<EcoSysteme />} />
          <Route path="/eco-systeme/proposer" element={<ProposerLieu />} />
          <Route path="/eco-systeme/:slug" element={<EcoSystemeArticle />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
