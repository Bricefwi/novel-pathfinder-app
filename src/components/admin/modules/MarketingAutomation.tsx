import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SegmentData {
  name: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  type: string;
  count: number;
  label: string;
}

export function MarketingAutomation() {
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    completeProfiles: 0,
    totalPageViews: 0,
    uniqueVisitors: 0,
    emailsSent: 0,
    newsletterSubscribers: 0,
  });

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      // Fetch profiles data with all marketing-relevant fields
      const { data: profiles } = await supabase
        .from("profiles")
        .select("dream_destinations, riding_level, preferred_trip_types, interests, travel_style, phone, first_name, last_name, riding_experience_years, riding_style");

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

      // Fetch newsletter subscribers
      const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("is_active", true);

      // Calculate segments from profile data
      const destinationCounts: Record<string, number> = {};
      const levelCounts: Record<string, number> = {};
      const interestCounts: Record<string, number> = {};
      let completeProfiles = 0;

      profiles?.forEach(profile => {
        // Count destinations
        profile.dream_destinations?.forEach((dest: string) => {
          destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
        });

        // Count levels
        if (profile.riding_level) {
          levelCounts[profile.riding_level] = (levelCounts[profile.riding_level] || 0) + 1;
        }

        // Count interests
        profile.interests?.forEach((interest: string) => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        });

        // Check if profile is complete
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
          profile.travel_style,
        ];
        if (fields.filter(Boolean).length === 10) {
          completeProfiles++;
        }
      });

      // Build dynamic segments
      const topDestinations = Object.entries(destinationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      const segmentsList: SegmentData[] = [
        ...topDestinations.map(([dest, count]) => ({
          name: `Intéressés par ${dest}`,
          count,
          icon: <MapPin className="h-4 w-4" />,
          color: "bg-blue-500/10 text-blue-700 border-blue-500/30",
        })),
        {
          name: "Cavaliers Débutants",
          count: levelCounts["debutant"] || 0,
          icon: <Mountain className="h-4 w-4" />,
          color: "bg-green-500/10 text-green-700 border-green-500/30",
        },
        {
          name: "Cavaliers Confirmés/Experts",
          count: (levelCounts["confirme"] || 0) + (levelCounts["expert"] || 0),
          icon: <Mountain className="h-4 w-4" />,
          color: "bg-amber-500/10 text-amber-700 border-amber-500/30",
        },
        {
          name: "Profils Complets (VIP)",
          count: completeProfiles,
          icon: <Sparkles className="h-4 w-4" />,
          color: "bg-purple-500/10 text-purple-700 border-purple-500/30",
        },
      ];

      setSegments(segmentsList);

      // Calculate stats
      const uniqueSessions = new Set(analyticsEvents?.map(e => e.session_id)).size;
      
      setStats({
        totalProfiles: profiles?.length || 0,
        completeProfiles,
        totalPageViews: analyticsEvents?.filter(e => e.event_type === "page_view").length || 0,
        uniqueVisitors: uniqueSessions,
        emailsSent: emailLogs?.length || 0,
        newsletterSubscribers: subscribers?.length || 0,
      });

      // Recent activities
      const pageViews = analyticsEvents?.filter(e => e.event_type === "page_view").length || 0;
      const clicks = analyticsEvents?.filter(e => e.event_type === "click").length || 0;

      setRecentActivities([
        { type: "page_view", count: pageViews, label: "Pages vues (7j)" },
        { type: "click", count: clicks, label: "Interactions" },
        { type: "email", count: emailLogs?.length || 0, label: "Emails envoyés" },
      ]);

    } catch (error) {
      console.error("Error fetching marketing data:", error);
    }
    setLoading(false);
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
              <Zap className="h-5 w-5 text-amber-500" />
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
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Navigation</p>
                  <p className="text-xs text-muted-foreground">
                    Pages visitées, temps passé, sources de trafic
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Heart className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Interactions</p>
                  <p className="text-xs text-muted-foreground">
                    Devis demandés, réservations, favoris
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  Actif
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Mail className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Échanges Email/Chat</p>
                  <p className="text-xs text-muted-foreground">
                    Historique des communications et questions
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  Actif
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Actions Recommandées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Newsletter ciblée</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Envoyer une newsletter aux {segments.find(s => s.name.includes("Mongolie"))?.count || 0} personnes intéressées par la Mongolie
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Send className="h-3 w-3 mr-2" />
                Bientôt
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">Rappel profil</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Notifier les {stats.totalProfiles - stats.completeProfiles} utilisateurs avec profil incomplet
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Clock className="h-3 w-3 mr-2" />
                Bientôt
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Offre VIP</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Proposer une offre exclusive aux {stats.completeProfiles} profils complets
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Target className="h-3 w-3 mr-2" />
                Bientôt
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
