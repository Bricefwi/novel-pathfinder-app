import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { downloadProspectAnalysisPDF, ProspectAnalysisData } from "@/components/pdf/ProspectAnalysisPDFGenerator";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
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
  BrainCircuit,
  Loader2,
  Sparkles,
  Target,
  ShoppingBag,
  Download,
  History,
  ShieldCheck,
} from "lucide-react";

interface ProspectAnalysis {
  budget_probable: string;
  intention_principale: string;
  confiance: string;
  produits_suggeres: Array<{ nom: string; raison: string }>;
  analyse_resume: string;
}

interface AnalysisHistoryItem {
  id: string;
  user_id: string;
  budget_probable: string | null;
  intention_principale: string | null;
  confiance: string | null;
  produits_suggeres: Array<{ nom: string; raison: string }>;
  analyse_resume: string | null;
  events_analyzed: number;
  created_at: string;
}

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
  userRole?: "admin" | "user";
}

export function CRM360() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    status: string;
    analysis?: ProspectAnalysis;
    events_analyzed?: number;
    message?: string;
  } | null>(null);
  const queryClient = useQueryClient();

  // Fetch analysis history for selected client
  const { data: analysisHistory } = useQuery({
    queryKey: ["analysis-history", selectedClient?.user_id],
    queryFn: async () => {
      if (!selectedClient?.user_id) return [];
      const { data, error } = await supabase
        .from("prospect_analyses")
        .select("*")
        .eq("user_id", selectedClient.user_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        produits_suggeres: (item.produits_suggeres as Array<{ nom: string; raison: string }>) || []
      })) as AnalysisHistoryItem[];
    },
    enabled: !!selectedClient?.user_id,
  });

  // Fetch all profiles with related data
  const { data: clients, isLoading } = useQuery({
    queryKey: ["crm-clients"],
    queryFn: async () => {
      const [profilesRes, bookingsRes, quotesRes, messagesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("user_id, status, created_at"),
        supabase.from("quotes").select("user_id, status, created_at"),
        supabase.from("chat_messages").select("user_id, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const profiles = profilesRes.data || [];
      const bookings = bookingsRes.data || [];
      const quotes = quotesRes.data || [];
      const messages = messagesRes.data || [];
      const roles = rolesRes.data || [];

      // Enrich profiles with CRM data
      const enrichedProfiles: ClientProfile[] = profiles.map((profile) => {
        const userBookings = bookings.filter((b) => b.user_id === profile.user_id);
        const userQuotes = quotes.filter((q) => q.user_id === profile.id);
        const userMessages = messages.filter((m) => m.user_id === profile.user_id);
        const userRole = roles.find((r) => r.user_id === profile.user_id);

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
          userRole: (userRole?.role as "admin" | "user") || "user",
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
      vip: "bg-primary/20 text-primary border-primary/30",
      hot: "bg-destructive/20 text-destructive border-destructive/30",
      dormant: "bg-muted text-muted-foreground border-border",
      new: "bg-accent text-accent-foreground border-accent",
    };
    const labels = { vip: "VIP", hot: "Prospect Chaud", dormant: "Dormant", new: "Nouveau" };
    return (
      <Badge variant="outline" className={styles[segment as keyof typeof styles]}>
        {labels[segment as keyof typeof labels]}
      </Badge>
    );
  };

  // Analyze prospect behavior with AI and save to history
  const analyzeProspect = async (userId: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-prospect", {
        body: { user_id: userId },
      });
      
      if (error) throw error;
      
      setAnalysisResult(data);
      if (data.status === "insufficient_data") {
        toast.info("Pas assez de données pour analyser ce prospect.");
      } else if (data.status === "success" && data.analysis) {
        // Save analysis to history
        const { error: saveError } = await supabase.from("prospect_analyses").insert({
          user_id: userId,
          budget_probable: data.analysis.budget_probable,
          intention_principale: data.analysis.intention_principale,
          confiance: data.analysis.confiance,
          produits_suggeres: data.analysis.produits_suggeres,
          analyse_resume: data.analysis.analyse_resume,
          events_analyzed: data.events_analyzed || 0,
          raw_response: data,
        });
        
        if (saveError) {
          console.error("Erreur sauvegarde analyse:", saveError);
        } else {
          queryClient.invalidateQueries({ queryKey: ["analysis-history", userId] });
        }
        toast.success("Analyse IA terminée et sauvegardée !");
      }
    } catch (err) {
      console.error("Erreur analyse prospect:", err);
      toast.error("Erreur lors de l'analyse IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export analysis to PDF
  const handleExportPDF = (analysis: ProspectAnalysis, eventsAnalyzed: number) => {
    if (!selectedClient) return;
    
    const pdfData: ProspectAnalysisData = {
      clientName: `${selectedClient.first_name || "Sans"} ${selectedClient.last_name || "nom"}`,
      clientEmail: selectedClient.email,
      analysisDate: new Date(),
      eventsAnalyzed,
      budgetProbable: analysis.budget_probable,
      intentionPrincipale: analysis.intention_principale,
      confiance: analysis.confiance,
      produitsSuggeres: analysis.produits_suggeres,
      analyseResume: analysis.analyse_resume,
    };
    
    downloadProspectAnalysisPDF(pdfData);
    toast.success("Export PDF en cours...");
  };

  // Export history item to PDF
  const handleExportHistoryPDF = (historyItem: AnalysisHistoryItem) => {
    if (!selectedClient) return;
    
    const pdfData: ProspectAnalysisData = {
      clientName: `${selectedClient.first_name || "Sans"} ${selectedClient.last_name || "nom"}`,
      clientEmail: selectedClient.email,
      analysisDate: new Date(historyItem.created_at),
      eventsAnalyzed: historyItem.events_analyzed,
      budgetProbable: historyItem.budget_probable || "Non défini",
      intentionPrincipale: historyItem.intention_principale || "Non défini",
      confiance: historyItem.confiance || "Non défini",
      produitsSuggeres: historyItem.produits_suggeres || [],
      analyseResume: historyItem.analyse_resume || "",
    };
    
    downloadProspectAnalysisPDF(pdfData);
    toast.success("Export PDF en cours...");
  };

  const getBudgetColor = (budget: string) => {
    switch (budget) {
      case "Élevé": return "bg-chart-1/20 text-chart-1 border-chart-1/30";
      case "Moyen": return "bg-chart-2/20 text-chart-2 border-chart-2/30";
      case "Éco": return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      default: return "bg-muted text-muted-foreground";
    }
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
                        {selectedClient.userRole === "admin" && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        <span>• Inscrit le {format(new Date(selectedClient.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Lead Score</div>
                      <div className="text-3xl font-bold text-primary">{selectedClient.leadScore}%</div>
                    </div>
                    <UserRoleManager
                      userId={selectedClient.user_id}
                      userName={`${selectedClient.first_name || "Sans"} ${selectedClient.last_name || "nom"}`}
                      currentRole={selectedClient.userRole}
                      onRoleChanged={() => queryClient.invalidateQueries({ queryKey: ["crm-clients"] })}
                    />
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
                      <FileText className="h-5 w-5 mx-auto text-chart-2 mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.totalQuotes}</p>
                      <p className="text-xs text-muted-foreground">Devis</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Clock className="h-5 w-5 mx-auto text-chart-4 mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.pendingQuotes}</p>
                      <p className="text-xs text-muted-foreground">En attente</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <MessageSquare className="h-5 w-5 mx-auto text-chart-3 mb-1" />
                      <p className="text-2xl font-bold">
                        {selectedClient.lastActivity
                          ? differenceInDays(new Date(), new Date(selectedClient.lastActivity))
                          : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">Jours inactif</p>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Analysis Buttons */}
                <div className="border-t pt-4 flex gap-2">
                  <Button 
                    onClick={() => analyzeProspect(selectedClient.user_id)}
                    disabled={isAnalyzing}
                    className="flex-1 gap-2"
                    variant="outline"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="h-4 w-4" />
                        Analyser avec l'IA
                      </>
                    )}
                  </Button>
                  {(analysisHistory?.length ?? 0) > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowHistory(!showHistory)}
                      className="gap-2"
                    >
                      <History className="h-4 w-4" />
                      Historique ({analysisHistory?.length})
                    </Button>
                  )}
                </div>

                {/* Analysis History */}
                {showHistory && (analysisHistory?.length ?? 0) > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historique des analyses
                      </h4>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {analysisHistory?.map((item) => (
                          <div key={item.id} className="p-3 rounded-lg bg-background border text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-muted-foreground">
                                {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportHistoryPDF(item)}
                                className="h-7 gap-1"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={getBudgetColor(item.budget_probable || "")}>
                                {item.budget_probable || "?"}
                              </Badge>
                              <Badge variant="outline">{item.intention_principale || "?"}</Badge>
                              <Badge variant="secondary">{item.confiance || "?"}</Badge>
                            </div>
                            {item.analyse_resume && (
                              <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                                "{item.analyse_resume}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* AI Analysis Results */}
                {analysisResult && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Analyse IA
                        {analysisResult.events_analyzed && (
                          <span className="text-muted-foreground font-normal">
                            ({analysisResult.events_analyzed} événements)
                          </span>
                        )}
                      </div>
                      {analysisResult.status === "success" && analysisResult.analysis && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportPDF(analysisResult.analysis!, analysisResult.events_analyzed || 0)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Exporter PDF
                        </Button>
                      )}
                    </div>

                    {analysisResult.status === "insufficient_data" ? (
                      <p className="text-sm text-muted-foreground">{analysisResult.message}</p>
                    ) : analysisResult.analysis && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          {/* Budget */}
                          <div className="text-center p-3 rounded-lg bg-background">
                            <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Budget</p>
                            <Badge className={getBudgetColor(analysisResult.analysis.budget_probable)}>
                              {analysisResult.analysis.budget_probable}
                            </Badge>
                          </div>
                          {/* Intention */}
                          <div className="text-center p-3 rounded-lg bg-background">
                            <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Intention</p>
                            <Badge variant="outline">{analysisResult.analysis.intention_principale}</Badge>
                          </div>
                          {/* Confiance */}
                          <div className="text-center p-3 rounded-lg bg-background">
                            <Star className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Confiance</p>
                            <Badge variant="secondary">{analysisResult.analysis.confiance}</Badge>
                          </div>
                        </div>

                        {/* Produits suggérés */}
                        <div>
                          <p className="text-xs font-medium mb-2">Produits suggérés</p>
                          <div className="space-y-2">
                            {analysisResult.analysis.produits_suggeres.map((produit, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-background">
                                <span className="font-medium">{produit.nom}</span>
                                <span className="text-muted-foreground">— {produit.raison}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Résumé */}
                        <p className="text-sm text-muted-foreground italic">
                          "{analysisResult.analysis.analyse_resume}"
                        </p>
                      </>
                    )}
                  </div>
                )}

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
