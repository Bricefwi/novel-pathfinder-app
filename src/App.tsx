import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Destinations from "./pages/Destinations";
import Sejours from "./pages/Sejours";
import Planning from "./pages/Planning";
import Hebergement from "./pages/Hebergement";
import CarnetVoyage from "./pages/CarnetVoyage";
import Galerie from "./pages/Galerie";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import MonEspace from "./pages/MonEspace";
import Onboarding from "./pages/Onboarding";
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
          <Route path="/sejours" element={<Sejours />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/hebergement" element={<Hebergement />} />
          <Route path="/carnet-de-voyage" element={<CarnetVoyage />} />
          <Route path="/galerie" element={<Galerie />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/mon-espace" element={<MonEspace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
