import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Database, 
  HardDrive, 
  Bot, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  RefreshCw,
  Shield,
  Clock,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  data?: any;
  timestamp?: Date;
  duration?: number;
}

interface LogEntry {
  timestamp: Date;
  type: "info" | "success" | "error" | "warning";
  test: string;
  message: string;
}

const SystemDiagnostics = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [tests, setTests] = useState<Record<string, TestResult>>({
    email: { status: "idle" },
    database: { status: "idle" },
    storage: { status: "idle" },
    ai: { status: "idle" },
    integrity: { status: "idle" },
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setAdminEmail(session.user.email || "");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Accès refusé",
        description: "Cette page est réservée aux administrateurs.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    addLog("info", "system", "Session admin vérifiée avec succès");
  };

  const addLog = (type: LogEntry["type"], test: string, message: string) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      test,
      message
    }, ...prev].slice(0, 50));
  };

  const runTest = async (testType: string) => {
    const startTime = performance.now();
    
    setTests(prev => ({
      ...prev,
      [testType]: { status: "loading" }
    }));

    addLog("info", testType, `Démarrage du test...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session expirée");
      }

      const response = await supabase.functions.invoke("test-system", {
        body: { 
          test: testType,
          adminEmail: adminEmail
        },
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.success) {
        setTests(prev => ({
          ...prev,
          [testType]: { 
            status: "success", 
            message: result.message,
            data: result.data,
            timestamp: new Date(),
            duration
          }
        }));
        addLog("success", testType, `✅ ${result.message} (${duration}ms)`);
      } else {
        throw new Error(result.error || "Test échoué");
      }
    } catch (error: any) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      setTests(prev => ({
        ...prev,
        [testType]: { 
          status: "error", 
          message: error.message,
          timestamp: new Date(),
          duration
        }
      }));
      addLog("error", testType, `❌ ${error.message}`);
    }
  };

  const runAllTests = async () => {
    addLog("info", "all", "Lancement de tous les tests...");
    
    for (const testType of ["database", "storage", "email", "ai", "integrity"]) {
      await runTest(testType);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    addLog("info", "all", "Tous les tests terminés");
    toast({
      title: "Tests terminés",
      description: "Tous les diagnostics système ont été exécutés.",
    });
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "loading":
        return <Badge variant="secondary">En cours...</Badge>;
      case "success":
        return <Badge className="bg-green-500 hover:bg-green-600">Succès</Badge>;
      case "error":
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">Non testé</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const testConfigs = [
    {
      id: "email",
      title: "Test Emails (Resend)",
      description: "Envoie un email de test à l'administrateur connecté",
      icon: Mail,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "database",
      title: "Test Base de Données",
      description: "Vérifie la connectivité et le temps de réponse",
      icon: Database,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      id: "storage",
      title: "Test Storage (Buckets)",
      description: "Teste l'upload, lecture et suppression de fichiers",
      icon: HardDrive,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      id: "ai",
      title: "Test Edge Function (Loïc IA)",
      description: "Vérifie que l'assistant IA répond correctement",
      icon: Bot,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      id: "integrity",
      title: "Test Intégrité des Données",
      description: "Scanne les anomalies dans la base de données",
      icon: AlertTriangle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ];

  return (
    <>
      <SEOHead
        title="Diagnostics Système - Admin"
        description="Tableau de bord de tests système"
      />
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  System Health Check
                </h1>
                <p className="text-muted-foreground mt-1">
                  Diagnostics et vérifications de l'infrastructure
                </p>
              </div>
            </div>
            <Button onClick={runAllTests} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Lancer Tous les Tests
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tests Panel */}
            <div className="lg:col-span-2 space-y-4">
              {testConfigs.map((config) => {
                const test = tests[config.id];
                const IconComponent = config.icon;

                return (
                  <Card key={config.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-xl ${config.bgColor}`}>
                            <IconComponent className={`h-6 w-6 ${config.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {config.title}
                              </h3>
                              {getStatusBadge(test.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {config.description}
                            </p>
                            
                            {/* Result Display */}
                            {test.status === "success" && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                  {test.message}
                                </p>
                                {test.data?.anomalies && test.data.anomalies.length > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {test.data.anomalies.map((anomaly: string, idx: number) => (
                                      <li key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                                        ⚠️ {anomaly}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {test.data?.response && (
                                  <p className="mt-2 text-xs text-muted-foreground italic">
                                    "{test.data.response.substring(0, 100)}..."
                                  </p>
                                )}
                                {test.duration && (
                                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Exécuté en {test.duration}ms
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {test.status === "error" && (
                              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <p className="text-sm text-destructive font-medium">
                                  {test.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => runTest(config.id)}
                            disabled={test.status === "loading"}
                          >
                            {test.status === "loading" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Tester"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Logs Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Terminal className="h-5 w-5" />
                    Logs de Débogage
                  </CardTitle>
                  <CardDescription>
                    Historique des dernières opérations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px] px-4">
                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Aucun log pour le moment
                      </p>
                    ) : (
                      <div className="space-y-2 pb-4">
                        {logs.map((log, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2 rounded text-xs font-mono ${
                              log.type === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                              log.type === "error" ? "bg-destructive/10 text-destructive" :
                              log.type === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span className="opacity-60">
                              [{log.timestamp.toLocaleTimeString('fr-FR')}]
                            </span>
                            {" "}
                            <span className="font-semibold">[{log.test}]</span>
                            {" "}
                            {log.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Summary Footer */}
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">
                      {Object.values(tests).filter(t => t.status === "success").length} réussis
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">
                      {Object.values(tests).filter(t => t.status === "error").length} échoués
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border-2 border-muted" />
                    <span className="text-sm font-medium">
                      {Object.values(tests).filter(t => t.status === "idle").length} en attente
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin: {adminEmail}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
};

export default SystemDiagnostics;
