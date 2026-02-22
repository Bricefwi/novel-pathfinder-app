import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Landmark,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Search,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["hsl(20, 90%, 48%)", "hsl(47, 100%, 50%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)", "hsl(280, 60%, 55%)", "hsl(340, 70%, 50%)", "hsl(30, 80%, 55%)", "hsl(170, 60%, 45%)"];

const formatEur = (v: number) => `${v.toFixed(2)} €`;

export function AccountingDashboard() {
  const [clientSearch, setClientSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["accounting-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, client_name, client_email, activity_title, total_amount, amount_paid, payment_status, payment_date, payment_method, created_at, due_date, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalPaid = invoices
      .filter((i) => i.payment_status === "paid")
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);

    const monthlyPaid = invoices
      .filter((i) => {
        if (i.payment_status !== "paid" || !i.payment_date) return false;
        const d = new Date(i.payment_date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);

    const pending = invoices
      .filter((i) => i.payment_status === "pending" || i.payment_status === "partial")
      .reduce((s, i) => s + Number(i.total_amount || 0) - Number(i.amount_paid || 0), 0);

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const recoveryRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return { totalPaid, monthlyPaid, pending, recoveryRate };
  }, [invoices]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((inv) => {
      if (inv.payment_status === "paid" && inv.payment_date) {
        const key = format(parseISO(inv.payment_date), "yyyy-MM");
        map.set(key, (map.get(key) || 0) + Number(inv.total_amount || 0));
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, ca]) => ({
        month: format(parseISO(month + "-01"), "MMM yy", { locale: fr }),
        ca,
      }));
  }, [invoices]);

  // By product
  const byProduct = useMemo(() => {
    const map = new Map<string, { count: number; total: number; paid: number }>();
    invoices.forEach((inv) => {
      const key = inv.activity_title || "Autre";
      const cur = map.get(key) || { count: 0, total: 0, paid: 0 };
      cur.count++;
      cur.total += Number(inv.total_amount || 0);
      cur.paid += Number(inv.amount_paid || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      ...d,
      remaining: d.total - d.paid,
    }));
  }, [invoices]);

  // By client
  const byClient = useMemo(() => {
    const map = new Map<string, { email: string; count: number; total: number; paid: number; lastPayment: string | null }>();
    invoices.forEach((inv) => {
      const key = inv.client_name || "Inconnu";
      const cur = map.get(key) || { email: inv.client_email || "", count: 0, total: 0, paid: 0, lastPayment: null };
      cur.count++;
      cur.total += Number(inv.total_amount || 0);
      cur.paid += Number(inv.amount_paid || 0);
      if (inv.payment_date && (!cur.lastPayment || inv.payment_date > cur.lastPayment)) {
        cur.lastPayment = inv.payment_date;
      }
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d, remaining: d.total - d.paid }))
      .filter((c) => {
        if (!clientSearch) return true;
        const q = clientSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      });
  }, [invoices, clientSearch]);

  // Filtered invoices for detail tab
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.payment_status !== statusFilter) return false;
      return true;
    });
  }, [invoices, statusFilter]);

  const exportCSV = () => {
    const headers = ["N° Facture", "Client", "Email", "Activité", "Total", "Payé", "Restant", "Statut", "Date paiement", "Méthode"];
    const rows = filteredInvoices.map((i) => [
      i.invoice_number,
      i.client_name,
      i.client_email,
      i.activity_title,
      Number(i.total_amount || 0).toFixed(2),
      Number(i.amount_paid || 0).toFixed(2),
      (Number(i.total_amount || 0) - Number(i.amount_paid || 0)).toFixed(2),
      i.payment_status || "",
      i.payment_date ? format(parseISO(i.payment_date), "dd/MM/yyyy") : "",
      i.payment_method || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Payé</Badge>;
      case "partial":
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">Partiel</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-700 border-red-500/30">En attente</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-serif font-bold">Comptabilité</h1>
          <p className="text-sm text-muted-foreground">Suivi des entrées financières et règlements</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">CA Total (payé)</p>
                <p className="text-2xl font-bold">{formatEur(kpis.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">CA du mois</p>
                <p className="text-2xl font-bold">{formatEur(kpis.monthlyPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{formatEur(kpis.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Taux recouvrement</p>
                <p className="text-2xl font-bold">{kpis.recoveryRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="products">Par produit</TabsTrigger>
          <TabsTrigger value="clients">Par client</TabsTrigger>
          <TabsTrigger value="details">Liste détaillée</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du CA mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v}€`} />
                    <Tooltip formatter={(v: number) => formatEur(v)} />
                    <Line type="monotone" dataKey="ca" stroke="hsl(20, 90%, 48%)" strokeWidth={2} name="CA" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucune donnée de paiement disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: By Product */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Répartition par produit</CardTitle></CardHeader>
              <CardContent>
                {byProduct.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={byProduct} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">Aucune donnée</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Détail par produit</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Factures</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Payé</TableHead>
                      <TableHead className="text-right">Restant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right">{formatEur(p.total)}</TableCell>
                        <TableCell className="text-right text-green-700">{formatEur(p.paid)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatEur(p.remaining)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: By Client */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Règlements par client</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher client..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Factures</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Restant</TableHead>
                    <TableHead className="text-right">Dernier paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClient.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">{formatEur(c.total)}</TableCell>
                      <TableCell className="text-right text-green-700">{formatEur(c.paid)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatEur(c.remaining)}</TableCell>
                      <TableCell className="text-right">{c.lastPayment ? format(parseISO(c.lastPayment), "dd/MM/yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {byClient.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun résultat</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Detailed List */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Liste des factures</CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="paid">Payé</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="partial">Partiel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Restant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date paiement</TableHead>
                    <TableHead>Méthode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const remaining = Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.client_name}</TableCell>
                        <TableCell>{inv.activity_title}</TableCell>
                        <TableCell className="text-right">{formatEur(Number(inv.total_amount || 0))}</TableCell>
                        <TableCell className="text-right text-green-700">{formatEur(Number(inv.amount_paid || 0))}</TableCell>
                        <TableCell className="text-right text-red-600">{formatEur(remaining)}</TableCell>
                        <TableCell>{statusBadge(inv.payment_status)}</TableCell>
                        <TableCell>{inv.payment_date ? format(parseISO(inv.payment_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell className="capitalize">{inv.payment_method || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucune facture trouvée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
