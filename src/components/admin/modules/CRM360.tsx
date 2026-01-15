import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Users,
  Search,
  Star,
  TrendingUp,
  Clock,
  UserCheck,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  phone: string | null;
  riding_level: string | null;
  dream_destinations: string[] | null;
  created_at: string;
  // Computed fields
  totalBookings: number;
  totalQuotes: number;
  pendingQuotes: number;
  lastActivity: string | null;
  leadScore: number;
  segment: "vip" | "hot" | "dormant" | "new";
}

export function CRM360() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [activeSegment, setActiveSegment] = useState<string>("all");

  // Fetch all profiles with related data
  const { data: clients, isLoading } = useQuery({
    queryKey: ["crm-clients"],
    queryFn: async () => {
      const [profilesRes, bookingsRes, quotesRes, messagesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("user_id, status, created_at"),
        supabase.from("quotes").select("user_id, status, created_at"),
        supabase.from("chat_messages").select("user_id, created_at").order("created_at", { ascending: false }),
      ]);

      const profiles = profilesRes.data || [];
      const bookings = bookingsRes.data || [];
      const quotes = quotesRes.data || [];
      const messages = messagesRes.data || [];

      // Enrich profiles with CRM data
      const enrichedProfiles: ClientProfile[] = profiles.map((profile) => {
        const userBookings = bookings.filter((b) => b.user_id === profile.user_id);
        const userQuotes = quotes.filter((q) => q.user_id === profile.id);
        const userMessages = messages.filter((m) => m.user_id === profile.user_id);

        const totalBookings = userBookings.filter((b) => b.status === "confirmed").length;
        const totalQuotes = userQuotes.length;
        const pendingQuotes = userQuotes.filter((q) => q.status === "sent" || q.status === "draft").length;
        
        // Get last activity date
        const allDates = [
          ...userBookings.map((b) => new Date(b.created_at)),
          ...userQuotes.map((q) => new Date(q.created_at)),
          ...userMessages.map((m) => new Date(m.created_at)),
        ].sort((a, b) => b.getTime() - a.getTime());
        const lastActivity = allDates[0]?.toISOString() || null;

        // Calculate lead score (0-100)
        let leadScore = 0;
        if (profile.first_name && profile.last_name) leadScore += 15;
        if (profile.phone) leadScore += 10;
        if (profile.riding_level) leadScore += 10;
        if ((profile.dream_destinations || []).length > 0) leadScore += 15;
        if (totalQuotes > 0) leadScore += 20;
        if (pendingQuotes > 0) leadScore += 15;
        if (totalBookings > 0) leadScore += 15;
        leadScore = Math.min(leadScore, 100);

        // Determine segment
        let segment: "vip" | "hot" | "dormant" | "new" = "new";
        if (totalBookings >= 2) segment = "vip";
        else if (pendingQuotes > 0 && lastActivity && differenceInDays(new Date(), new Date(lastActivity)) <= 7) segment = "hot";
        else if (lastActivity && differenceInDays(new Date(), new Date(lastActivity)) > 60) segment = "dormant";

        return {
          ...profile,
          totalBookings,
          totalQuotes,
          pendingQuotes,
          lastActivity,
          leadScore,
          segment,
        };
      });

      return enrichedProfiles;
    },
  });

  // Filter clients based on search and segment
  const filteredClients = (clients || []).filter((client) => {
    const matchesSearch =
      searchQuery === "" ||
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSegment = activeSegment === "all" || client.segment === activeSegment;
    return matchesSearch && matchesSegment;
  });

  // Segment counts
  const segmentCounts = {
    all: clients?.length || 0,
    vip: clients?.filter((c) => c.segment === "vip").length || 0,
    hot: clients?.filter((c) => c.segment === "hot").length || 0,
    dormant: clients?.filter((c) => c.segment === "dormant").length || 0,
    new: clients?.filter((c) => c.segment === "new").length || 0,
  };

  const getSegmentBadge = (segment: string) => {
    const styles = {
      vip: "bg-amber-100 text-amber-800 border-amber-200",
      hot: "bg-red-100 text-red-800 border-red-200",
      dormant: "bg-gray-100 text-gray-600 border-gray-200",
      new: "bg-blue-100 text-blue-800 border-blue-200",
    };
    const labels = { vip: "VIP", hot: "Prospect Chaud", dormant: "Dormant", new: "Nouveau" };
    return (
      <Badge variant="outline" className={styles[segment as keyof typeof styles]}>
        {labels[segment as keyof typeof labels]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          CRM 360°
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vision unifiée de vos clients avec scoring et segmentation automatique
        </p>
      </div>

      {/* Segment Tabs */}
      <Tabs value={activeSegment} onValueChange={setActiveSegment}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all" className="gap-2">
            Tous
            <Badge variant="secondary" className="ml-1">{segmentCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vip" className="gap-2">
            <Star className="h-3 w-3" />
            VIP
            <Badge variant="secondary" className="ml-1">{segmentCounts.vip}</Badge>
          </TabsTrigger>
          <TabsTrigger value="hot" className="gap-2">
            <TrendingUp className="h-3 w-3" />
            Chauds
            <Badge variant="secondary" className="ml-1">{segmentCounts.hot}</Badge>
          </TabsTrigger>
          <TabsTrigger value="dormant" className="gap-2">
            <Clock className="h-3 w-3" />
            Dormants
            <Badge variant="secondary" className="ml-1">{segmentCounts.dormant}</Badge>
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <UserCheck className="h-3 w-3" />
            Nouveaux
            <Badge variant="secondary" className="ml-1">{segmentCounts.new}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      selectedClient?.id === client.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {(client.first_name?.[0] || "?").toUpperCase()}
                          {(client.last_name?.[0] || "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">
                            {client.first_name || "Sans"} {client.last_name || "nom"}
                          </p>
                          {getSegmentBadge(client.segment)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{client.totalBookings} voyage(s)</span>
                          <span>{client.totalQuotes} devis</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Lead Score</span>
                            <span className="font-medium">{client.leadScore}%</span>
                          </div>
                          <Progress value={client.leadScore} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Aucun client trouvé
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Client Detail View */}
        <Card className="lg:col-span-2">
          {selectedClient ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl">
                        {(selectedClient.first_name?.[0] || "?").toUpperCase()}
                        {(selectedClient.last_name?.[0] || "").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">
                        {selectedClient.first_name || "Sans"} {selectedClient.last_name || "nom"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {getSegmentBadge(selectedClient.segment)}
                        <span>• Inscrit le {format(new Date(selectedClient.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">Lead Score</div>
                    <div className="text-3xl font-bold text-primary">{selectedClient.leadScore}%</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.phone || "Non renseigné"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.riding_level || "Niveau non défini"}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.totalBookings}</p>
                      <p className="text-xs text-muted-foreground">Voyages</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <FileText className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.totalQuotes}</p>
                      <p className="text-xs text-muted-foreground">Devis</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Clock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.pendingQuotes}</p>
                      <p className="text-xs text-muted-foreground">En attente</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <MessageSquare className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <p className="text-2xl font-bold">
                        {selectedClient.lastActivity
                          ? differenceInDays(new Date(), new Date(selectedClient.lastActivity))
                          : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">Jours inactif</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Dream Destinations */}
                {(selectedClient.dream_destinations || []).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Destinations rêvées</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.dream_destinations?.map((dest) => (
                        <Badge key={dest} variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          {dest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un client pour voir sa fiche détaillée</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
