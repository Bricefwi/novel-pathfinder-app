import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Megaphone, 
  Zap, 
  Mail, 
  Users, 
  Bell, 
  MapPin,
  Heart,
  Mountain,
  TrendingUp,
  Send,
  Eye,
  MousePointer,
  Clock,
  Target,
  Sparkles,
  Loader2,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SegmentData {
  name: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  emails?: string[];
  destination?: string;
}

interface RecentActivity {
  type: string;
  count: number;
  label: string;
}

type ActionType = "newsletter" | "rappel" | "vip" | null;

export function MarketingAutomation() {
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [incompleteProfileEmails, setIncompleteProfileEmails] = useState<string[]>([]);
  const [completeProfileEmails, setCompleteProfileEmails] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    completeProfiles: 0,
    incompleteProfiles: 0,
    totalPageViews: 0,
    uniqueVisitors: 0,
    emailsSent: 0,
    newsletterSubscribers: 0,
  });
  
  // Action modals state
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newsletterSubject, setNewsletterSubject] = useState("");
  const [newsletterContent, setNewsletterContent] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<SegmentData | null>(null);
  const [rappelSubject, setRappelSubject] = useState("Complétez votre profil cavalier !");
  const [rappelContent, setRappelContent] = useState("Bonjour ! Nous avons remarqué que votre profil n'est pas encore complet. Prenez quelques minutes pour finaliser vos informations et accéder à des offres personnalisées.");
  const [vipSubject, setVipSubject] = useState("Offre exclusive pour nos VIP 🌟");
  const [vipContent, setVipContent] = useState("En tant que membre VIP, vous bénéficiez d'une offre exclusive sur nos prochaines randonnées. Contactez-nous pour en savoir plus !");

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      // Fetch profiles data with user_id to get emails
      // NOTE: Aligné avec profile-utils.ts - 10 champs requis
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, dream_destinations, riding_level, preferred_trip_types, interests, travel_companions, phone, first_name, last_name, riding_experience_years, riding_style");

      // Fetch analytics events (page views, interactions)
      const { data: analyticsEvents } = await supabase
        .from("analytics_events")
        .select("event_type, source, page_path, session_id")
        .order("created_at", { ascending: false })
        .limit(1000);

      // Fetch email audit log
      const { data: emailLogs } = await supabase
        .from("email_audit_log")
        .select("type, status")
        .eq("status", "sent");

      // Fetch newsletter subscribers with emails
      const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("is_active", true);

      // Calculate segments from profile data
      const destinationEmails: Record<string, string[]> = {};
      const levelCounts: Record<string, number> = {};
      let completeProfiles = 0;
      const completeEmails: string[] = [];
      const incompleteEmails: string[] = [];

      // Get emails from newsletter subscribers by matching user_id
      const subscriberEmailsSet = new Set(subscribers?.map(s => s.email) || []);

      profiles?.forEach(profile => {
        // Count destinations and track emails (simplified - using user_id as proxy)
        profile.dream_destinations?.forEach((dest: string) => {
          if (!destinationEmails[dest]) destinationEmails[dest] = [];
          // We'll need to fetch actual emails separately
        });

        // Count levels
        if (profile.riding_level) {
          levelCounts[profile.riding_level] = (levelCounts[profile.riding_level] || 0) + 1;
        }

        // Check if profile is complete - ALIGNÉ avec profile-utils.ts
        // 10 champs requis : first_name, last_name, phone, riding_level, riding_experience_years,
        // dream_destinations, preferred_trip_types, interests, riding_style, travel_companions
        const fields = [
          profile.first_name,
          profile.last_name,
          profile.phone,
          profile.riding_level,
          profile.riding_experience_years,
          (profile.dream_destinations?.length ?? 0) > 0,
          (profile.preferred_trip_types?.length ?? 0) > 0,
          (profile.interests?.length ?? 0) > 0,
          (profile.riding_style?.length ?? 0) > 0,
          profile.travel_companions,  // <-- travel_companions, pas travel_style
        ];
        
        const isComplete = fields.filter(Boolean).length === 10;
        if (isComplete) {
          completeProfiles++;
        }
      });

      // Fetch emails for profiles
      const userIds = profiles?.map(p => p.user_id) || [];
      if (userIds.length > 0) {
        // Get emails from newsletter_subscribers linked to profiles
        const { data: profileEmails } = await supabase
          .from("newsletter_subscribers")
          .select("email, user_id")
          .in("user_id", userIds);

        // Rebuild email lists
        profiles?.forEach(profile => {
          const email = profileEmails?.find(pe => pe.user_id === profile.user_id)?.email;
          if (!email) return;

          // ALIGNÉ avec profile-utils.ts
          const fields = [
            profile.first_name,
            profile.last_name,
            profile.phone,
            profile.riding_level,
            profile.riding_experience_years,
            (profile.dream_destinations?.length ?? 0) > 0,
            (profile.preferred_trip_types?.length ?? 0) > 0,
            (profile.interests?.length ?? 0) > 0,
            (profile.riding_style?.length ?? 0) > 0,
            profile.travel_companions,  // <-- travel_companions, pas travel_style
          ];
          
          if (fields.filter(Boolean).length === 10) {
            completeEmails.push(email);
          } else {
            incompleteEmails.push(email);
          }

          // Add to destination segments
          profile.dream_destinations?.forEach((dest: string) => {
            if (!destinationEmails[dest]) destinationEmails[dest] = [];
            destinationEmails[dest].push(email);
          });
        });
      }

      setCompleteProfileEmails(completeEmails);
      setIncompleteProfileEmails(incompleteEmails);

      // Build dynamic segments
      const topDestinations = Object.entries(destinationEmails)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 5);

      const segmentsList: SegmentData[] = [
        ...topDestinations.map(([dest, emails]) => ({
          name: `Intéressés par ${dest}`,
          count: emails.length,
          icon: <MapPin className="h-4 w-4" />,
          color: "bg-chart-4/20 text-chart-4 border-chart-4/30",
          emails,
          destination: dest,
        })),
        {
          name: "Cavaliers Débutants",
          count: levelCounts["debutant"] || 0,
          icon: <Mountain className="h-4 w-4" />,
          color: "bg-chart-1/20 text-chart-1 border-chart-1/30",
        },
        {
          name: "Cavaliers Confirmés/Experts",
          count: (levelCounts["confirme"] || 0) + (levelCounts["expert"] || 0),
          icon: <Mountain className="h-4 w-4" />,
          color: "bg-chart-2/20 text-chart-2 border-chart-2/30",
        },
        {
          name: "Profils Complets (VIP)",
          count: completeProfiles,
          icon: <Sparkles className="h-4 w-4" />,
          color: "bg-chart-5/20 text-chart-5 border-chart-5/30",
          emails: completeEmails,
        },
      ];

      setSegments(segmentsList);

      // Calculate stats
      const uniqueSessions = new Set(analyticsEvents?.map(e => e.session_id)).size;
      
      setStats({
        totalProfiles: profiles?.length || 0,
        completeProfiles,
        incompleteProfiles: (profiles?.length || 0) - completeProfiles,
        totalPageViews: analyticsEvents?.filter(e => e.event_type === "page_view").length || 0,
        uniqueVisitors: uniqueSessions,
        emailsSent: emailLogs?.length || 0,
        newsletterSubscribers: subscribers?.length || 0,
      });

    } catch (error) {
      console.error("Error fetching marketing data:", error);
    }
    setLoading(false);
  };

  // Send targeted newsletter
  const handleSendNewsletter = async () => {
    if (!selectedSegment || !newsletterSubject || !newsletterContent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!selectedSegment.emails || selectedSegment.emails.length === 0) {
      toast.error("Aucun email disponible pour ce segment");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: {
          subject: newsletterSubject,
          content: newsletterContent,
          targetEmails: selectedSegment.emails,
          testMode: false,
        },
      });

      if (error) throw error;

      toast.success(`Newsletter envoyée à ${selectedSegment.emails.length} personnes !`);
      setActiveAction(null);
      setNewsletterSubject("");
      setNewsletterContent("");
      setSelectedSegment(null);
    } catch (err) {
      console.error("Erreur envoi newsletter:", err);
      toast.error("Erreur lors de l'envoi de la newsletter");
    } finally {
      setActionLoading(false);
    }
  };

  // Send profile reminder using dedicated edge function
  const handleSendRappel = async () => {
    if (stats.incompleteProfiles === 0) {
      toast.error("Aucun profil incomplet trouvé");
      return;
    }

    setActionLoading(true);
    try {
      // Utiliser la nouvelle edge function dédiée
      const { data, error } = await supabase.functions.invoke("send-incomplete-profile-reminders");

      if (error) throw error;

      if (data?.sent_count > 0) {
        toast.success(`🚀 Rappel envoyé à ${data.sent_count} utilisateur${data.sent_count > 1 ? 's' : ''} !`);
      } else {
        toast.info("Aucun rappel envoyé - tous les profils avec email sont complets");
      }
      
      if (data?.failed_count > 0) {
        toast.warning(`${data.failed_count} échec(s) d'envoi`);
      }
      
      setActiveAction(null);
    } catch (err) {
      console.error("Erreur envoi rappel:", err);
      toast.error("Erreur lors de l'envoi des rappels");
    } finally {
      setActionLoading(false);
    }
  };

  // Send VIP offer
  const handleSendVIP = async () => {
    if (!vipSubject || !vipContent) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (completeProfileEmails.length === 0) {
      toast.error("Aucun profil VIP trouvé");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: {
          subject: vipSubject,
          content: vipContent,
          targetEmails: completeProfileEmails,
          testMode: false,
        },
      });

      if (error) throw error;

      toast.success(`Offre VIP envoyée à ${completeProfileEmails.length} membres !`);
      setActiveAction(null);
    } catch (err) {
      console.error("Erreur envoi VIP:", err);
      toast.error("Erreur lors de l'envoi de l'offre VIP");
    } finally {
      setActionLoading(false);
    }
  };

  const openNewsletterModal = (segment: SegmentData) => {
    setSelectedSegment(segment);
    setNewsletterSubject(`Découvrez nos randonnées ${segment.destination || ""}`);
    setNewsletterContent(`Bonjour,\n\nNous avons sélectionné pour vous nos meilleures randonnées${segment.destination ? ` en ${segment.destination}` : ""}. Découvrez nos offres du moment !\n\nL'équipe An Arwen`);
    setActiveAction("newsletter");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Marketing Intelligence
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Exploitez les données collectées pour cibler vos clients et prospects
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Profils
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalProfiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4" />
              Complets
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completeProfiles}</p>
            <Progress 
              value={stats.totalProfiles > 0 ? (stats.completeProfiles / stats.totalProfiles) * 100 : 0} 
              className="h-1 mt-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              Pages vues
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalPageViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MousePointer className="h-4 w-4" />
              Visiteurs
            </div>
            <p className="text-2xl font-bold mt-1">{stats.uniqueVisitors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Send className="h-4 w-4" />
              Emails
            </div>
            <p className="text-2xl font-bold mt-1">{stats.emailsSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bell className="h-4 w-4" />
              Newsletter
            </div>
            <p className="text-2xl font-bold mt-1">{stats.newsletterSubscribers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dynamic Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Segments Automatiques
            </CardTitle>
            <CardDescription>
              Segments générés à partir des données d'onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={segment.color}>
                      {segment.icon}
                    </Badge>
                    <span className="font-medium text-sm">{segment.name}</span>
                  </div>
                  <Badge variant="secondary">{segment.count} membres</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-chart-2" />
              Sources de Données
            </CardTitle>
            <CardDescription>
              Données collectées et utilisées pour le ciblage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    Niveau équestre, destinations, préférences, budget
                  </p>
                </div>
                <Badge variant="outline" className="bg-chart-1/20 text-chart-1 border-chart-1/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-chart-4/10">
                  <Eye className="h-4 w-4 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Navigation</p>
                  <p className="text-xs text-muted-foreground">
                    Pages visitées, temps passé, sources de trafic
                  </p>
                </div>
                <Badge variant="outline" className="bg-chart-1/20 text-chart-1 border-chart-1/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-chart-5/10">
                  <Heart className="h-4 w-4 text-chart-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Interactions</p>
                  <p className="text-xs text-muted-foreground">
                    Devis demandés, réservations, favoris
                  </p>
                </div>
                <Badge variant="outline" className="bg-chart-1/20 text-chart-1 border-chart-1/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-chart-2/10">
                  <Mail className="h-4 w-4 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Échanges Email/Chat</p>
                  <p className="text-xs text-muted-foreground">
                    Historique des communications et questions
                  </p>
                </div>
                <Badge variant="outline" className="bg-chart-1/20 text-chart-1 border-chart-1/30">
                  Actif
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions - NOW ACTIVE */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Actions Recommandées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Newsletter ciblée */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-chart-4" />
                <span className="font-medium text-sm">Newsletter ciblée</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Envoyer une newsletter aux {segments.find(s => s.destination)?.count || 0} personnes intéressées par une destination
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => {
                  const segmentWithEmails = segments.find(s => s.emails && s.emails.length > 0);
                  if (segmentWithEmails) {
                    openNewsletterModal(segmentWithEmails);
                  } else {
                    toast.error("Aucun segment avec emails disponibles");
                  }
                }}
              >
                <Send className="h-3 w-3" />
                Envoyer
              </Button>
            </div>

            {/* Rappel profil - Bouton direct sans modal */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-chart-2" />
                <span className="font-medium text-sm">Rappel profil</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Notifier les <strong>{stats.incompleteProfiles}</strong> utilisateurs avec profil incomplet
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={handleSendRappel}
                disabled={stats.incompleteProfiles === 0 || actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Envoyer les rappels
              </Button>
            </div>

            {/* Offre VIP */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-chart-5" />
                <span className="font-medium text-sm">Offre VIP</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Proposer une offre exclusive aux {stats.completeProfiles} profils complets
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => setActiveAction("vip")}
                disabled={stats.completeProfiles === 0}
              >
                <Target className="h-3 w-3" />
                Envoyer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Modal */}
      <Dialog open={activeAction === "newsletter"} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-chart-4" />
              Newsletter ciblée
            </DialogTitle>
            <DialogDescription>
              Envoyer à {selectedSegment?.count || 0} personnes du segment "{selectedSegment?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet de l'email</Label>
              <Input
                id="subject"
                value={newsletterSubject}
                onChange={(e) => setNewsletterSubject(e.target.value)}
                placeholder="Objet de votre newsletter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                value={newsletterContent}
                onChange={(e) => setNewsletterContent(e.target.value)}
                placeholder="Rédigez votre message..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              Annuler
            </Button>
            <Button onClick={handleSendNewsletter} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rappel Modal */}
      <Dialog open={activeAction === "rappel"} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-chart-2" />
              Rappel profil incomplet
            </DialogTitle>
            <DialogDescription>
              Envoyer à {incompleteProfileEmails.length} utilisateurs avec profil incomplet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rappel-subject">Sujet de l'email</Label>
              <Input
                id="rappel-subject"
                value={rappelSubject}
                onChange={(e) => setRappelSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rappel-content">Contenu</Label>
              <Textarea
                id="rappel-content"
                value={rappelContent}
                onChange={(e) => setRappelContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              Annuler
            </Button>
            <Button onClick={handleSendRappel} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIP Modal */}
      <Dialog open={activeAction === "vip"} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-5" />
              Offre VIP exclusive
            </DialogTitle>
            <DialogDescription>
              Envoyer à {completeProfileEmails.length} membres VIP (profils complets)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vip-subject">Sujet de l'email</Label>
              <Input
                id="vip-subject"
                value={vipSubject}
                onChange={(e) => setVipSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vip-content">Contenu</Label>
              <Textarea
                id="vip-content"
                value={vipContent}
                onChange={(e) => setVipContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              Annuler
            </Button>
            <Button onClick={handleSendVIP} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Envoyer l'offre VIP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
