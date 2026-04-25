import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Landmark, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Download,
  Search, FileSpreadsheet, Receipt, Users, CreditCard, CalendarClock, BarChart3,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Area, AreaChart,
} from "recharts";
import { useAccountingData, type DateRange } from "./accounting/useAccountingData";
import { exportAccountingExcel } from "./accounting/AccountingExcelExport";
import { ConsistencyCheck } from "./accounting/ConsistencyCheck";

const COLORS = ["hsl(20, 90%, 48%)", "hsl(47, 100%, 50%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)", "hsl(280, 60%, 55%)", "hsl(340, 70%, 50%)", "hsl(30, 80%, 55%)", "hsl(170, 60%, 45%)"];
const formatEur = (v: number) => `${v.toFixed(2)} €`;
const formatEurShort = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`;

const DATE_LABELS: Record<DateRange, string> = {
  all: "Toutes les périodes",
  month: "Ce mois",
  quarter: "Ce trimestre",
  year: "Cette année",
  custom: "Période personnalisée",
};

export function AccountingDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientSearch, setClientSearch] = useState("");

  const {
    filteredInvoices, kpis, monthlyData, byPaymentMethod, byProduct, byClient, overdueInvoices, isLoading,
  } = useAccountingData({ dateRange, statusFilter, clientSearch });

  const handleExportExcel = () => {
    exportAccountingExcel({
      kpis,
      byProduct,
      byClient,
      filteredInvoices: filteredInvoices as unknown as Array<Record<string, unknown>>,
      overdueInvoices: overdueInvoices as unknown as Array<Record<string, unknown>>,
      byPaymentMethod,
      dateLabel: DATE_LABELS[dateRange],
    });
  };

  const handleExportCSV = () => {
    const headers = ["N° Facture", "Client", "Email", "Activité", "Total", "Payé", "Restant", "Statut", "Date paiement", "Méthode", "Échéance"];
    const rows = filteredInvoices.map((i) => [
      i.invoice_number, i.client_name, i.client_email, i.activity_title,
      Number(i.total_amount || 0).toFixed(2), Number(i.amount_paid || 0).toFixed(2),
      (Number(i.total_amount || 0) - Number(i.amount_paid || 0)).toFixed(2),
      i.payment_status || "", i.payment_date ? format(parseISO(i.payment_date), "dd/MM/yyyy") : "",
      i.payment_method || "", i.due_date ? format(new Date(i.due_date), "dd/MM/yyyy") : "",
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Comptabilité</h1>
            <p className="text-sm text-muted-foreground">Suivi complet des entrées financières et règlements</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes périodes</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPIs - 2 rows of 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">CA Total (payé)</p>
                  <p className="text-xl font-bold">{formatEur(kpis.totalPaid)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  {kpis.monthTrend >= 0 ? <TrendingUp className="h-5 w-5 text-primary" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CA du mois</p>
                  <p className="text-xl font-bold">{formatEur(kpis.monthlyPaid)}</p>
                </div>
              </div>
              {kpis.monthTrend !== 0 && (
                <Badge variant="outline" className={kpis.monthTrend > 0 ? "text-green-700" : "text-red-600"}>
                  {kpis.monthTrend > 0 ? "+" : ""}{kpis.monthTrend.toFixed(0)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{formatEur(kpis.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Taux recouvrement</p>
                <p className="text-xl font-bold">{kpis.recoveryRate.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={kpis.recoveryRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total facturé</p>
                <p className="text-xl font-bold">{formatEur(kpis.totalInvoiced)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><BarChart3 className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Facture moyenne</p>
                <p className="text-xl font-bold">{formatEur(kpis.avgInvoice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Receipt className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Nb factures</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{kpis.invoiceCount}</p>
                  <div className="flex gap-1 text-xs">
                    <span className="text-green-600">{kpis.paidCount}✓</span>
                    <span className="text-amber-600">{kpis.partialCount}◐</span>
                    <span className="text-red-600">{kpis.pendingCount}○</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={kpis.overdueCount > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpis.overdueCount > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <CalendarClock className={`h-5 w-5 ${kpis.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En retard</p>
                <p className="text-xl font-bold">{formatEur(kpis.overdueAmount)}</p>
                {kpis.overdueCount > 0 && <p className="text-xs text-destructive">{kpis.overdueCount} facture(s)</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="products">Par produit</TabsTrigger>
          <TabsTrigger value="clients">Par client</TabsTrigger>
          <TabsTrigger value="overdue">
            Échéances
            {kpis.overdueCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{kpis.overdueCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="methods">Méthodes</TabsTrigger>
          <TabsTrigger value="details">Liste détaillée</TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Évolution Facturé vs Encaissé</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={formatEurShort} />
                      <Tooltip formatter={(v: number) => formatEur(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="facture" stroke="hsl(200, 70%, 50%)" fill="hsl(200, 70%, 50%)" fillOpacity={0.1} strokeWidth={2} name="Facturé" />
                      <Area type="monotone" dataKey="encaisse" stroke="hsl(20, 90%, 48%)" fill="hsl(20, 90%, 48%)" fillOpacity={0.2} strokeWidth={2} name="Encaissé" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Répartition des statuts</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Payé", value: kpis.paidCount },
                        { name: "Partiel", value: kpis.partialCount },
                        { name: "En attente", value: kpis.pendingCount },
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      <Cell fill="hsl(150, 60%, 45%)" />
                      <Cell fill="hsl(47, 100%, 50%)" />
                      <Cell fill="hsl(0, 70%, 55%)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: By Product */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Répartition par produit</CardTitle></CardHeader>
              <CardContent>
                {byProduct.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={formatEurShort} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatEur(v)} />
                      <Legend />
                      <Bar dataKey="paid" stackId="a" fill="hsl(150, 60%, 45%)" name="Payé" />
                      <Bar dataKey="remaining" stackId="a" fill="hsl(0, 70%, 55%)" name="Restant" />
                    </BarChart>
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
                      <TableHead className="text-right">Fact.</TableHead>
                      <TableHead className="text-right">Pers.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Payé</TableHead>
                      <TableHead className="text-right">Restant</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium max-w-[200px] truncate" title={p.name}>{p.name}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right">{p.participants}</TableCell>
                        <TableCell className="text-right">{formatEur(p.total)}</TableCell>
                        <TableCell className="text-right text-green-700">{formatEur(p.paid)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatEur(p.remaining)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={p.paymentRate} className="w-16 h-1.5" />
                            <span className="text-xs text-muted-foreground w-10 text-right">{p.paymentRate.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {byProduct.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune donnée</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: By Client */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Règlements par client</CardTitle>
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
                    <TableHead>Produits</TableHead>
                    <TableHead className="text-right">Fact.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Restant</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Dernier paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClient.map((c) => (
                    <TableRow key={c.name} className={c.remaining > 0 ? "bg-amber-500/5" : ""}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {c.products.slice(0, 2).map((p) => (
                            <Badge key={p} variant="outline" className="text-xs truncate max-w-[120px]" title={p}>{p}</Badge>
                          ))}
                          {c.products.length > 2 && <Badge variant="outline" className="text-xs">+{c.products.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">{formatEur(c.total)}</TableCell>
                      <TableCell className="text-right text-green-700">{formatEur(c.paid)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{formatEur(c.remaining)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={c.paymentRate} className="w-16 h-1.5" />
                          <span className="text-xs w-10 text-right">{c.paymentRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.lastPayment ? format(parseISO(c.lastPayment), "dd/MM/yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {byClient.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucun résultat</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Overdue */}
        <TabsContent value="overdue">
          <Card className={overdueInvoices.length > 0 ? "border-destructive/30" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-destructive" />
                Factures en retard
                {overdueInvoices.length > 0 && <Badge variant="destructive">{overdueInvoices.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Activité</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Payé</TableHead>
                      <TableHead className="text-right">Restant dû</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead className="text-right">Retard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueInvoices.map((inv) => (
                      <TableRow key={inv.id} className="bg-destructive/5">
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="font-medium">{inv.client_name}</TableCell>
                        <TableCell>{inv.activity_title}</TableCell>
                        <TableCell className="text-right">{formatEur(Number(inv.total_amount || 0))}</TableCell>
                        <TableCell className="text-right text-green-700">{formatEur(Number(inv.amount_paid || 0))}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{formatEur(inv.remaining)}</TableCell>
                        <TableCell>{inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{inv.daysOverdue}j</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune facture en retard 🎉</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Payment Methods */}
        <TabsContent value="methods">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Répartition par méthode</CardTitle></CardHeader>
              <CardContent>
                {byPaymentMethod.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={byPaymentMethod} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {byPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">Aucun paiement enregistré</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Détail par méthode</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Méthode</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Montant total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byPaymentMethod.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-medium capitalize">{m.name}</TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                        <TableCell className="text-right font-medium">{formatEur(m.total)}</TableCell>
                      </TableRow>
                    ))}
                    {byPaymentMethod.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune donnée</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Detailed List */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Liste des factures ({filteredInvoices.length})</CardTitle>
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
                    <TableHead>Paiement</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Échéance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const remaining = Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
                    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.payment_status !== "paid";
                    return (
                      <TableRow key={inv.id} className={isOverdue ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.client_name}</TableCell>
                        <TableCell className="max-w-[180px] truncate" title={inv.activity_title}>{inv.activity_title}</TableCell>
                        <TableCell className="text-right">{formatEur(Number(inv.total_amount || 0))}</TableCell>
                        <TableCell className="text-right text-green-700">{formatEur(Number(inv.amount_paid || 0))}</TableCell>
                        <TableCell className="text-right text-red-600">{formatEur(remaining)}</TableCell>
                        <TableCell>{statusBadge(inv.payment_status)}</TableCell>
                        <TableCell>{inv.payment_date ? format(parseISO(inv.payment_date), "dd/MM/yy") : "—"}</TableCell>
                        <TableCell className="capitalize">{inv.payment_method || "—"}</TableCell>
                        <TableCell className={isOverdue ? "text-destructive font-medium" : ""}>
                          {inv.due_date ? format(new Date(inv.due_date), "dd/MM/yy") : "—"}
                          {isOverdue && " ⚠️"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Aucune facture trouvée</TableCell></TableRow>
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
