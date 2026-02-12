import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Users, UserCheck, X, Search } from "lucide-react";
import type { SegmentFilters } from "../MarketingAutomation";

interface Props {
  filters: SegmentFilters;
  setFilters: (f: SegmentFilters) => void;
  estimatedAudience: number | null;
}

const RIDING_LEVELS = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "confirme", label: "Confirmé" },
  { value: "expert", label: "Expert" },
];

const TRIP_TYPES = [
  { value: "randonnee", label: "Randonnée" },
  { value: "stage", label: "Stage" },
  { value: "sejour", label: "Séjour" },
  { value: "hebergement", label: "Hébergement" },
];

const DESTINATIONS = ["Maroc", "Bretagne", "Mongolie", "Jordanie", "Écosse", "Irlande"];

export function NewsletterSegmentation({ filters, setFilters, estimatedAudience }: Props) {
  const [crmSearch, setCrmSearch] = useState("");
  const [crmContacts, setCrmContacts] = useState<Array<{ email: string; name: string }>>([]);
  const [showCRM, setShowCRM] = useState(false);

  // Fetch CRM contacts for individual selection
  useEffect(() => {
    if (!showCRM) return;
    const fetch = async () => {
      const [profilesRes, emailsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name").eq("newsletter_subscribed", true),
        supabase.rpc("get_user_emails_for_profiles"),
      ]);
      const emailMap = new Map<string, string>();
      ((emailsRes.data || []) as Array<{ user_id: string; email: string }>).forEach(u => emailMap.set(u.user_id, u.email));
      
      const contacts = (profilesRes.data || [])
        .map(p => ({
          email: emailMap.get(p.user_id) || "",
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sans nom",
        }))
        .filter(c => c.email);
      setCrmContacts(contacts);
    };
    fetch();
  }, [showCRM]);

  const toggleFilter = (key: keyof SegmentFilters, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: updated });
  };

  const clearFilters = () => {
    setFilters({ ridingLevels: [], tripTypes: [], dreamDestinations: [], specificEmails: [] });
    setShowCRM(false);
  };

  const hasActiveFilters = filters.ridingLevels.length > 0 || filters.tripTypes.length > 0 ||
    filters.dreamDestinations.length > 0 || filters.specificEmails.length > 0;

  const filteredCRM = crmContacts.filter(c =>
    crmSearch === "" || c.name.toLowerCase().includes(crmSearch.toLowerCase()) || c.email.toLowerCase().includes(crmSearch.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Ciblage
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
              <X className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          Audience estimée : <Badge variant="secondary">{estimatedAudience ?? "..."}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riding Level */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Niveau équestre</p>
          <div className="flex flex-wrap gap-2">
            {RIDING_LEVELS.map(level => (
              <Badge
                key={level.value}
                variant={filters.ridingLevels.includes(level.value) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleFilter("ridingLevels", level.value)}
              >
                {level.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Trip Types */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Intérêts</p>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map(type => (
              <Badge
                key={type.value}
                variant={filters.tripTypes.includes(type.value) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleFilter("tripTypes", type.value)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Dream Destinations */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destinations rêvées</p>
          <div className="flex flex-wrap gap-2">
            {DESTINATIONS.map(dest => (
              <Badge
                key={dest}
                variant={filters.dreamDestinations.includes(dest) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleFilter("dreamDestinations", dest)}
              >
                {dest}
              </Badge>
            ))}
          </div>
        </div>

        {/* CRM Individual Selection */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowCRM(!showCRM)}
          >
            <UserCheck className="h-3 w-3 mr-1" />
            {showCRM ? "Masquer" : "Sélection individuelle"} ({filters.specificEmails.length} sélectionnés)
          </Button>
          {showCRM && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un contact..."
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredCRM.map(contact => (
                    <label key={contact.email} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                      <Checkbox
                        checked={filters.specificEmails.includes(contact.email)}
                        onCheckedChange={() => toggleFilter("specificEmails", contact.email)}
                      />
                      <span className="font-medium truncate">{contact.name}</span>
                      <span className="text-muted-foreground truncate ml-auto text-[10px]">{contact.email}</span>
                    </label>
                  ))}
                  {filteredCRM.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucun contact trouvé</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
