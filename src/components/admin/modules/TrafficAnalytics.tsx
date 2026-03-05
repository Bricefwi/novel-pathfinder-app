import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Eye,
  MousePointerClick,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  TrendingUp,
  Search,
  Link2,
  Mail,
  Share2,
  MapPin,
  Clock,
  BarChart3,
  Target,
  UserPlus,
  UserCheck,
  Megaphone,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subDays, getHours } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// Couleurs pour les graphiques
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(20, 70%, 60%)",
  "hsl(47, 80%, 50%)",
  "hsl(200, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(30, 80%, 55%)",
];

const SOURCE_ICONS: Record<string, React.ElementType> = {
  direct: Globe,
  google: Search,
  bing: Search,
  yahoo: Search,
  facebook: Share2,
  instagram: Share2,
  twitter: Share2,
  linkedin: Share2,
  email: Mail,
  newsletter: Mail,
  referral: Link2,
};

// Catégoriser une source de trafic
const categorizeSource = (source: string): { category: string; detail: string } => {
  const s = (source || "direct").toLowerCase().trim();
  
  if (s === "direct" || s === "") return { category: "Direct", detail: "Accès direct" };
  
  // Moteurs de recherche
  if (s.includes("google")) return { category: "Recherche organique", detail: "Google" };
  if (s.includes("bing")) return { category: "Recherche organique", detail: "Bing" };
  if (s.includes("yahoo")) return { category: "Recherche organique", detail: "Yahoo" };
  if (s.includes("duckduckgo")) return { category: "Recherche organique", detail: "DuckDuckGo" };
  if (s.includes("ecosia")) return { category: "Recherche organique", detail: "Ecosia" };
  if (s.includes("qwant")) return { category: "Recherche organique", detail: "Qwant" };
  
  // Réseaux sociaux
  if (s.includes("facebook") || s.includes("fb.")) return { category: "Réseaux sociaux", detail: "Facebook" };
  if (s.includes("instagram")) return { category: "Réseaux sociaux", detail: "Instagram" };
  if (s.includes("twitter") || s.includes("t.co")) return { category: "Réseaux sociaux", detail: "Twitter/X" };
  if (s.includes("linkedin")) return { category: "Réseaux sociaux", detail: "LinkedIn" };
  if (s.includes("pinterest")) return { category: "Réseaux sociaux", detail: "Pinterest" };
  if (s.includes("tiktok")) return { category: "Réseaux sociaux", detail: "TikTok" };
  if (s.includes("youtube")) return { category: "Réseaux sociaux", detail: "YouTube" };
  
  // Email
  if (s.includes("email") || s.includes("newsletter") || s.includes("mail")) return { category: "Email", detail: s };
  
  // Referral
  return { category: "Referral", detail: s.replace(/^https?:\/\//, "").split("/")[0] };
};

// Catégoriser l'appareil par largeur d'écran
const categorizeDevice = (width: number | undefined): string => {
  if (!width) return "Inconnu";
  if (width < 768) return "Mobile";
  if (width < 1024) return "Tablette";
  return "Desktop";
};

// Noms lisibles pour les pages
const pageDisplayName = (path: string): string => {
  const names: Record<string, string> = {
    "/": "Accueil",
    "/destinations": "Destinations",
    "/galerie": "Galerie",
    "/carnet-voyage": "Carnet de voyage",
    "/contact": "Contact",
    "/hebergement": "Hébergement",
    "/auth": "Connexion",
    "/mon-espace": "Mon espace",
    "/preparer-voyage": "Préparer son voyage",
    "/planning": "Planning",
    "/demande-devis": "Demande de devis",
    "/ecosysteme": "Écosystème local",
    "/cgv": "CGV",
    "/cgu": "CGU",
    "/mentions-legales": "Mentions légales",
    "/cookies": "Cookies",
  };
  return names[path] || path;
};

// Analyser les données internes
const analyzeTrafficData = (events: any[], period: string) => {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const now = new Date();
  
  // === Time Series ===
  const eventsByDate: Record<string, { pageviews: number; sessions: Set<string>; users: Set<string> }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(now, i), "yyyy-MM-dd");
    eventsByDate[date] = { pageviews: 0, sessions: new Set(), users: new Set() };
  }
  
  // Aggregate data
  const sourceCounts: Record<string, number> = {};
  const sourceDetailCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};
  const utmCampaigns: Record<string, { visits: number; sources: Set<string> }> = {};
  const utmMediums: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const allSessions = new Set<string>();
  const allUsers = new Set<string>();
  const sessionFirstSeen = new Map<string, boolean>(); // track new vs returning
  const entryPages: Record<string, number> = {}; // first page per session
  const sessionPages = new Map<string, string[]>(); // pages per session
  
  // Init hours
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;
  
  events.forEach(event => {
    const date = format(new Date(event.created_at), "yyyy-MM-dd");
    const hour = getHours(new Date(event.created_at));
    const sessionId = event.session_id || "unknown";
    const userId = event.user_id || sessionId;
    const source = event.source || "direct";
    const metadata = (event.metadata || {}) as Record<string, any>;
    const screenWidth = metadata.screen_width as number | undefined;
    const utmSource = metadata.utm_source as string | undefined;
    const utmMedium = metadata.utm_medium as string | undefined;
    const utmCampaign = metadata.utm_campaign as string | undefined;
    
    // Time series
    if (eventsByDate[date]) {
      eventsByDate[date].pageviews++;
      eventsByDate[date].sessions.add(sessionId);
      eventsByDate[date].users.add(userId);
    }
    
    // Sources
    const { category, detail } = categorizeSource(utmSource || source);
    sourceCounts[category] = (sourceCounts[category] || 0) + 1;
    sourceDetailCounts[detail] = (sourceDetailCounts[detail] || 0) + 1;
    
    // Devices
    const device = categorizeDevice(screenWidth);
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    
    // Pages
    if (event.page_path) {
      pageCounts[event.page_path] = (pageCounts[event.page_path] || 0) + 1;
    }
    
    // UTM campaigns
    if (utmCampaign) {
      if (!utmCampaigns[utmCampaign]) {
        utmCampaigns[utmCampaign] = { visits: 0, sources: new Set() };
      }
      utmCampaigns[utmCampaign].visits++;
      if (utmSource) utmCampaigns[utmCampaign].sources.add(utmSource);
    }
    
    // UTM mediums
    if (utmMedium) {
      utmMediums[utmMedium] = (utmMediums[utmMedium] || 0) + 1;
    }
    
    // Hours
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    
    // Sessions
    allSessions.add(sessionId);
    if (event.user_id) allUsers.add(event.user_id);
    
    // Entry pages (first page per session)
    if (!sessionPages.has(sessionId)) {
      sessionPages.set(sessionId, []);
      if (event.page_path) entryPages[event.page_path] = (entryPages[event.page_path] || 0) + 1;
    }
    if (event.page_path) sessionPages.get(sessionId)!.push(event.page_path);
  });
  
  // Calculate new vs returning (sessions seen only once = new)
  // Simple heuristic: if localStorage stores session_id, first event in period = new
  const previousPeriodStart = subDays(now, days * 2).toISOString();
  
  // Bounce rate: sessions with only 1 page view
  let bounceSessions = 0;
  sessionPages.forEach((pages) => {
    if (pages.length <= 1) bounceSessions++;
  });
  const bounceRate = allSessions.size > 0 ? Math.round((bounceSessions / allSessions.size) * 100) : 0;
  
  // Avg pages per session
  const avgPagesPerSession = allSessions.size > 0 
    ? +(events.length / allSessions.size).toFixed(1) 
    : 0;

  // Build time series arrays
  const visitorsTimeSeries = Object.entries(eventsByDate).map(([date, d]) => ({
    date,
    visitors: d.sessions.size,
    pageviews: d.pageviews,
  }));
  
  const totalVisitors = visitorsTimeSeries.reduce((s, d) => s + d.visitors, 0);
  const totalPageviews = visitorsTimeSeries.reduce((s, d) => s + d.pageviews, 0);
  
  // Top sources sorted
  const topSources = Object.entries(sourceCounts)
    .map(([label, value]) => ({ label, value, percent: totalPageviews > 0 ? Math.round((value / totalPageviews) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
    
  const topSourceDetails = Object.entries(sourceDetailCounts)
    .map(([label, value]) => ({ label, value, percent: totalPageviews > 0 ? Math.round((value / totalPageviews) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  
  // Top pages sorted  
  const topPages = Object.entries(pageCounts)
    .map(([path, value]) => ({ path, name: pageDisplayName(path), value, percent: totalPageviews > 0 ? Math.round((value / totalPageviews) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
  
  // Top entry pages
  const topEntryPages = Object.entries(entryPages)
    .map(([path, value]) => ({ path, name: pageDisplayName(path), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  
  // Devices
  const devices = Object.entries(deviceCounts)
    .map(([label, value]) => ({ label, value, percent: totalPageviews > 0 ? Math.round((value / totalPageviews) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
  
  // UTM campaigns
  const campaigns = Object.entries(utmCampaigns)
    .map(([name, data]) => ({ name, visits: data.visits, sources: Array.from(data.sources).join(", ") }))
    .sort((a, b) => b.visits - a.visits);
  
  // UTM mediums  
  const mediums = Object.entries(utmMediums)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  
  // Hourly distribution
  const hourlyData = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: `${hour}h`, count, hourNum: parseInt(hour) }))
    .sort((a, b) => a.hourNum - b.hourNum);
  
  // Peak hour
  const peakHour = hourlyData.reduce((max, h) => h.count > max.count ? h : max, hourlyData[0]);
  
  return {
    totalVisitors,
    totalPageviews,
    totalSessions: allSessions.size,
    totalUsers: allUsers.size,
    bounceRate,
    avgPagesPerSession,
    visitorsTimeSeries,
    topSources,
    topSourceDetails,
    topPages,
    topEntryPages,
    devices,
    campaigns,
    mediums,
    hourlyData,
    peakHour,
  };
};

// Composant KPI Card
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: number;
  color?: string;
}

function KPICard({ title, value, icon: Icon, subtitle, trend, color = "text-primary" }: KPICardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon className={`h-5 w-5 ${color}`} />
            {trend !== undefined && (
              <div className={`flex items-center text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Source icon helper
function SourceIcon({ source }: { source: string }) {
  const s = source.toLowerCase();
  if (s.includes("google")) return <Search className="h-4 w-4 text-blue-500" />;
  if (s.includes("facebook") || s.includes("instagram") || s.includes("twitter") || s.includes("linkedin") || s.includes("social")) return <Share2 className="h-4 w-4 text-purple-500" />;
  if (s.includes("email") || s.includes("newsletter")) return <Mail className="h-4 w-4 text-green-500" />;
  if (s.includes("direct")) return <Globe className="h-4 w-4 text-muted-foreground" />;
  if (s.includes("referral")) return <Link2 className="h-4 w-4 text-amber-500" />;
  if (s.includes("recherche") || s.includes("organique")) return <Search className="h-4 w-4 text-blue-500" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}

// Device icon helper
function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile") return <Smartphone className="h-4 w-4 text-blue-500" />;
  if (device === "Tablette") return <Tablet className="h-4 w-4 text-purple-500" />;
  if (device === "Desktop") return <Monitor className="h-4 w-4 text-green-500" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}

// Composant principal
export function TrafficAnalytics() {
  const [period, setPeriod] = useState("30d");

  const { data: rawEvents, isLoading, refetch } = useQuery({
    queryKey: ["analytics-events-enriched", period],
    queryFn: async () => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString();
      
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const analytics = useMemo(() => {
    return analyzeTrafficData(rawEvents || [], period);
  }, [rawEvents, period]);

  const handleRefresh = () => {
    refetch();
    toast.success("Données actualisées");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[350px]" />
      </div>
    );
  }

  const chartData = analytics.visitorsTimeSeries.map(d => ({
    date: format(new Date(d.date), "d MMM", { locale: fr }),
    Visiteurs: d.visitors,
    "Pages vues": d.pageviews,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analyse du Trafic Web
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Données issues du tracking interne — {analytics.totalPageviews.toLocaleString("fr-FR")} pages vues sur la période
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Visiteurs uniques"
          value={analytics.totalVisitors.toLocaleString("fr-FR")}
          icon={Users}
          subtitle={`${analytics.totalSessions} sessions`}
        />
        <KPICard
          title="Pages vues"
          value={analytics.totalPageviews.toLocaleString("fr-FR")}
          icon={Eye}
          color="text-blue-500"
        />
        <KPICard
          title="Pages / session"
          value={analytics.avgPagesPerSession.toString()}
          icon={MousePointerClick}
          color="text-green-500"
        />
        <KPICard
          title="Taux de rebond"
          value={`${analytics.bounceRate}%`}
          icon={TrendingUp}
          subtitle={analytics.bounceRate > 70 ? "Élevé" : analytics.bounceRate > 40 ? "Moyen" : "Bon"}
          color={analytics.bounceRate > 70 ? "text-red-500" : analytics.bounceRate > 40 ? "text-amber-500" : "text-green-500"}
        />
        <KPICard
          title="Utilisateurs connectés"
          value={analytics.totalUsers.toString()}
          icon={UserCheck}
          color="text-purple-500"
        />
        <KPICard
          title="Heure de pointe"
          value={analytics.peakHour?.hour || "—"}
          icon={Clock}
          subtitle={`${analytics.peakHour?.count || 0} visites`}
          color="text-amber-500"
        />
      </div>

      {/* Graphique principal : Visiteurs + Pages vues */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Évolution du trafic
          </CardTitle>
          <CardDescription>
            Visiteurs uniques et pages vues —{" "}
            {period === "7d" ? "7 derniers jours" : period === "30d" ? "30 derniers jours" : "90 derniers jours"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="Visiteurs" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradVisitors)" />
                <Area type="monotone" dataKey="Pages vues" stroke="hsl(200, 70%, 50%)" strokeWidth={1.5} fill="url(#gradPageviews)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              Aucune donnée pour cette période
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sources de trafic + Appareils */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sources par catégorie */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Sources de trafic
            </CardTitle>
            <CardDescription>D'où viennent vos visiteurs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="categories">
              <TabsList className="mb-4">
                <TabsTrigger value="categories">Par catégorie</TabsTrigger>
                <TabsTrigger value="details">Détails</TabsTrigger>
              </TabsList>
              <TabsContent value="categories">
                {analytics.topSources.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topSources.map((source, idx) => (
                      <div key={source.label} className="flex items-center gap-3">
                        <SourceIcon source={source.label} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{source.label}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{source.percent}%</Badge>
                              <span className="text-muted-foreground text-xs">{source.value} visites</span>
                            </div>
                          </div>
                          <Progress value={source.percent} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée de source</p>
                )}
              </TabsContent>
              <TabsContent value="details">
                {analytics.topSourceDetails.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.topSourceDetails.map((source, idx) => (
                      <div key={source.label} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                          <SourceIcon source={source.label} />
                          <span className="text-sm font-medium truncate max-w-[200px]">{source.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{source.percent}%</Badge>
                          <span className="text-sm font-semibold">{source.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée détaillée</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Répartition par appareil */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-primary" />
              Appareils
            </CardTitle>
            <CardDescription>Répartition mobile / desktop</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.devices.length > 0 && analytics.devices.some(d => d.label !== "Inconnu") ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={analytics.devices.filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {analytics.devices.filter(d => d.value > 0).map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {analytics.devices.map((device, idx) => (
                    <div key={device.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DeviceIcon device={device.label} />
                        <span className="text-sm">{device.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{device.percent}%</span>
                        <span className="text-xs text-muted-foreground">({device.value})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">Données insuffisantes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heures de pointe + Campagnes UTM */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Distribution horaire */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Distribution horaire
            </CardTitle>
            <CardDescription>Quand vos visiteurs sont-ils actifs ?</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} visites`, "Trafic"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campagnes UTM */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              Campagnes Marketing (UTM)
            </CardTitle>
            <CardDescription>Performances des campagnes trackées</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.campaigns.length > 0 ? (
              <div className="space-y-3">
                {analytics.campaigns.map((campaign, idx) => (
                  <div key={campaign.name} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{campaign.name}</span>
                      <Badge variant="secondary">{campaign.visits} visites</Badge>
                    </div>
                    {campaign.sources && (
                      <p className="text-xs text-muted-foreground">
                        Sources : {campaign.sources}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Aucune campagne UTM détectée</p>
                <p className="text-xs text-muted-foreground">
                  Ajoutez <code className="bg-muted px-1 rounded font-mono">?utm_source=...&utm_campaign=...</code> à vos liens marketing
                </p>
              </div>
            )}
            
            {analytics.mediums.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Par medium</p>
                <div className="flex flex-wrap gap-2">
                  {analytics.mediums.map(m => (
                    <Badge key={m.label} variant="outline">
                      {m.label}: {m.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pages populaires + Pages d'entrée */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Pages les plus visitées
            </CardTitle>
            <CardDescription>Top 15 des pages par nombre de vues</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topPages.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {analytics.topPages.map((page, idx) => {
                  const maxValue = analytics.topPages[0].value;
                  return (
                    <div key={page.path} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="truncate" title={page.path}>
                            {page.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{page.percent}%</span>
                            <span className="font-medium">{page.value}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${(page.value / maxValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Pages d'entrée */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Pages d'entrée
            </CardTitle>
            <CardDescription>Première page vue par session (landing pages)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topEntryPages.length > 0 ? (
              <div className="space-y-2">
                {analytics.topEntryPages.map((page, idx) => (
                  <div key={page.path} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-sm truncate max-w-[200px]" title={page.path}>
                        {page.name}
                      </span>
                    </div>
                    <Badge variant="outline">{page.value} entrées</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Résumé actionnable */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">💡 Insights marketing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium mb-1">Source principale</p>
              <p className="text-muted-foreground">
                {analytics.topSources[0]?.label || "—"} représente {analytics.topSources[0]?.percent || 0}% du trafic
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Appareil dominant</p>
              <p className="text-muted-foreground">
                {analytics.devices[0]?.label || "—"} ({analytics.devices[0]?.percent || 0}%)
                {analytics.devices[0]?.label === "Mobile" && " — Priorité mobile-first ✅"}
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Engagement</p>
              <p className="text-muted-foreground">
                {analytics.avgPagesPerSession} pages/session • Rebond {analytics.bounceRate}%
                {analytics.bounceRate > 60 && " — À améliorer ⚠️"}
                {analytics.bounceRate <= 40 && " — Excellent 🎉"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
