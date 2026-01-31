import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Eye,
  Clock,
  MousePointerClick,
  TrendingDown,
  Globe,
  Smartphone,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Calendar,
  RefreshCw,
  Info,
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
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
} from "recharts";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Types pour les données de trafic
interface TrafficDataPoint {
  date: string;
  value: number;
}

interface TrafficMetric {
  total: number;
  label: string;
  data: TrafficDataPoint[];
}

interface TrafficListItem {
  label: string;
  value: number;
}

interface TrafficData {
  timeSeries: {
    visitors: TrafficMetric;
    pageviews: TrafficMetric;
    pageviewsPerVisit: TrafficMetric;
    sessionDuration: TrafficMetric;
    bounceRate: TrafficMetric;
  };
  lists: {
    page: { label: string; data: TrafficListItem[] };
    source: { label: string; data: TrafficListItem[] };
    device: { label: string; data: TrafficListItem[] };
    country: { label: string; data: TrafficListItem[] };
  };
}

// Couleurs pour les graphiques
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Mapping des noms de pays et drapeaux
const countryNames: Record<string, string> = {
  FR: "France", BE: "Belgique", CH: "Suisse", CA: "Canada", US: "États-Unis",
  DE: "Allemagne", GB: "Royaume-Uni", ES: "Espagne", IT: "Italie", Unknown: "Inconnu",
};

const countryFlags: Record<string, string> = {
  FR: "🇫🇷", BE: "🇧🇪", CH: "🇨🇭", CA: "🇨🇦", US: "🇺🇸",
  DE: "🇩🇪", GB: "🇬🇧", ES: "🇪🇸", IT: "🇮🇹", Unknown: "🌍",
};

