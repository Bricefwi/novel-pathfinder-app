import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, parseISO, format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export type DateRange = "all" | "month" | "quarter" | "year" | "custom";

export interface AccountingFilters {
  dateRange: DateRange;
  statusFilter: string;
  clientSearch: string;
  customStart?: string;
  customEnd?: string;
}

export const useAccountingData = (filters: AccountingFilters) => {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["accounting-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, client_name, client_email, activity_title, total_amount, amount_paid, payment_status, payment_date, payment_method, created_at, due_date, status, participants, unit_price, start_date, end_date, subtotal, tax_amount")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["accounting-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, payment_type, created_at, client_name, client_email, invoice_id, stripe_payment_intent_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Date-filtered invoices
  const filteredByDate = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      const created = new Date(inv.created_at);
      switch (filters.dateRange) {
        case "month":
          return created >= startOfMonth(now) && created <= endOfMonth(now);
        case "quarter":
          return created >= subMonths(startOfMonth(now), 2);
        case "year":
          return created.getFullYear() === now.getFullYear();
        case "custom":
          if (filters.customStart && filters.customEnd) {
            return created >= new Date(filters.customStart) && created <= new Date(filters.customEnd);
          }
          return true;
        default:
          return true;
      }
    });
  }, [invoices, filters.dateRange, filters.customStart, filters.customEnd]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const totalInvoiced = filteredByDate.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalPaid = filteredByDate
      .filter((i) => i.payment_status === "paid")
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = filteredByDate.reduce((s, i) => s + Number(i.amount_paid || 0), 0);

    const monthlyPaid = invoices
      .filter((i) => {
        if (i.payment_status !== "paid" || !i.payment_date) return false;
        const d = new Date(i.payment_date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);

    const prevMonthPaid = invoices
      .filter((i) => {
        if (i.payment_status !== "paid" || !i.payment_date) return false;
        const d = new Date(i.payment_date);
        return d >= prevMonthStart && d <= prevMonthEnd;
      })
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);

    const pending = filteredByDate
      .filter((i) => i.payment_status === "pending" || i.payment_status === "partial")
      .reduce((s, i) => s + Number(i.total_amount || 0) - Number(i.amount_paid || 0), 0);

    const overdue = filteredByDate.filter((i) => {
      if (i.payment_status === "paid") return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < now;
    });
    const overdueAmount = overdue.reduce((s, i) => s + Number(i.total_amount || 0) - Number(i.amount_paid || 0), 0);

    const recoveryRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
    const invoiceCount = filteredByDate.length;
    const avgInvoice = invoiceCount > 0 ? totalInvoiced / invoiceCount : 0;
    const paidCount = filteredByDate.filter((i) => i.payment_status === "paid").length;
    const pendingCount = filteredByDate.filter((i) => i.payment_status === "pending").length;
    const partialCount = filteredByDate.filter((i) => i.payment_status === "partial").length;
    const monthTrend = prevMonthPaid > 0 ? ((monthlyPaid - prevMonthPaid) / prevMonthPaid) * 100 : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalCollected,
      monthlyPaid,
      pending,
      overdueAmount,
      overdueCount: overdue.length,
      recoveryRate,
      invoiceCount,
      avgInvoice,
      paidCount,
      pendingCount,
      partialCount,
      monthTrend,
    };
  }, [filteredByDate, invoices]);

  // Monthly chart data (last 12 months)
  const monthlyData = useMemo(() => {
    const mapInvoiced = new Map<string, number>();
    const mapPaid = new Map<string, number>();
    invoices.forEach((inv) => {
      const key = format(new Date(inv.created_at), "yyyy-MM");
      mapInvoiced.set(key, (mapInvoiced.get(key) || 0) + Number(inv.total_amount || 0));
      if (inv.payment_status === "paid" && inv.payment_date) {
        const pKey = format(parseISO(inv.payment_date), "yyyy-MM");
        mapPaid.set(pKey, (mapPaid.get(pKey) || 0) + Number(inv.total_amount || 0));
      }
    });
    const allKeys = new Set([...mapInvoiced.keys(), ...mapPaid.keys()]);
    return Array.from(allKeys)
      .sort()
      .slice(-12)
      .map((month) => ({
        month: format(parseISO(month + "-01"), "MMM yy", { locale: fr }),
        facture: mapInvoiced.get(month) || 0,
        encaisse: mapPaid.get(month) || 0,
      }));
  }, [invoices]);

  // By payment method
  const byPaymentMethod = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredByDate
      .filter((i) => i.payment_status === "paid")
      .forEach((inv) => {
        const method = inv.payment_method || "Non renseigné";
        const cur = map.get(method) || { count: 0, total: 0 };
        cur.count++;
        cur.total += Number(inv.total_amount || 0);
        map.set(method, cur);
      });
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d }));
  }, [filteredByDate]);

  // By product
  const byProduct = useMemo(() => {
    const map = new Map<string, { count: number; total: number; paid: number; participants: number }>();
    filteredByDate.forEach((inv) => {
      const key = inv.activity_title || "Autre";
      const cur = map.get(key) || { count: 0, total: 0, paid: 0, participants: 0 };
      cur.count++;
      cur.total += Number(inv.total_amount || 0);
      cur.paid += Number(inv.amount_paid || 0);
      cur.participants += Number(inv.participants || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d, remaining: d.total - d.paid, paymentRate: d.total > 0 ? (d.paid / d.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredByDate]);

  // By client
  const byClient = useMemo(() => {
    const map = new Map<string, { email: string; count: number; total: number; paid: number; lastPayment: string | null; products: Set<string> }>();
    filteredByDate.forEach((inv) => {
      const key = inv.client_name || "Inconnu";
      const cur = map.get(key) || { email: inv.client_email || "", count: 0, total: 0, paid: 0, lastPayment: null, products: new Set() };
      cur.count++;
      cur.total += Number(inv.total_amount || 0);
      cur.paid += Number(inv.amount_paid || 0);
      if (inv.activity_title) cur.products.add(inv.activity_title);
      if (inv.payment_date && (!cur.lastPayment || inv.payment_date > cur.lastPayment)) {
        cur.lastPayment = inv.payment_date;
      }
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        email: d.email,
        count: d.count,
        total: d.total,
        paid: d.paid,
        remaining: d.total - d.paid,
        lastPayment: d.lastPayment,
        products: Array.from(d.products),
        paymentRate: d.total > 0 ? (d.paid / d.total) * 100 : 0,
      }))
      .filter((c) => {
        if (!filters.clientSearch) return true;
        const q = filters.clientSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredByDate, filters.clientSearch]);

  // Overdue invoices
  const overdueInvoices = useMemo(() => {
    const now = new Date();
    return filteredByDate
      .filter((i) => {
        if (i.payment_status === "paid") return false;
        if (!i.due_date) return false;
        return new Date(i.due_date) < now;
      })
      .map((i) => ({
        ...i,
        daysOverdue: differenceInDays(now, new Date(i.due_date!)),
        remaining: Number(i.total_amount || 0) - Number(i.amount_paid || 0),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [filteredByDate]);

  // Status-filtered invoices for detail tab
  const filteredInvoices = useMemo(() => {
    return filteredByDate.filter((inv) => {
      if (filters.statusFilter !== "all" && inv.payment_status !== filters.statusFilter) return false;
      return true;
    });
  }, [filteredByDate, filters.statusFilter]);

  return {
    invoices: filteredByDate,
    allInvoices: invoices,
    payments,
    filteredInvoices,
    kpis,
    monthlyData,
    byPaymentMethod,
    byProduct,
    byClient,
    overdueInvoices,
    isLoading: loadingInvoices || loadingPayments,
  };
};
