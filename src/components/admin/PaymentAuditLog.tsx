import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Shield, AlertTriangle, CheckCircle2, Ban, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AuditEntry {
  id: string;
  created_at: string;
  performed_by_email: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  client_email: string | null;
  client_name: string | null;
  payment_option: string;
  installment_number: number | null;
  total_installments: number | null;
  requested_amount: number | null;
  expected_amount: number | null;
  amount_match: boolean | null;
  action: string;
  status: string;
  error_message: string | null;
  payment_link_url: string | null;
  stripe_session_id: string | null;
  source: string | null;
  ip_address: string | null;
}

interface PaymentAuditLogProps {
  /** If provided, filters audit entries to this quote only */
  quoteId?: string;
  /** Max rows to display (default 100) */
  limit?: number;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  link_created: { label: "Lien créé", icon: <CheckCircle2 className="h-3 w-3" />, variant: "default" },
  link_resent: { label: "Lien renvoyé", icon: <Mail className="h-3 w-3" />, variant: "secondary" },
  blocked_duplicate: { label: "Bloqué (doublon)", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
  blocked_already_paid: { label: "Bloqué (déjà payé)", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
  blocked_amount_mismatch: { label: "Bloqué (montant)", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
  blocked_wrong_option: { label: "Bloqué (option)", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
  blocked_overflow: { label: "Bloqué (somme)", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
  failed: { label: "Échec", icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
};

export const PaymentAuditLog = ({ quoteId, limit = 100 }: PaymentAuditLogProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      let query = supabase
        .from("payment_link_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (quoteId) query = query.eq("quote_id", quoteId);

      const { data, error } = await query;
      if (!error && data) setEntries(data as AuditEntry[]);
      setLoading(false);
    };
    fetchAudit();
  }, [quoteId, limit]);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.client_email?.toLowerCase().includes(q) ||
      e.client_name?.toLowerCase().includes(q) ||
      e.performed_by_email?.toLowerCase().includes(q) ||
      e.action.includes(q)
    );
  });

  const stats = {
    total: entries.length,
    blocked: entries.filter((e) => e.status === "blocked").length,
    success: entries.filter((e) => e.status === "success").length,
    errors: entries.filter((e) => e.status === "error").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Journal d'audit des paiements
          {quoteId && <Badge variant="outline" className="ml-2">Devis ciblé</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trace immuable de chaque tentative d'envoi de lien de paiement (qui, quand, quel montant, quelle option).
        </p>
      </CardHeader>
      <CardContent>
        {!quoteId && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Card className="bg-muted/50"><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </CardContent></Card>
            <Card className="bg-primary/5"><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Succès</p>
              <p className="text-xl font-bold text-primary">{stats.success}</p>
            </CardContent></Card>
            <Card className="bg-destructive/5"><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Bloqués</p>
              <p className="text-xl font-bold text-destructive">{stats.blocked}</p>
            </CardContent></Card>
            <Card className="bg-secondary/30"><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Erreurs</p>
              <p className="text-xl font-bold">{stats.errors}</p>
            </CardContent></Card>
          </div>
        )}

        {!quoteId && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client, admin, action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune entrée d'audit pour le moment.
          </p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Option</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const meta = ACTION_LABELS[e.action] || { label: e.action, icon: null, variant: "outline" as const };
                  return (
                    <TableRow key={e.id} className={e.status === "blocked" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(e.created_at), "dd/MM/yy HH:mm:ss", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant} className="gap-1 text-xs">
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{e.performed_by_email || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{e.client_name || "—"}</div>
                        <div className="text-muted-foreground">{e.client_email}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {e.payment_option}
                          {e.installment_number && ` ${e.installment_number}/${e.total_installments}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {e.requested_amount != null ? `${Number(e.requested_amount).toFixed(2)}€` : "—"}
                        {e.amount_match === false && (
                          <div className="text-destructive text-xs">
                            ≠ attendu: {Number(e.expected_amount).toFixed(2)}€
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[280px]">
                        {e.error_message ? (
                          <span className="text-destructive">{e.error_message}</span>
                        ) : e.payment_link_url ? (
                          <a
                            href={e.payment_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block"
                          >
                            🔗 Lien Stripe
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentAuditLog;