// Formatage de la durée
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins} min ${secs} s`;
};

// Générer données internes depuis analytics_events
const generateInternalData = (events: any[], period: string): TrafficData => {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  
  // Compter les événements par jour
  const eventsByDate: Record<string, { pageviews: number; visitors: Set<string> }> = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    eventsByDate[date] = { pageviews: 0, visitors: new Set() };
  }
  
  events.forEach(event => {
    const date = format(new Date(event.created_at), "yyyy-MM-dd");
    if (eventsByDate[date]) {
      eventsByDate[date].pageviews++;
      if (event.session_id) {
        eventsByDate[date].visitors.add(event.session_id);
      }
    }
  });
  
  const timeSeriesData: TrafficDataPoint[] = Object.entries(eventsByDate).map(([date, data]) => ({
    date,
    value: data.visitors.size,
  }));
  
  const pageviewsData: TrafficDataPoint[] = Object.entries(eventsByDate).map(([date, data]) => ({
    date,
    value: data.pageviews,
  }));
  
  const totalVisitors = timeSeriesData.reduce((sum, d) => sum + d.value, 0);
  const totalPageviews = pageviewsData.reduce((sum, d) => sum + d.value, 0);
  const avgPageviewsPerVisit = totalVisitors > 0 ? +(totalPageviews / totalVisitors).toFixed(2) : 0;
  
  // Compter les pages visitées
  const pageCounts: Record<string, number> = {};
  events.forEach(event => {
    if (event.page_path) {
      pageCounts[event.page_path] = (pageCounts[event.page_path] || 0) + 1;
    }
  });
  
  const pageData = Object.entries(pageCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  
  return {
    timeSeries: {
      visitors: { total: totalVisitors, label: "visitors", data: timeSeriesData },
      pageviews: { total: totalPageviews, label: "pageviews", data: pageviewsData },
      pageviewsPerVisit: { total: avgPageviewsPerVisit, label: "pageviewsPerVisit", data: [] },
      sessionDuration: { total: 0, label: "sessionDuration", data: [] },
      bounceRate: { total: 0, label: "bounceRate", data: [] },
    },
    lists: {
      page: { label: "page", data: pageData },
      source: { label: "source", data: [{ label: "Direct", value: totalVisitors }] },
      device: { label: "device", data: [] },
      country: { label: "country", data: [] },
    },
  };
};

// Composant KPI Card
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  isActive?: boolean;
  onClick?: () => void;
}

function KPICard({ title, value, icon: Icon, trend, isActive, onClick }: KPICardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
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

// Composant Configuration GA4
function GAConfigSection() {
  const [gaId, setGaId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  // Charger la config existante
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'google_analytics')
        .maybeSingle();
      
      if (data?.value && typeof data.value === 'object') {
        const config = data.value as { ga_measurement_id?: string };
        if (config.ga_measurement_id) {
          setGaId(config.ga_measurement_id);
          setIsConfigured(true);
        }
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!gaId.startsWith('G-')) {
      toast({
        title: "ID invalide",
        description: "L'ID de mesure Google Analytics doit commencer par 'G-'",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          key: 'google_analytics',
          value: { ga_measurement_id: gaId },
          description: 'Configuration Google Analytics 4',
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setIsConfigured(true);
      toast({
        title: "Configuration sauvegardée",
        description: "Rechargez la page pour activer Google Analytics",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Configuration Google Analytics 4
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="ga-id">ID de mesure (G-XXXXXXX)</Label>
            <Input
              id="ga-id"
              placeholder="G-XXXXXXXXXX"
              value={gaId}
              onChange={(e) => setGaId(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSave} disabled={isSaving || !gaId}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
        
        {isConfigured ? (
          <Alert className="bg-accent/10 border-accent/30">
            <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
            <AlertDescription>
              Google Analytics est configuré. Les données réelles sont collectées.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Pour voir le trafic réel, veuillez entrer votre ID Google Analytics.
              <a 
                href="https://analytics.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline font-medium"
              >
                Créer un compte GA4
              </a>
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.open('https://analytics.google.com', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ouvrir Google Analytics Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

// Composant principal
export function TrafficAnalytics() {
  const [period, setPeriod] = useState("7d");
  const [activeMetric, setActiveMetric] = useState<keyof TrafficData["timeSeries"]>("visitors");
  const { toast } = useToast();

  // Charger les données internes depuis analytics_events
  const { data: internalEvents, isLoading, refetch } = useQuery({
    queryKey: ['analytics-events', period],
    queryFn: async () => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString();
      
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const data = useMemo(() => {
    return generateInternalData(internalEvents || [], period);
  }, [internalEvents, period]);

  const handleRefresh = () => {
    refetch();
    toast({ title: "Données actualisées" });
  };

  const metricConfig = {
    visitors: { title: "Visiteurs", icon: Users, format: (v: number) => v.toString() },
    pageviews: { title: "Pages vues", icon: Eye, format: (v: number) => v.toString() },
    pageviewsPerVisit: { title: "Vues / visite", icon: MousePointerClick, format: (v: number) => v.toFixed(2) },
    sessionDuration: { title: "Durée moyenne", icon: Clock, format: (v: number) => formatDuration(v) },
    bounceRate: { title: "Taux de rebond", icon: TrendingDown, format: (v: number) => `${v}%` },
  };

  const chartData = data.timeSeries[activeMetric].data.map(d => ({
    date: format(new Date(d.date), "d MMM", { locale: fr }),
    value: d.value,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[350px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Analyse du Trafic
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Données internes + Google Analytics (si configuré)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
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

      {/* Configuration GA4 */}
      <GAConfigSection />

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3 flex items-center gap-3">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Les compteurs ci-dessous sont basés sur notre tracking interne (table analytics_events). 
            Pour des données complètes, configurez Google Analytics et accédez au dashboard officiel.
          </p>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["visitors", "pageviews", "pageviewsPerVisit"] as const).map((key) => {
          const config = metricConfig[key];
          const metricData = data.timeSeries[key];
          return (
            <KPICard
              key={key}
              title={config.title}
              value={config.format(metricData.total)}
              icon={config.icon}
              isActive={activeMetric === key}
              onClick={() => setActiveMetric(key)}
            />
          );
        })}
        {/* Placeholders pour durée et bounce rate (requiert GA4) */}
        <Card className="opacity-60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">Durée moyenne</p>
            <p className="text-lg text-muted-foreground">Requiert GA4</p>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">Taux de rebond</p>
            <p className="text-lg text-muted-foreground">Requiert GA4</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            {(() => {
              const Icon = metricConfig[activeMetric].icon;
              return <Icon className="h-5 w-5 text-primary" />;
            })()}
            Évolution - {metricConfig[activeMetric].title}
          </CardTitle>
          <CardDescription>
            {period === "7d" ? "7 derniers jours" : period === "30d" ? "30 derniers jours" : "90 derniers jours"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [metricConfig[activeMetric].format(value), metricConfig[activeMetric].title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              Aucune donnée pour cette période
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages populaires */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Pages populaires (Interne)
            </CardTitle>
            <CardDescription>Les pages les plus visitées selon notre tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {data.lists.page.data.length > 0 ? (
              <div className="space-y-2">
                {data.lists.page.data.map((item, index) => {
                  const maxValue = data.lists.page.data[0].value;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-full">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-mono text-xs truncate max-w-[200px]">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full bg-primary"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Résumé */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Résumé des performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{data.timeSeries.visitors.total}</p>
                <p className="text-sm text-muted-foreground">Visiteurs uniques</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{data.timeSeries.pageviews.total}</p>
                <p className="text-sm text-muted-foreground">Pages consultées</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Pour durée moyenne, taux de rebond, sources de trafic et appareils,
                <br />consultez votre dashboard Google Analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
