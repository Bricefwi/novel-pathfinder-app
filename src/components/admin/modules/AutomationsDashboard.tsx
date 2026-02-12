import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Mail, CheckCircle2, XCircle, Clock, RefreshCw, BarChart3,
  PartyPopper, FileText, CalendarCheck, Star, UserPlus, Send, AlertTriangle
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailLog {
  id: string;
  type: string;
  recipient: string;
  subject: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
  error_message: string | null;
}

const AUTOMATION_TYPES = [
  { type: "bienvenue", label: "Bienvenue nouveau client", icon: UserPlus, color: "text-green-600", cron: "Trigger: inscription" },
  { type: "relance_devis", label: "Relance devis expiré", icon: FileText, color: "text-orange-600", cron: "Cron quotidien 9h" },
  { type: "rappel_sejour", label: "Rappel J-7 séjour", icon: CalendarCheck, color: "text-blue-600", cron: "Cron quotidien 8h" },
  { type: "suivi_post_sejour", label: "Suivi post-séjour", icon: Star, color: "text-purple-600", cron: "Cron quotidien 10h" },
  { type: "anniversaire", label: "Anniversaire client", icon: PartyPopper, color: "text-pink-600", cron: "Cron quotidien 7h" },
  { type: "notification_avis", label: "Notification nouvel avis", icon: Send, color: "text-indigo-600", cron: "Cron toutes les 30 min" },
  { type: "newsletter", label: "Newsletter / Campagne", icon: Mail, color: "text-teal-600", cron: "Manuel" },
  { type: "quote_notification", label: "Notification devis", icon: FileText, color: "text-amber-600", cron: "Cron toutes les 20 min" },
  { type: "profile_reminder", label: "Relance profil incomplet", icon: AlertTriangle, color: "text-yellow-600", cron: "Cron quotidien" },
];

export function AutomationsDashboard() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, today: 0 });

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("email_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const allLogs = (data || []) as EmailLog[];
    setLogs(allLogs);

    const todayStart = startOfDay(new Date()).toISOString();
    setStats({
      total: allLogs.length,
      sent: allLogs.filter(l => l.status === "sent").length,
      failed: allLogs.filter(l => l.status === "error" || l.status === "failed").length,
      today: allLogs.filter(l => l.created_at && l.created_at >= todayStart).length,
    });
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const getTypeInfo = (type: string) =>
    AUTOMATION_TYPES.find(a => type?.includes(a.type)) || { label: type, icon: Mail, color: "text-muted-foreground", cron: "—" };

  const getStatusBadge = (status: string | null) => {
    if (status === "sent") return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Envoyé</Badge>;
    if (status === "error" || status === "failed") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status || "En attente"}</Badge>;
  };

  // Stats by type
  const statsByType = AUTOMATION_TYPES.map(auto => {
    const matching = logs.filter(l => l.type?.includes(auto.type));
    const last = matching[0];
    return {
      ...auto,
      count: matching.length,
      successCount: matching.filter(l => l.status === "sent").length,
      failCount: matching.filter(l => l.status === "error" || l.status === "failed").length,
      lastRun: last?.created_at,
      lastStatus: last?.status,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Centre d'Automatisations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi en temps réel de tous les emails automatiques
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Emails totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Envoyés avec succès</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Échecs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="history">Historique complet</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsByType.map(auto => {
              const Icon = auto.icon;
              const successRate = auto.count > 0 ? Math.round((auto.successCount / auto.count) * 100) : 0;
              return (
                <Card key={auto.type}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${auto.color}`} />
                        <CardTitle className="text-sm font-medium">{auto.label}</CardTitle>
                      </div>
                      {auto.count > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">{auto.count} envois</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Aucun</Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">{auto.cron}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {auto.count > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Taux de succès</span>
                          <span className="font-medium">{successRate}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>✅ {auto.successCount} · ❌ {auto.failCount}</span>
                          <span>
                            {auto.lastRun
                              ? format(new Date(auto.lastRun), "dd MMM HH:mm", { locale: fr })
                              : "—"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucun envoi enregistré</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun email envoyé pour le moment
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map(log => {
                        const info = getTypeInfo(log.type);
                        const Icon = info.icon;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {log.created_at
                                ? format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: fr })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${info.color}`} />
                                <span className="text-xs">{info.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate">{log.recipient}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{log.subject || "—"}</TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
