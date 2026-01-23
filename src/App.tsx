import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageTracker } from "@/components/app/PageTracker";

// Pages chargées immédiatement (critiques pour le SEO et l'expérience initiale)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Pages chargées en lazy loading (optimisation du bundle initial)
const Destinations = lazy(() => import("./pages/Destinations"));
const Planning = lazy(() => import("./pages/Planning"));
const Hebergement = lazy(() => import("./pages/Hebergement"));
const CarnetVoyage = lazy(() => import("./pages/CarnetVoyage"));
const Galerie = lazy(() => import("./pages/Galerie"));
const Contact = lazy(() => import("./pages/Contact"));
const DemandeDevis = lazy(() => import("./pages/DemandeDevis"));
const Auth = lazy(() => import("./pages/Auth"));
const MonEspace = lazy(() => import("./pages/MonEspace"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CGU = lazy(() => import("./pages/CGU"));
const CGV = lazy(() => import("./pages/CGV"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const Cookies = lazy(() => import("./pages/Cookies"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Admin = lazy(() => import("./pages/Admin"));
const SystemDiagnostics = lazy(() => import("./pages/admin/SystemDiagnostics"));
const PreparerVoyage = lazy(() => import("./pages/PreparerVoyage"));
const EcoSysteme = lazy(() => import("./pages/EcoSysteme"));
const EcoSystemeArticle = lazy(() => import("./pages/EcoSystemeArticle"));
const ProposerLieu = lazy(() => import("./pages/ProposerLieu"));
const AgentFAQ = lazy(() => import("./pages/AgentFAQ"));

const queryClient = new QueryClient();

// Composant de chargement réutilisable
const PageLoader = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-muted-foreground text-sm">{message}</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Page d'accueil - chargée immédiatement */}
            <Route path="/" element={<Index />} />
            
            {/* Pages publiques */}
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/hebergement" element={<Hebergement />} />
            <Route path="/carnet-de-voyage" element={<CarnetVoyage />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/demande-devis" element={<DemandeDevis />} />
            <Route path="/preparer-voyage" element={<PreparerVoyage />} />
            
            {/* Éco-Système */}
            <Route path="/eco-systeme" element={<EcoSysteme />} />
            <Route path="/eco-systeme/proposer" element={<ProposerLieu />} />
            <Route path="/eco-systeme/:slug" element={<EcoSystemeArticle />} />
            
            {/* Authentification et espace utilisateur */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/mon-espace" element={<MonEspace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/agent-faq" element={<AgentFAQ />} />
            
            {/* Pages légales */}
            <Route path="/cgu" element={<CGU />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            
            {/* Administration */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/diagnostics" element={<SystemDiagnostics />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
