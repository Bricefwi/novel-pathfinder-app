import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  Users,
  Inbox,
  Megaphone,
  BarChart3,
  MapPin,
  FileText,
  Image,
  Star,
  MessageSquare,
  Home,
  Lightbulb,
  Receipt,
  Leaf,
  Search,
  User,
  Calendar,
} from "lucide-react";
import type { AdminModule } from "./ControlTower";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (module: AdminModule) => void;
}

const MODULES = [
  { id: "dashboard" as const, label: "Tableau de bord", icon: LayoutDashboard, keywords: ["home", "accueil"] },
  { id: "stocks" as const, label: "Gestion des Stocks", icon: Package, keywords: ["inventory", "produits", "sejours", "yield"] },
  { id: "crm" as const, label: "CRM 360°", icon: Users, keywords: ["clients", "leads", "prospects"] },
  { id: "inbox" as const, label: "Inbox Unifiée", icon: Inbox, keywords: ["messages", "emails", "communication"] },
  { id: "marketing" as const, label: "Marketing Automation", icon: Megaphone, keywords: ["newsletter", "workflow", "email"] },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3, keywords: ["stats", "conversion", "funnel"] },
  { id: "activities" as const, label: "Activités", icon: MapPin, keywords: ["randonnees", "cours", "stages"] },
  { id: "quotes" as const, label: "Devis & Factures", icon: Receipt, keywords: ["invoice", "pdf", "paiement"] },
  { id: "ecosystem" as const, label: "Éco-Système", icon: Leaf, keywords: ["blog", "articles", "nature"] },
];

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<{
    clients: Array<{ id: string; name: string; email: string }>;
    activities: Array<{ id: string; title: string }>;
    quotes: Array<{ id: string; quote_number: string; client_name: string }>;
  }>({ clients: [], activities: [], quotes: [] });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults({ clients: [], activities: [], quotes: [] });
      return;
    }

    const searchAll = async () => {
      const [profiles, activities, quotes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, user_id")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .limit(5),
        supabase
          .from("activities")
          .select("id, title")
          .ilike("title", `%${query}%`)
          .limit(5),
        supabase
          .from("quotes")
          .select("id, quote_number, client_name")
          .or(`quote_number.ilike.%${query}%,client_name.ilike.%${query}%`)
          .limit(5),
      ]);

      setSearchResults({
        clients: (profiles.data || []).map(p => ({
          id: p.user_id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sans nom",
          email: "",
        })),
        activities: activities.data || [],
        quotes: quotes.data || [],
      });
    };

    const timer = setTimeout(searchAll, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Rechercher un module, client, produit, facture..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        
        <CommandGroup heading="Navigation rapide">
          {MODULES.map((module) => (
            <CommandItem
              key={module.id}
              value={`${module.label} ${module.keywords.join(" ")}`}
              onSelect={() => onNavigate(module.id)}
            >
              <module.icon className="mr-2 h-4 w-4" />
              {module.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {searchResults.clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {searchResults.clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`client ${client.name}`}
                  onSelect={() => {
                    onNavigate("crm");
                    onOpenChange(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {searchResults.activities.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Produits / Séjours">
              {searchResults.activities.map((activity) => (
                <CommandItem
                  key={activity.id}
                  value={`activity ${activity.title}`}
                  onSelect={() => {
                    onNavigate("stocks");
                    onOpenChange(false);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {activity.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {searchResults.quotes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Devis">
              {searchResults.quotes.map((quote) => (
                <CommandItem
                  key={quote.id}
                  value={`quote ${quote.quote_number} ${quote.client_name}`}
                  onSelect={() => {
                    onNavigate("quotes");
                    onOpenChange(false);
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  {quote.quote_number} - {quote.client_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
