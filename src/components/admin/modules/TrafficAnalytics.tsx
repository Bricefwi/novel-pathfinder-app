import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

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

// Données de démonstration réalistes
const generateMockData = (period: string): TrafficData => {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const baseVisitors = period === "7d" ? 32 : period === "30d" ? 145 : 420;
  const basePageviews = period === "7d" ? 204 : period === "30d" ? 890 : 2650;

  const timeSeriesData: TrafficDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    const variation = Math.random() * 0.6 + 0.7;
    timeSeriesData.push({
      date,
      value: Math.round((baseVisitors / days) * variation * (Math.random() > 0.15 ? 1 : 0.2)),
    });
  }

  const pageviewsData = timeSeriesData.map(d => ({
    ...d,
    value: Math.round(d.value * (Math.random() * 4 + 3)),
  }));

  const totalVisitors = timeSeriesData.reduce((sum, d) => sum + d.value, 0);
  const totalPageviews = pageviewsData.reduce((sum, d) => sum + d.value, 0);
  const avgPageviewsPerVisit = totalVisitors > 0 ? +(totalPageviews / totalVisitors).toFixed(2) : 0;
  const avgSessionDuration = Math.round(493 + Math.random() * 200);
  const avgBounceRate = Math.round(48 + Math.random() * 15);

  return {
    timeSeries: {
      visitors: {
        total: totalVisitors,
        label: "visitors",
        data: timeSeriesData,
      },
      pageviews: {
        total: totalPageviews,
        label: "pageviews",
        data: pageviewsData,
      },
      pageviewsPerVisit: {
        total: avgPageviewsPerVisit,
        label: "pageviewsPerVisit",
        data: timeSeriesData.map((d, i) => ({
          date: d.date,
          value: d.value > 0 ? +(pageviewsData[i].value / d.value).toFixed(2) : 0,
        })),
      },
      sessionDuration: {
        total: avgSessionDuration,
        label: "sessionDuration",
        data: timeSeriesData.map(d => ({
          date: d.date,
          value: Math.round(d.value > 0 ? Math.random() * 1200 + 100 : 0),
        })),
      },
      bounceRate: {
        total: avgBounceRate,
        label: "bounceRate",
        data: timeSeriesData.map(d => ({
          date: d.date,
          value: d.value > 0 ? Math.round(Math.random() * 60 + 20) : 0,
        })),
      },
    },
    lists: {
      page: {
        label: "page",
        data: [
          { label: "/", value: Math.round(totalPageviews * 0.13) },
          { label: "/destinations", value: Math.round(totalPageviews * 0.08) },
          { label: "/contact", value: Math.round(totalPageviews * 0.05) },
          { label: "/preparer-voyage", value: Math.round(totalPageviews * 0.05) },
          { label: "/auth", value: Math.round(totalPageviews * 0.04) },
          { label: "/sejours", value: Math.round(totalPageviews * 0.04) },
          { label: "/carnet-de-voyage", value: Math.round(totalPageviews * 0.025) },
          { label: "/planning", value: Math.round(totalPageviews * 0.025) },
          { label: "/hebergement", value: Math.round(totalPageviews * 0.02) },
          { label: "/eco-systeme", value: Math.round(totalPageviews * 0.02) },
        ],
      },
      source: {
        label: "source",
        data: [
          { label: "Direct", value: Math.round(totalVisitors * 0.72) },
          { label: "Google", value: Math.round(totalVisitors * 0.15) },
          { label: "Facebook", value: Math.round(totalVisitors * 0.08) },
          { label: "Instagram", value: Math.round(totalVisitors * 0.03) },
          { label: "Autres", value: Math.round(totalVisitors * 0.02) },
        ],
      },
      device: {
        label: "device",
        data: [
          { label: "mobile", value: Math.round(totalVisitors * 0.56) },
          { label: "desktop", value: Math.round(totalVisitors * 0.44) },
        ],
      },
      country: {
        label: "country",
        data: [
          { label: "FR", value: Math.round(totalVisitors * 0.81) },
          { label: "BE", value: Math.round(totalVisitors * 0.08) },
          { label: "CH", value: Math.round(totalVisitors * 0.05) },
          { label: "CA", value: Math.round(totalVisitors * 0.03) },
          { label: "Autres", value: Math.round(totalVisitors * 0.03) },
        ],
      },
    },
  };
};

// Mapping des noms de pays
const countryNames: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  US: "États-Unis",
  DE: "Allemagne",
  GB: "Royaume-Uni",
  ES: "Espagne",
  IT: "Italie",
  Unknown: "Inconnu",
};

// Mapping des drapeaux
const countryFlags: Record<string, string> = {
  FR: "🇫🇷",
  BE: "🇧🇪",
  CH: "🇨🇭",
  CA: "🇨🇦",
  US: "🇺🇸",
  DE: "🇩🇪",
  GB: "🇬🇧",
  ES: "🇪🇸",
  IT: "🇮🇹",
  Unknown: "🌍",
};

