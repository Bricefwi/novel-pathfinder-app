import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, MessageSquare, Star, TrendingUp, Home } from "lucide-react";

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  totalMessages: number;
  pendingReviews: number;
  totalActivities: number;
  accommodationBookings: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    pendingBookings: 0,
    totalMessages: 0,
    pendingReviews: 0,
    totalActivities: 0,
    accommodationBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalBookings },
        { count: pendingBookings },
        { count: totalMessages },
        { count: pendingReviews },
        { count: totalActivities },
        { count: accommodationBookings },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("chat_messages").select("*", { count: "exact", head: true }),
        supabase.from("user_reviews").select("*", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("activities").select("*", { count: "exact", head: true }),
        supabase.from("accommodation_slots").select("*", { count: "exact", head: true }).not("booking_id", "is", null),
      ]);

      setStats({
        totalBookings: totalBookings || 0,
        pendingBookings: pendingBookings || 0,
        totalMessages: totalMessages || 0,
        pendingReviews: pendingReviews || 0,
        totalActivities: totalActivities || 0,
        accommodationBookings: accommodationBookings || 0,
      });

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, activities(title)")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentBookings(bookings || []);
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Réservations totales", value: stats.totalBookings, icon: Calendar, color: "text-primary" },
    { title: "En attente", value: stats.pendingBookings, icon: TrendingUp, color: "text-amber-500" },
    { title: "Messages chat", value: stats.totalMessages, icon: MessageSquare, color: "text-blue-500" },
    { title: "Avis à valider", value: stats.pendingReviews, icon: Star, color: "text-yellow-500" },
    { title: "Activités", value: stats.totalActivities, icon: Users, color: "text-green-500" },
    { title: "Nuits réservées", value: stats.accommodationBookings, icon: Home, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières réservations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-muted-foreground">Aucune réservation récente</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{booking.contact_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.activities?.title || "Hébergement"} - {new Date(booking.start_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                    booking.status === "pending" ? "bg-amber-100 text-amber-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {booking.status === "confirmed" ? "Confirmé" :
                     booking.status === "pending" ? "En attente" : "Annulé"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
