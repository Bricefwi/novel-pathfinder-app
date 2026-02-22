import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const formatEur = (v: number) => `${v.toFixed(2)} €`;

interface ExportData {
  kpis: Record<string, number>;
  byProduct: Array<{ name: string; count: number; total: number; paid: number; remaining: number; participants: number; paymentRate: number }>;
  byClient: Array<{ name: string; email: string; count: number; total: number; paid: number; remaining: number; paymentRate: number }>;
  filteredInvoices: Array<Record<string, unknown>>;
  overdueInvoices: Array<Record<string, unknown>>;
  byPaymentMethod: Array<{ name: string; count: number; total: number }>;
  dateLabel: string;
}

const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "E8611A" } }, alignment: { horizontal: "center" } };

const applyHeaderStyle = (ws: XLSX.WorkSheet, range: string) => {
  const ref = XLSX.utils.decode_range(range);
  for (let C = ref.s.c; C <= ref.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: ref.s.r, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = headerStyle;
  }
};

const autoWidth = (ws: XLSX.WorkSheet, data: unknown[][]) => {
  const colWidths = data[0]?.map((_, i) =>
    Math.max(...data.map((row) => String(row[i] || "").length), 10)
  ) || [];
  ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w + 2, 40) }));
};

export const exportAccountingExcel = (data: ExportData) => {
  const wb = XLSX.utils.book_new();
  const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });

  // Sheet 1: Résumé KPIs
  const kpiRows = [
    ["Ferme Équestre An Arwen - Comptabilité"],
    [`Période : ${data.dateLabel}`],
    [`Export le : ${now}`],
    [],
    ["Indicateur", "Valeur"],
    ["CA Total Facturé", formatEur(data.kpis.totalInvoiced)],
    ["CA Total Payé", formatEur(data.kpis.totalPaid)],
    ["CA du Mois", formatEur(data.kpis.monthlyPaid)],
    ["Montant En Attente", formatEur(data.kpis.pending)],
    ["Montant En Retard", formatEur(data.kpis.overdueAmount)],
    ["Taux de Recouvrement", `${data.kpis.recoveryRate.toFixed(1)}%`],
    ["Nombre de Factures", data.kpis.invoiceCount],
    ["Facture Moyenne", formatEur(data.kpis.avgInvoice)],
    ["Factures Payées", data.kpis.paidCount],
    ["Factures En Attente", data.kpis.pendingCount],
    ["Factures Partielles", data.kpis.partialCount],
    ["Factures En Retard", data.kpis.overdueCount],
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKpi["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  autoWidth(wsKpi, kpiRows);
  XLSX.utils.book_append_sheet(wb, wsKpi, "Résumé");

  // Sheet 2: Par Produit
  const prodHeaders = ["Produit", "Factures", "Participants", "Total Facturé", "Payé", "Restant Dû", "Taux Paiement"];
  const prodRows = [prodHeaders, ...data.byProduct.map((p) => [
    p.name, p.count, p.participants, formatEur(p.total), formatEur(p.paid), formatEur(p.remaining), `${p.paymentRate.toFixed(1)}%`,
  ])];
  const wsProd = XLSX.utils.aoa_to_sheet(prodRows);
  autoWidth(wsProd, prodRows);
  XLSX.utils.book_append_sheet(wb, wsProd, "Par Produit");

  // Sheet 3: Par Client
  const clientHeaders = ["Client", "Email", "Factures", "Total Facturé", "Payé", "Restant Dû", "Taux Paiement"];
  const clientRows = [clientHeaders, ...data.byClient.map((c) => [
    c.name, c.email, c.count, formatEur(c.total), formatEur(c.paid), formatEur(c.remaining), `${c.paymentRate.toFixed(1)}%`,
  ])];
  const wsClient = XLSX.utils.aoa_to_sheet(clientRows);
  autoWidth(wsClient, clientRows);
  XLSX.utils.book_append_sheet(wb, wsClient, "Par Client");

  // Sheet 4: Liste Détaillée
  const detailHeaders = ["N° Facture", "Client", "Email", "Activité", "Participants", "Total", "Payé", "Restant", "Statut Paiement", "Date Paiement", "Méthode", "Échéance", "Date Création"];
  const detailRows = [detailHeaders, ...data.filteredInvoices.map((i: Record<string, unknown>) => [
    i.invoice_number,
    i.client_name,
    i.client_email,
    i.activity_title,
    i.participants,
    formatEur(Number(i.total_amount || 0)),
    formatEur(Number(i.amount_paid || 0)),
    formatEur(Number(i.total_amount || 0) - Number(i.amount_paid || 0)),
    i.payment_status === "paid" ? "Payé" : i.payment_status === "partial" ? "Partiel" : "En attente",
    i.payment_date ? format(new Date(String(i.payment_date)), "dd/MM/yyyy") : "",
    i.payment_method || "",
    i.due_date ? format(new Date(String(i.due_date)), "dd/MM/yyyy") : "",
    format(new Date(String(i.created_at)), "dd/MM/yyyy"),
  ])];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  autoWidth(wsDetail, detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, "Liste Détaillée");

  // Sheet 5: Échéances en retard
  if (data.overdueInvoices.length > 0) {
    const overdueHeaders = ["N° Facture", "Client", "Activité", "Total", "Restant Dû", "Échéance", "Jours de Retard"];
    const overdueRows = [overdueHeaders, ...data.overdueInvoices.map((i: Record<string, unknown>) => [
      i.invoice_number,
      i.client_name,
      i.activity_title,
      formatEur(Number(i.total_amount || 0)),
      formatEur(Number(i.remaining || 0)),
      i.due_date ? format(new Date(String(i.due_date)), "dd/MM/yyyy") : "",
      i.daysOverdue,
    ])];
    const wsOverdue = XLSX.utils.aoa_to_sheet(overdueRows);
    autoWidth(wsOverdue, overdueRows);
    XLSX.utils.book_append_sheet(wb, wsOverdue, "En Retard");
  }

  // Sheet 6: Par Méthode de Paiement
  if (data.byPaymentMethod.length > 0) {
    const methodHeaders = ["Méthode", "Transactions", "Montant Total"];
    const methodRows = [methodHeaders, ...data.byPaymentMethod.map((m) => [
      m.name, m.count, formatEur(m.total),
    ])];
    const wsMethod = XLSX.utils.aoa_to_sheet(methodRows);
    autoWidth(wsMethod, methodRows);
    XLSX.utils.book_append_sheet(wb, wsMethod, "Méthodes Paiement");
  }

  XLSX.writeFile(wb, `comptabilite-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
};