// Formatage de la durée
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins} min ${secs} s`;
};

// Composant KPI Card
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  isActive?: boolean;
  onClick?: () => void;
  description?: string;
}

function KPICard({ title, value, icon: Icon, trend, isActive, onClick, description }: KPICardProps) {
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
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

// Composant principal
export function TrafficAnalytics() {
  const [period, setPeriod] = useState("7d");
  const [activeMetric, setActiveMetric] = useState<keyof TrafficData["timeSeries"]>("visitors");
  const [isLoading, setIsLoading] = useState(false);

  // Générer les données mockées
  const data = useMemo(() => generateMockData(period), [period]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[350px]" />
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      </div>
    );
  }

  const metricConfig = {
    visitors: {
      title: "Visiteurs",
      icon: Users,
      format: (v: number) => v.toString(),
      trend: 12,
    },
    pageviews: {
      title: "Pages vues",
      icon: Eye,
      format: (v: number) => v.toString(),
      trend: 8,
    },
    pageviewsPerVisit: {
      title: "Vues / visite",
      icon: MousePointerClick,
      format: (v: number) => v.toFixed(2),
      trend: 5,
    },
    sessionDuration: {
      title: "Durée moyenne",
      icon: Clock,
      format: (v: number) => formatDuration(v),
      trend: 15,
    },
    bounceRate: {
      title: "Taux de rebond",
      icon: TrendingDown,
      format: (v: number) => `${v}%`,
      trend: -3,
    },
  };

  const chartData = data.timeSeries[activeMetric].data.map(d => ({
    date: format(new Date(d.date), "d MMM", { locale: fr }),
    value: d.value,
  }));

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
            Visualisez les performances et le comportement des visiteurs sur votre site
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

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3 flex items-center gap-3">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Les données affichées sont basées sur les visites du site publié. Les données internes de Lovable Analytics 
            ne sont pas accessibles via API, ce dashboard utilise des données simulées réalistes pour la démonstration.
          </p>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((key) => {
          const config = metricConfig[key];
          const metricData = data.timeSeries[key];
          return (
            <KPICard
              key={key}
              title={config.title}
              value={config.format(metricData.total)}
              icon={config.icon}
              trend={config.trend}
              isActive={activeMetric === key}
              onClick={() => setActiveMetric(key)}
            />
          );
        })}
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
        </CardContent>
      </Card>

      {/* Detail Sections */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sources de trafic */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4 text-primary" />
              Sources de trafic
            </CardTitle>
            <CardDescription>D'où viennent vos visiteurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.lists.source.data.map((item, index) => {
                const maxValue = data.lists.source.data[0].value;
                const percentage = maxValue > 0 ? (item.value / data.timeSeries.visitors.total) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.value} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${(item.value / maxValue) * 100}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pages populaires */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Pages populaires
            </CardTitle>
            <CardDescription>Les pages les plus visitées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.lists.page.data.slice(0, 8).map((item, index) => {
                const maxValue = data.lists.page.data[0].value;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-full">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-mono text-xs truncate max-w-[150px]">{item.label}</span>
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
          </CardContent>
        </Card>

        {/* Pays */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Pays
            </CardTitle>
            <CardDescription>Localisation géographique des visiteurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.lists.country.data.map((item, index) => {
                const maxValue = data.lists.country.data[0].value;
                const percentage = data.timeSeries.visitors.total > 0 
                  ? (item.value / data.timeSeries.visitors.total) * 100 
                  : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{countryFlags[item.label] || "🌍"}</span>
                        <span className="font-medium">{countryNames[item.label] || item.label}</span>
                      </span>
                      <span className="text-muted-foreground">{item.value} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${(item.value / maxValue) * 100}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Appareils */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-primary" />
              Appareils
            </CardTitle>
            <CardDescription>Répartition mobile vs desktop</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie
                    data={data.lists.device.data.map((d, i) => ({
                      name: d.label === "mobile" ? "Mobile" : "Desktop",
                      value: d.value,
                      fill: CHART_COLORS[i],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="value"
                  >
                    {data.lists.device.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.lists.device.data.map((item, index) => {
                  const percentage = data.timeSeries.visitors.total > 0 
                    ? (item.value / data.timeSeries.visitors.total) * 100 
                    : 0;
                  const Icon = item.label === "mobile" ? Smartphone : Monitor;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index] }}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {item.label === "mobile" ? "Mobile" : "Desktop"}
                      </span>
                      <span className="ml-auto text-sm font-bold">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résumé des performances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{data.timeSeries.visitors.total}</p>
              <p className="text-sm text-muted-foreground">Visiteurs uniques</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{data.timeSeries.pageviews.total}</p>
              <p className="text-sm text-muted-foreground">Pages consultées</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{formatDuration(data.timeSeries.sessionDuration.total)}</p>
              <p className="text-sm text-muted-foreground">Durée moyenne</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{data.timeSeries.bounceRate.total}%</p>
              <p className="text-sm text-muted-foreground">Taux de rebond</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
