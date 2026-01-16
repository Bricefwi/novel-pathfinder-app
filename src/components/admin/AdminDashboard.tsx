import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Home,
  Receipt,
  Euro,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ExternalLink,
  Percent,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  activity_title: string;
  total_price: number;
  status: string | null;
  created_at: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch all dashboard data in one query
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const [
        bookingsRes,
        quotesRes,
        messagesRes,
        reviewsRes,
        activitiesRes,
        accommodationRes,
        profilesRes,
        slotsRes,
        recentBookingsRes,
        recentQuotesRes,
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact" }),
        supabase.from("quotes").select("*"),
        supabase.from("chat_messages").select("*", { count: "exact" }),
        supabase.from("user_reviews").select("*", { count: "exact" }).eq("is_approved", false),
        supabase.from("activities").select("*", { count: "exact" }).eq("is_active", true),
        supabase.from("accommodation_slots").select("*", { count: "exact" }).not("booking_id", "is", null),
        supabase.from("profiles").select("dream_destinations, preferred_duration, newsletter_subscribed"),
        supabase.from("activity_slots").select("*, activities(title)").gte("start_date", now.toISOString().split("T")[0]),
        supabase.from("bookings").select("*, activities(title)").order("created_at", { ascending: false }).limit(5),
        supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const quotes = quotesRes.data || [];
      const profiles = profilesRes.data || [];
      const slots = slotsRes.data || [];

      // Calculate monthly revenue
      const confirmedBookings = (bookingsRes.data || []).filter(b => b.status === "confirmed");
      const monthlyRevenue = confirmedBookings
        .filter(b => b.created_at >= monthStart && b.created_at <= monthEnd)
        .reduce((acc, b) => acc + (b.total_price || 0), 0);

      // Calculate pending quotes
      const pendingQuotes = quotes.filter(q => q.status === "sent" || q.status === "draft");
      const signedQuotes = quotes.filter(q => q.status === "signed");

      // Calculate occupancy rate
      const totalCapacity = slots.reduce((acc, s) => acc + (s.max_participants || 0), 0);
      const currentOccupancy = slots.reduce((acc, s) => acc + (s.current_participants || 0), 0);
      const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

      // Aggregate preferences
      const destinationMap = new Map<string, number>();
      let totalDurations = 0;
      let durationCount = 0;
      let newsletterCount = 0;

      profiles.forEach(p => {
        (p.dream_destinations || []).forEach((d: string) => {
          destinationMap.set(d, (destinationMap.get(d) || 0) + 1);
        });
        if (p.preferred_duration) {
          const match = p.preferred_duration.match(/\d+/);
          if (match) {
            totalDurations += parseInt(match[0]);
            durationCount++;
          }
        }
        if (p.newsletter_subscribed) newsletterCount++;
      });

      const topDestinations = Array.from(destinationMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const avgDuration = durationCount > 0 ? Math.round(totalDurations / durationCount) : 7;

      return {
        stats: {
          totalBookings: bookingsRes.count || 0,
          pendingBookings: (bookingsRes.data || []).filter(b => b.status === "pending").length,
          totalMessages: messagesRes.count || 0,
          pendingReviews: reviewsRes.count || 0,
          totalActivities: activitiesRes.count || 0,
          accommodationBookings: accommodationRes.count || 0,
          monthlyRevenue,
          pendingQuotes: pendingQuotes.length,
          signedQuotes: signedQuotes.length,
          occupancyRate,
          totalProfiles: profiles.length,
          newsletterSubscribers: newsletterCount,
        },
        preferences: {
          topDestinations,
          avgDuration,
          newsletterRate: profiles.length > 0 ? Math.round((newsletterCount / profiles.length) * 100) : 0,
        },
        recentBookings: recentBookingsRes.data || [],
        recentQuotes: (recentQuotesRes.data || []) as Quote[],
      };
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-muted">Brouillon</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Envoyé</Badge>;
      case "signed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Signé</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Annulé</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const preferences = data?.preferences;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif">Vue d'ensemble</h1>
          <p className="text-muted-foreground text-sm">
            Bienvenue dans votre Tour de Contrôle
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/diagnostics")} className="gap-2">
          <Activity className="h-4 w-4" />
          Diagnostics Système
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CA du mois</p>
                <p className="text-2xl font-bold text-primary">
                  {stats?.monthlyRevenue.toLocaleString("fr-FR")}€
                </p>
              </div>
              <Euro className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devis en attente</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.pendingQuotes}</p>
              </div>
              <Receipt className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
            {stats?.pendingQuotes && stats.pendingQuotes > 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Action requise
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux d'occupation</p>
                <p className="text-2xl font-bold text-green-600">{stats?.occupancyRate}%</p>
              </div>
              <Percent className="h-8 w-8 text-green-500 opacity-80" />
            </div>
            <Progress value={stats?.occupancyRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devis signés</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.signedQuotes}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[
          { title: "Réservations", value: stats?.totalBookings, icon: Calendar, color: "text-primary" },
          { title: "En attente", value: stats?.pendingBookings, icon: Clock, color: "text-amber-500" },
          { title: "Messages", value: stats?.totalMessages, icon: MessageSquare, color: "text-blue-500" },
          { title: "Avis à valider", value: stats?.pendingReviews, icon: Star, color: "text-yellow-500" },
          { title: "Activités", value: stats?.totalActivities, icon: MapPin, color: "text-green-500" },
          { title: "Nuits réservées", value: stats?.accommodationBookings, icon: Home, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground truncate">{stat.title}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Derniers devis
            </CardTitle>
            <CardDescription>Suivi des demandes commerciales</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentQuotes.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">Aucun devis récent</p>
            ) : (
              <div className="space-y-3">
                {data?.recentQuotes.map((quote) => (
                  <div 
                    key={quote.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{quote.client_name}</p>
                        {getStatusBadge(quote.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {quote.activity_title} • {quote.quote_number}
                      </p>
                    </div>
                    <div className="text-right pl-4">
                      <p className="font-semibold">{quote.total_price?.toLocaleString("fr-FR")}€</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.created_at), "dd MMM", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Préférences clients
            </CardTitle>
            <CardDescription>Agrégation des profils</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Top destinations</p>
              <div className="space-y-2">
                {preferences?.topDestinations.map(([dest, count], idx) => {
                  const total = preferences.topDestinations.reduce((acc, [, c]) => acc + c, 0);
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={dest} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{dest}</span>
                          <span className="text-muted-foreground">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  );
                })}
                {preferences?.topDestinations.length === 0 && (
                  <p className="text-sm text-muted-foreground">Pas de données</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durée moyenne souhaitée</span>
                <span className="font-medium">{preferences?.avgDuration} jours</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Abonnés newsletter</span>
                <span className="font-medium">{preferences?.newsletterRate}%</span>
              </div>
              <Progress value={preferences?.newsletterRate} className="h-1.5 mt-2" />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total clients</span>
                <div className="flex items-center gap-1 text-primary font-medium">
                  {stats?.totalProfiles}
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Dernières réservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentBookings.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">Aucune réservation récente</p>
          ) : (
            <div className="space-y-3">
              {data?.recentBookings.map((booking: any) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{booking.contact_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.activities?.title || "Hébergement"} • {format(new Date(booking.start_date), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      booking.status === "confirmed" ? "bg-green-100 text-green-800 border-green-200" :
                      booking.status === "pending" ? "bg-amber-100 text-amber-800 border-amber-200" :
                      "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    {booking.status === "confirmed" ? "Confirmé" :
                     booking.status === "pending" ? "En attente" : "Annulé"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
