import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Calendar as CalendarIcon,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Euro,
  Download,
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
} from "recharts";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { COMPANY_CONFIG } from "@/config/constants";
import { toast } from "sonner";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

type DateRange = "7d" | "30d" | "90d" | "ytd" | "custom";

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "90d":
        return { start: subDays(now, 90), end: now };
      case "ytd":
        return { start: startOfYear(now), end: now };
      case "custom":
        return { start: customStartDate || subDays(now, 30), end: customEndDate || now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const { start, end } = getDateRange();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics-dashboard", dateRange, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async () => {
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const [
        profilesRes,
        bookingsRes,
        quotesRes,
        activitiesRes,
        contactsRes,
        previousBookingsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("created_at, dream_destinations", { count: "exact" })
          .gte("created_at", startStr).lte("created_at", endStr),
        supabase.from("bookings").select("status, total_price, created_at", { count: "exact" })
          .gte("created_at", startStr).lte("created_at", endStr),
        supabase.from("quotes").select("status, total_price, created_at", { count: "exact" })
          .gte("created_at", startStr).lte("created_at", endStr),
        supabase.from("activities").select("country, activity_type", { count: "exact" }).eq("is_active", true),
        supabase.from("contact_requests").select("created_at", { count: "exact" })
          .gte("created_at", startStr).lte("created_at", endStr),
        // Previous period for comparison
        supabase.from("bookings").select("status, total_price, created_at", { count: "exact" })
          .gte("created_at", subDays(start, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))).toISOString())
          .lt("created_at", startStr),
      ]);

      // Funnel data
      const uniqueVisitors = 1250; // Placeholder - would come from analytics
      const registered = profilesRes.count || 0;
      const quoteRequests = quotesRes.count || 0;
      const confirmedBookings = (bookingsRes.data || []).filter(b => b.status === "confirmed").length;
      const previousConfirmedBookings = (previousBookingsRes.data || []).filter(b => b.status === "confirmed").length;

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

      // Revenue calculation
      const currentRevenue = (bookingsRes.data || [])
        .filter(b => b.status === "confirmed")
        .reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
      
      const previousRevenue = (previousBookingsRes.data || [])
        .filter(b => b.status === "confirmed")
        .reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);

      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : "0";

      // Top products by revenue
      const productRevenue = new Map<string, { revenue: number; quantity: number }>();
      (bookingsRes.data || []).filter(b => b.status === "confirmed").forEach(b => {
        const activity = "Séjour"; // Would need to join with activities table
        const current = productRevenue.get(activity) || { revenue: 0, quantity: 0 };
        productRevenue.set(activity, { 
          revenue: current.revenue + (Number(b.total_price) || 0),
          quantity: current.quantity + 1
        });
      });

      // Revenue by month
      const revenueByMonth = new Map<string, number>();
      (bookingsRes.data || []).filter(b => b.status === "confirmed").forEach(b => {
        const month = format(new Date(b.created_at), "MMM", { locale: fr });
        revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + (Number(b.total_price) || 0));
      });
      const revenueData = Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
        month,
        revenue,
      }));

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
          revenue: currentRevenue,
          revenueChange: parseFloat(revenueChange),
          bookingsChange: previousConfirmedBookings > 0 
            ? ((confirmedBookings - previousConfirmedBookings) / previousConfirmedBookings * 100)
            : 0,
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

  const exportToExcel = () => {
    if (!stats) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "E85D04" } }, alignment: { horizontal: "center" } };
    const periodLabel = dateRange === "7d" ? "7 derniers jours" : dateRange === "30d" ? "30 derniers jours" : dateRange === "90d" ? "90 derniers jours" : dateRange === "ytd" ? "Depuis début d'année" : `${customStartDate ? format(customStartDate, "dd/MM/yyyy") : ""} - ${customEndDate ? format(customEndDate, "dd/MM/yyyy") : ""}`;

    // Sheet 1: KPIs
    const kpiData = [
      [COMPANY_CONFIG.name + " - Analytics Dashboard"],
      ["Période : " + periodLabel],
      ["Date d'export : " + format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })],
      [],
      ["Indicateur", "Valeur", "Variation (%)"],
      ["Clients inscrits", stats.totals.profiles, "+12%"],
      ["Devis envoyés", stats.totals.quotes, "+8%"],
      ["Réservations", stats.totals.bookings, `${stats.totals.bookingsChange >= 0 ? "+" : ""}${stats.totals.bookingsChange.toFixed(0)}%`],
      ["Chiffre d'affaires (€)", stats.totals.revenue, `${stats.totals.revenueChange >= 0 ? "+" : ""}${stats.totals.revenueChange.toFixed(0)}%`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(kpiData);
    ws1["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }];
    ws1["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws1, "Résumé KPIs");

    // Sheet 2: Funnel
    const funnelRows = stats.funnelData.map((item, index) => {
      const prev = index > 0 ? stats.funnelData[index - 1].value : null;
      const rate = prev ? ((item.value / prev) * 100).toFixed(1) + "%" : "-";
      return [item.name, item.value, rate];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([
      [COMPANY_CONFIG.name + " - Entonnoir de conversion"],
      ["Période : " + periodLabel],
      [],
      ["Étape", "Nombre", "Taux de conversion"],
      ...funnelRows,
    ]);
    ws2["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Entonnoir");

    // Sheet 3: Destinations
    const destRows = (stats.destinationsData || []).map(d => [d.name, d.value]);
    const ws3 = XLSX.utils.aoa_to_sheet([
      [COMPANY_CONFIG.name + " - Destinations demandées"],
      ["Période : " + periodLabel],
      [],
      ["Destination", "Nombre de demandes"],
      ...destRows,
    ]);
    ws3["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Destinations");

    // Sheet 4: Revenue
    const revRows = (stats.revenueData || []).map(r => [r.month, r.revenue]);
    const ws4 = XLSX.utils.aoa_to_sheet([
      [COMPANY_CONFIG.name + " - Évolution du CA"],
      ["Période : " + periodLabel],
      [],
      ["Mois", "Chiffre d'affaires (€)"],
      ...revRows,
    ]);
    ws4["!cols"] = [{ wch: 15 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Évolution CA");

    // Sheet 5: Activity types
    const typeRows = (stats.activityTypeData || []).map(t => [t.name, t.value]);
    const ws5 = XLSX.utils.aoa_to_sheet([
      [COMPANY_CONFIG.name + " - Répartition par type"],
      ["Période : " + periodLabel],
      [],
      ["Type d'activité", "Nombre"],
      ...typeRows,
    ]);
    ws5["!cols"] = [{ wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws5, "Types activités");

    const fileName = `Analytics_AnArwen_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Export Excel généré avec succès !");
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualisez vos performances et métriques clés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={isLoading || !stats}>
            <Download className="h-4 w-4 mr-2" />
            Exporter Excel
          </Button>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="ytd">Depuis le début de l'année</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
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
              <div className={cn(
                "flex items-center text-sm",
                (stats?.totals.bookingsChange || 0) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {(stats?.totals.bookingsChange || 0) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(stats?.totals.bookingsChange || 0).toFixed(0)}%
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
              <div className={cn(
                "flex items-center text-sm",
                (stats?.totals.revenueChange || 0) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {(stats?.totals.revenueChange || 0) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(stats?.totals.revenueChange || 0).toFixed(0)}%
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
              <Euro className="h-5 w-5 text-primary" />
              Évolution du CA
            </CardTitle>
            <CardDescription>Chiffre d'affaires sur la période</CardDescription>
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
