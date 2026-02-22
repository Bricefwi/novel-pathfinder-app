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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { downloadProspectAnalysisPDF, ProspectAnalysisData } from "@/components/pdf/ProspectAnalysisPDFGenerator";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { calculateProfileCompletion, type ProfileForCompletion } from "@/lib/profile-utils";
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
  ArrowUpDown,
  Edit,
  Save,
  X,
  UserPlus,
  CheckCircle2,
  XCircle,
  Send,
  BadgeCheck,
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
  riding_experience_years: number | null;
  dream_destinations: string[] | null;
  preferred_trip_types: string[] | null;
  interests: string[] | null;
  riding_style: string[] | null;
  travel_companions: string | null;
  onboarding_completed: boolean | null;
  created_at: string;
  // Computed fields
  totalBookings: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalRevenue: number;
  lastActivity: string | null;
  leadScore: number;
  profileCompletion: number;
  segment: "vip" | "hot" | "dormant" | "new";
  userRole?: "admin" | "user";
}

type SortField = "name" | "leadScore" | "created_at" | "totalRevenue";
type SortOrder = "asc" | "desc";

// Onboarding steps definition
const ONBOARDING_STEPS = [
  { key: "first_name", label: "Prénom", category: "Identité" },
  { key: "last_name", label: "Nom", category: "Identité" },
  { key: "phone", label: "Téléphone", category: "Identité" },
  { key: "riding_level", label: "Niveau équestre", category: "Profil Cavalier" },
  { key: "riding_experience_years", label: "Années d'expérience", category: "Profil Cavalier" },
  { key: "riding_style", label: "Style d'équitation", category: "Profil Cavalier" },
  { key: "dream_destinations", label: "Destinations rêvées", category: "Préférences" },
  { key: "preferred_trip_types", label: "Types de séjours", category: "Préférences" },
  { key: "interests", label: "Centres d'intérêt", category: "Préférences" },
  { key: "travel_companions", label: "Compagnons de voyage", category: "Préférences" },
] as const;

const isFieldFilled = (client: ClientProfile, key: string): boolean => {
  switch (key) {
    case "first_name": return !!client.first_name;
    case "last_name": return !!client.last_name;
    case "phone": return !!client.phone;
    case "riding_level": return !!client.riding_level;
    case "riding_experience_years": return client.riding_experience_years !== null && client.riding_experience_years !== undefined;
    case "riding_style": return (client.riding_style?.length ?? 0) > 0;
    case "dream_destinations": return (client.dream_destinations?.length ?? 0) > 0;
    case "preferred_trip_types": return (client.preferred_trip_types?.length ?? 0) > 0;
    case "interests": return (client.interests?.length ?? 0) > 0;
    case "travel_companions": return !!client.travel_companions;
    default: return false;
  }
};

