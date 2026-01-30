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
  Mail,
  Phone,
} from "lucide-react";
import type { AdminModule } from "./ControlTower";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (module: AdminModule) => void;
  onSelectClient?: (clientId: string) => void;
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

export function CommandPalette({ open, onOpenChange, onNavigate, onSelectClient }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<{
    clients: Array<{ id: string; user_id: string; name: string; email: string | null; phone: string | null }>;
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
      // Enhanced search: search in profiles + quotes + bookings for email matching
      const [profiles, quotesWithEmail, bookingsWithEmail, activities, quotes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, phone")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5),
        supabase
          .from("quotes")
          .select("user_id, client_email, client_name")
          .ilike("client_email", `%${query}%`)
          .limit(5),
        supabase
          .from("bookings")
          .select("user_id, contact_email, contact_name")
          .ilike("contact_email", `%${query}%`)
          .limit(5),
        supabase
          .from("activities")
          .select("id, title")
          .ilike("title", `%${query}%`)
          .limit(5),
        supabase
          .from("quotes")
          .select("id, quote_number, client_name, client_email")
          .or(`quote_number.ilike.%${query}%,client_name.ilike.%${query}%,client_email.ilike.%${query}%`)
          .limit(5),
      ]);

      // Merge profile results with email search results
      const clientsFromProfiles = (profiles.data || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sans nom",
        email: null as string | null,
        phone: p.phone,
      }));

      // Add clients found by email in quotes
      const clientsFromQuotes = (quotesWithEmail.data || [])
        .filter(q => q.user_id)
        .map(q => ({
          id: q.user_id || "",
          user_id: q.user_id || "",
          name: q.client_name || "Client",
          email: q.client_email,
          phone: null as string | null,
        }));

      // Add clients found by email in bookings
      const clientsFromBookings = (bookingsWithEmail.data || [])
        .filter(b => b.user_id)
        .map(b => ({
          id: b.user_id || "",
          user_id: b.user_id || "",
          name: b.contact_name || "Client",
          email: b.contact_email,
          phone: null as string | null,
        }));

      // Deduplicate clients by user_id
      const allClients = [...clientsFromProfiles, ...clientsFromQuotes, ...clientsFromBookings];
      const uniqueClients = Array.from(
        new Map(allClients.filter(c => c.user_id).map(c => [c.user_id, c])).values()
      ).slice(0, 5);

      setSearchResults({
        clients: uniqueClients,
        activities: activities.data || [],
        quotes: quotes.data || [],
      });
    };

    const timer = setTimeout(searchAll, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleClientSelect = (client: typeof searchResults.clients[0]) => {
    // Navigate to CRM and optionally select the client
    onNavigate("crm");
    onOpenChange(false);
    // If we have a callback for selecting a specific client, use it
    if (onSelectClient && client.user_id) {
      setTimeout(() => onSelectClient(client.user_id), 100);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Rechercher par nom, email, téléphone..." 
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
              onSelect={() => {
                onNavigate(module.id);
                onOpenChange(false);
              }}
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
                  key={client.user_id}
                  value={`client ${client.name} ${client.email || ""} ${client.phone || ""}`}
                  onSelect={() => handleClientSelect(client)}
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
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
