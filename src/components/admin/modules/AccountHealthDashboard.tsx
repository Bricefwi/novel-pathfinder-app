import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  Send,
  Search,
  ShieldAlert,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
} from "lucide-react";

interface BlockedUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmation_sent_at: string | null;
  statut_compte: string;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean;
}

interface DiagnosticResult {
  total_users: number;
  blocked_count: number;
  active_count: number;
  blocked_users: BlockedUser[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "JAMAIS_CONNECTÉ_NON_CONFIRMÉ": { label: "Jamais connecté", color: "bg-destructive/20 text-destructive border-destructive/30", icon: XCircle },
  "CONNECTÉ_MAIS_NON_CONFIRMÉ": { label: "Non confirmé", color: "bg-primary/20 text-primary border-primary/30", icon: AlertTriangle },
  "SANS_MOT_DE_PASSE": { label: "Sans mot de passe", color: "bg-destructive/20 text-destructive border-destructive/30", icon: ShieldAlert },
  "INVITÉ_JAMAIS_CONNECTÉ": { label: "Invitation expirée", color: "bg-primary/20 text-primary border-primary/30", icon: Clock },
};

export function AccountHealthDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingFor, setSendingFor] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch diagnostic data
  const { data: diagnostic, isLoading, refetch, isRefetching } = useQuery<DiagnosticResult>({
    queryKey: ["account-health"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-identify-blocked-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Resend invitation for a single user
  const resendSingleMutation = useMutation({
    mutationFn: async (email: string) => {
      setSendingFor(email);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-resend-invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emails: [email] }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");
      return result;
    },
    onSuccess: (data) => {
      if (data.success?.length > 0) {
        toast.success(`Réinvitation envoyée à ${data.success[0]}`);
      } else if (data.failed?.length > 0) {
        toast.error(`Échec : ${data.failed[0].error}`);
      }
      setSendingFor(null);
      queryClient.invalidateQueries({ queryKey: ["account-health"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
      setSendingFor(null);
    },
  });

  // Resend all blocked
  const resendAllMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-resend-invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resend_all: true }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");
      return result;
    },
    onSuccess: (data) => {
      toast.success(`${data.success?.length || 0} réinvitation(s) envoyée(s), ${data.failed?.length || 0} échec(s)`);
      queryClient.invalidateQueries({ queryKey: ["account-health"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const filteredUsers = (diagnostic?.blocked_users || []).filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q)
    );
  });

  // Group by status
  const statusCounts = (diagnostic?.blocked_users || []).reduce((acc: Record<string, number>, u) => {
    acc[u.statut_compte] = (acc[u.statut_compte] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Santé des Comptes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Diagnostic et gestion des comptes utilisateurs bloqués
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{diagnostic?.total_users || 0}</p>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{diagnostic?.active_count || 0}</p>
                <p className="text-sm text-muted-foreground">Comptes actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{diagnostic?.blocked_count || 0}</p>
                <p className="text-sm text-muted-foreground">Comptes bloqués</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statusCounts["INVITÉ_JAMAIS_CONNECTÉ"] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Invitations expirées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => {
            const config = STATUS_CONFIG[status];
            return (
              <Badge key={status} variant="outline" className={config?.color || ""}>
                {config?.label || status}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {(diagnostic?.blocked_count || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Actions de réinvitation
            </CardTitle>
            <CardDescription>
              Envoyez un email de réinitialisation de mot de passe aux comptes bloqués (max 10 par lot)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={resendAllMutation.isPending}
                >
                  {resendAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Réinviter tous les bloqués ({Math.min(diagnostic?.blocked_count || 0, 10)} max)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la réinvitation en masse</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous allez envoyer un email de réinitialisation de mot de passe à {Math.min(diagnostic?.blocked_count || 0, 10)} utilisateur(s) bloqué(s).
                    Cette action ne peut pas être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resendAllMutation.mutate()}>
                    Confirmer l'envoi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Détail des comptes ({filteredUsers.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Tous les comptes sont en bonne santé !</p>
              <p className="text-sm">Aucun utilisateur bloqué détecté.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const config = STATUS_CONFIG[user.statut_compte];
                  const StatusIcon = config?.icon || AlertTriangle;
                  const isPlaceholder = user.email?.includes("@placeholder.local");
                  
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <StatusIcon className="h-5 w-5 flex-shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                              : "Sans nom"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Créé le {format(new Date(user.created_at), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="outline" className={config?.color || ""}>
                          {config?.label || user.statut_compte}
                        </Badge>

                        {!isPlaceholder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendSingleMutation.mutate(user.email)}
                            disabled={sendingFor === user.email || resendSingleMutation.isPending}
                          >
                            {sendingFor === user.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Réinviter
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