export function CRM360() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    riding_level: "debutant" as "debutant" | "intermediaire" | "confirme" | "expert",
  });
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
      const [profilesRes, bookingsRes, quotesRes, messagesRes, rolesRes, emailsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("user_id, status, created_at, contact_email, total_price"),
        supabase.from("quotes").select("user_id, status, created_at, client_email, total_price"),
        supabase.from("chat_messages").select("user_id, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.rpc("get_user_emails_for_profiles"),
      ]);

      const profiles = profilesRes.data || [];
      const bookings = bookingsRes.data || [];
      const quotes = quotesRes.data || [];
      const messages = messagesRes.data || [];
      const roles = rolesRes.data || [];
      const userEmails = (emailsRes.data || []) as { user_id: string; email: string }[];
      
      // Créer un map pour les emails
      const emailMap = new Map(userEmails.map((u) => [u.user_id, u.email]));

      // Enrich profiles with CRM data
      const enrichedProfiles: ClientProfile[] = profiles.map((profile) => {
        const userBookings = bookings.filter((b) => b.user_id === profile.user_id);
        const userQuotes = quotes.filter((q) => q.user_id === profile.id || q.user_id === profile.user_id);
        const userMessages = messages.filter((m) => m.user_id === profile.user_id);
        const userRole = roles.find((r) => r.user_id === profile.user_id);

        const confirmedBookings = userBookings.filter((b) => b.status === "confirmed");
        const totalBookings = confirmedBookings.length;
        const totalQuotes = userQuotes.length;
        const pendingQuotes = userQuotes.filter((q) => q.status === "sent" || q.status === "draft").length;
        const totalRevenue = confirmedBookings.reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
        
        const allDates = [
          ...userBookings.map((b) => new Date(b.created_at)),
          ...userQuotes.map((q) => new Date(q.created_at)),
          ...userMessages.map((m) => new Date(m.created_at)),
        ].sort((a, b) => b.getTime() - a.getTime());
        const lastActivity = allDates[0]?.toISOString() || null;

        let leadScore = 0;
        if (profile.first_name && profile.last_name) leadScore += 15;
        if (profile.phone) leadScore += 10;
        if (profile.riding_level) leadScore += 10;
        if ((profile.dream_destinations || []).length > 0) leadScore += 15;
        if (totalQuotes > 0) leadScore += 20;
        if (pendingQuotes > 0) leadScore += 15;
        if (totalBookings > 0) leadScore += 15;
        leadScore = Math.min(leadScore, 100);

        let segment: "vip" | "hot" | "dormant" | "new" = "new";
        if (totalBookings >= 2) segment = "vip";
        else if (pendingQuotes > 0 && lastActivity && differenceInDays(new Date(), new Date(lastActivity)) <= 7) segment = "hot";
        else if (lastActivity && differenceInDays(new Date(), new Date(lastActivity)) > 60) segment = "dormant";

        const emailFromAuth = emailMap.get(profile.user_id);
        const emailFromQuote = userQuotes.find((q) => (q as { client_email?: string }).client_email)?.client_email;
        const emailFromBooking = userBookings.find((b) => (b as { contact_email?: string }).contact_email)?.contact_email;
        const email = emailFromAuth || emailFromQuote || emailFromBooking || null;

        // Calculate profile completion
        const profileForCompletion: ProfileForCompletion = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          riding_level: profile.riding_level,
          riding_experience_years: profile.riding_experience_years,
          dream_destinations: profile.dream_destinations,
          preferred_trip_types: profile.preferred_trip_types,
          interests: profile.interests,
          riding_style: profile.riding_style,
          travel_companions: profile.travel_companions,
        };
        const profileCompletion = calculateProfileCompletion(profileForCompletion);

        return {
          ...profile,
          email,
          totalBookings,
          totalQuotes,
          pendingQuotes,
          totalRevenue,
          lastActivity,
          leadScore,
          profileCompletion,
          segment,
          userRole: (userRole?.role as "admin" | "user") || "user",
        };
      });

      return enrichedProfiles;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { id: string; first_name: string; last_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      toast.success("Profil mis à jour");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Create new client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: typeof newClientForm) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manual-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      toast.success("Client ajouté avec succès");
      setIsAddClientOpen(false);
      setNewClientForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        riding_level: "debutant",
      });
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du client");
    },
  });

  // Send single profile reminder
  const sendProfileReminder = async (userId: string) => {
    setIsSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-single-profile-reminder", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Relance envoyée à ${data?.email_sent_to || "l'utilisateur"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Erreur envoi relance:", msg);
      toast.error(`Erreur : ${msg}`);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Filter and sort clients
  const filteredClients = (clients || [])
    .filter((client) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchLower) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchQuery));
      const matchesSegment = activeSegment === "all" || client.segment === activeSegment;
      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`);
          break;
        case "leadScore":
          comparison = a.leadScore - b.leadScore;
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "totalRevenue":
          comparison = a.totalRevenue - b.totalRevenue;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
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

  // Export clients to CSV
  const handleExportCSV = () => {
    const dataToExport = filteredClients;
    if (dataToExport.length === 0) {
      toast.error("Aucun client à exporter");
      return;
    }

    const headers = ["Nom", "Prénom", "Email", "Téléphone", "Segment", "Lead Score", "Profil %", "Voyages", "Devis", "CA Total", "Dernière activité"];
    const rows = dataToExport.map((c) => [
      c.last_name || "",
      c.first_name || "",
      c.email || "",
      c.phone || "",
      c.segment,
      c.leadScore,
      c.profileCompletion,
      c.totalBookings,
      c.totalQuotes,
      c.totalRevenue.toFixed(2),
      c.lastActivity ? format(new Date(c.lastActivity), "dd/MM/yyyy", { locale: fr }) : "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${dataToExport.length} client(s) exporté(s)`);
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

  const handleStartEdit = () => {
    if (selectedClient) {
      setEditForm({
        first_name: selectedClient.first_name || "",
        last_name: selectedClient.last_name || "",
        phone: selectedClient.phone || "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedClient) {
      updateProfileMutation.mutate({
        id: selectedClient.id,
        ...editForm,
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            CRM 360°
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vision unifiée de vos clients avec scoring et segmentation automatique
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Ajouter un client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un client manuellement</DialogTitle>
                <DialogDescription>
                  Pour les clients qui ne sont pas passés par le site
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input
                      value={newClientForm.first_name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, first_name: e.target.value })}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={newClientForm.last_name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, last_name: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    placeholder="06 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Niveau équestre</Label>
                  <Select
                    value={newClientForm.riding_level}
                    onValueChange={(v) => setNewClientForm({ ...newClientForm, riding_level: v as typeof newClientForm.riding_level })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debutant">Débutant</SelectItem>
                      <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                      <SelectItem value="confirme">Confirmé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createClientMutation.mutate(newClientForm)}
                  disabled={createClientMutation.isPending || !newClientForm.first_name}
                >
                  {createClientMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Créer le client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
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
          <CardHeader className="pb-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date d'inscription</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="leadScore">Lead Score</SelectItem>
                  <SelectItem value="totalRevenue">CA Total</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setIsEditing(false);
                    }}
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
                        {client.email && (
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{client.totalBookings} voyage(s)</span>
                          <span>{client.totalQuotes} devis</span>
                          {client.totalRevenue > 0 && (
                            <span className="text-primary font-medium">{client.totalRevenue.toLocaleString()}€</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Lead Score</span>
                            <span className="font-medium">{client.leadScore}%</span>
                          </div>
                          <Progress value={client.leadScore} className="h-1.5" />
                        </div>
                        {/* Profile completion micro bar */}
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground flex items-center gap-1">
                              {client.profileCompletion === 100 ? (
                                <BadgeCheck className="h-3 w-3 text-chart-2" />
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                              Profil
                            </span>
                            <span className={`font-medium ${client.profileCompletion === 100 ? "text-chart-2" : client.profileCompletion >= 50 ? "text-primary" : "text-destructive"}`}>
                              {client.profileCompletion}%
                            </span>
                          </div>
                          <Progress 
                            value={client.profileCompletion} 
                            className={`h-1 ${client.profileCompletion === 100 ? "[&>div]:bg-chart-2" : client.profileCompletion >= 50 ? "" : "[&>div]:bg-destructive"}`}
                          />
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
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Prénom"
                              value={editForm.first_name}
                              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                              className="w-32"
                            />
                            <Input
                              placeholder="Nom"
                              value={editForm.last_name}
                              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                              className="w-32"
                            />
                          </div>
                          <Input
                            placeholder="Téléphone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-48"
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {selectedClient.first_name || "Sans"} {selectedClient.last_name || "nom"}
                            {selectedClient.profileCompletion === 100 ? (
                              <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30 gap-1">
                                <BadgeCheck className="h-3 w-3" />
                                Cavalier Vérifié
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                                <XCircle className="h-3 w-3" />
                                Profil incomplet
                              </Badge>
                            )}
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
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateProfileMutation.isPending}>
                          <Save className="h-4 w-4 mr-1" />
                          Enregistrer
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleStartEdit}>
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-3 mt-4">
                  <div className="flex items-end gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Lead Score</div>
                      <div className="text-3xl font-bold text-primary">{selectedClient.leadScore}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Profil Cavalier</div>
                      <div className={`text-3xl font-bold ${selectedClient.profileCompletion === 100 ? "text-chart-2" : selectedClient.profileCompletion >= 50 ? "text-primary" : "text-destructive"}`}>
                        {selectedClient.profileCompletion}%
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={selectedClient.profileCompletion} 
                    className={`h-2 w-48 ${selectedClient.profileCompletion === 100 ? "[&>div]:bg-chart-2" : selectedClient.profileCompletion >= 50 ? "" : "[&>div]:bg-destructive"}`}
                  />
                  <UserRoleManager
                    userId={selectedClient.user_id}
                    userName={`${selectedClient.first_name || "Sans"} ${selectedClient.last_name || "nom"}`}
                    currentRole={selectedClient.userRole}
                    onRoleChanged={() => queryClient.invalidateQueries({ queryKey: ["crm-clients"] })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">
                        {selectedClient.email ? (
                          <a href={`mailto:${selectedClient.email}`} className="text-primary hover:underline">
                            {selectedClient.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">Non renseigné</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-chart-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <p className="text-sm font-medium truncate">
                        {selectedClient.phone ? (
                          <a href={`tel:${selectedClient.phone}`} className="hover:underline">
                            {selectedClient.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">Non renseigné</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-chart-4/10 flex items-center justify-center">
                      <Star className="h-4 w-4 text-chart-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Niveau équestre</p>
                      <p className="text-sm font-medium capitalize">
                        {selectedClient.riding_level || <span className="text-muted-foreground italic">Non défini</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Onboarding Steps Section */}
                <div className="p-4 bg-muted/20 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      Étapes Onboarding
                      <span className="text-muted-foreground font-normal">
                        ({ONBOARDING_STEPS.filter(s => isFieldFilled(selectedClient, s.key)).length}/{ONBOARDING_STEPS.length})
                      </span>
                    </h4>
                    {selectedClient.profileCompletion < 100 && selectedClient.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendProfileReminder(selectedClient.user_id)}
                        disabled={isSendingReminder}
                        className="gap-2"
                      >
                        {isSendingReminder ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Relancer par email
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["Identité", "Profil Cavalier", "Préférences"] as const).map(category => (
                      <div key={category}>
                        <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">{category}</p>
                        <div className="space-y-1">
                          {ONBOARDING_STEPS.filter(s => s.category === category).map(step => {
                            const filled = isFieldFilled(selectedClient, step.key);
                            return (
                              <div key={step.key} className="flex items-center gap-2 text-sm">
                                {filled ? (
                                  <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive/60 shrink-0" />
                                )}
                                <span className={filled ? "text-foreground" : "text-muted-foreground"}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
                      <ShoppingBag className="h-5 w-5 mx-auto text-chart-1 mb-1" />
                      <p className="text-2xl font-bold">{selectedClient.totalRevenue.toLocaleString()}€</p>
                      <p className="text-xs text-muted-foreground">CA Total</p>
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
                          <div className="text-center p-3 rounded-lg bg-background">
                            <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Budget</p>
                            <Badge className={getBudgetColor(analysisResult.analysis.budget_probable)}>
                              {analysisResult.analysis.budget_probable}
                            </Badge>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-background">
                            <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Intention</p>
                            <Badge variant="outline">{analysisResult.analysis.intention_principale}</Badge>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-background">
                            <Star className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground mb-1">Confiance</p>
                            <Badge variant="secondary">{analysisResult.analysis.confiance}</Badge>
                          </div>
                        </div>

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
