import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function AnalyticsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: async () => {
      const [
        profilesRes,
        bookingsRes,
        quotesRes,
        activitiesRes,
        contactsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("created_at, dream_destinations", { count: "exact" }),
        supabase.from("bookings").select("status, total_price, created_at", { count: "exact" }),
        supabase.from("quotes").select("status, total_price, created_at", { count: "exact" }),
        supabase.from("activities").select("country, activity_type", { count: "exact" }).eq("is_active", true),
        supabase.from("contact_requests").select("created_at", { count: "exact" }),
      ]);

      // Funnel data
      const uniqueVisitors = 1250; // Placeholder - would come from analytics
      const registered = profilesRes.count || 0;
      const quoteRequests = quotesRes.count || 0;
      const confirmedBookings = (bookingsRes.data || []).filter(b => b.status === "confirmed").length;

      const funnelData = [
        { name: "Visiteurs", value: uniqueVisitors, fill: COLORS[0] },
        { name: "Inscrits", value: registered, fill: COLORS[1] },
        { name: "Demandes devis", value: quoteRequests, fill: COLORS[2] },
        { name: "Ventes", value: confirmedBookings, fill: COLORS[3] },
      ];

      // Destinations heatmap
      const destinationMap = new Map<string, number>();
      (profilesRes.data || []).forEach(p => {
        (p.dream_destinations || []).forEach((d: string) => {
          destinationMap.set(d, (destinationMap.get(d) || 0) + 1);
        });
      });
      const destinationsData = Array.from(destinationMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Revenue by month (mock data for visualization)
      const revenueData = [
        { month: "Jan", revenue: 4200 },
        { month: "Fév", revenue: 5100 },
        { month: "Mar", revenue: 6800 },
        { month: "Avr", revenue: 8200 },
        { month: "Mai", revenue: 9500 },
        { month: "Juin", revenue: 12000 },
      ];

      // Activities by type
      const activityTypes = new Map<string, number>();
      (activitiesRes.data || []).forEach(a => {
        activityTypes.set(a.activity_type, (activityTypes.get(a.activity_type) || 0) + 1);
      });
      const activityTypeData = Array.from(activityTypes.entries()).map(([name, value]) => ({
        name: name === "sejour" ? "Séjours" : name === "randonnee" ? "Randonnées" : name === "stage" ? "Stages" : name,
        value,
      }));

      return {
        funnelData,
        destinationsData,
        revenueData,
        activityTypeData,
        totals: {
          profiles: registered,
          bookings: bookingsRes.count || 0,
          quotes: quoteRequests,
          contacts: contactsRes.count || 0,
          revenue: (bookingsRes.data || [])
            .filter(b => b.status === "confirmed")
            .reduce((acc, b) => acc + (b.total_price || 0), 0),
        },
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualisez vos performances et métriques clés
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients inscrits</p>
                <p className="text-2xl font-bold">{stats?.totals.profiles}</p>
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +12%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devis envoyés</p>
                <p className="text-2xl font-bold">{stats?.totals.quotes}</p>
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +8%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Réservations</p>
                <p className="text-2xl font-bold">{stats?.totals.bookings}</p>
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +15%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold">{stats?.totals.revenue.toLocaleString()}€</p>
              </div>
              <div className="flex items-center text-green-500 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                +22%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Entonnoir de Conversion
            </CardTitle>
            <CardDescription>De la visite à la vente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.funnelData.map((item, index) => {
                const maxValue = stats.funnelData[0].value;
                const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                const prevValue = index > 0 ? stats.funnelData[index - 1].value : null;
                const conversionRate = prevValue ? ((item.value / prevValue) * 100).toFixed(1) : null;

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{item.value}</span>
                        {conversionRate && (
                          <span className="text-xs text-muted-foreground">
                            ({conversionRate}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Destinations Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Destinations les plus demandées
            </CardTitle>
            <CardDescription>Basé sur les profils clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.destinationsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Évolution du CA
            </CardTitle>
            <CardDescription>Chiffre d'affaires mensuel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats?.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}€`} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Répartition par type
            </CardTitle>
            <CardDescription>Activités actives</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats?.activityTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {stats?.activityTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
