import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarCheck,
  FileSignature,
  Receipt,
  Search,
  ArrowDownUp,
  Loader2,
  RefreshCcw,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type SourceType = "quote" | "invoice" | "booking";
type SourceFilter = "all" | SourceType | "invoice_pending";
type SortKey = "date" | "client" | "amount" | "source";
type SortDir = "asc" | "desc";

interface Reservation {
  id: string;
  source: SourceType;
  reference: string;
  client_name: string;
  client_email: string;
  activity_title: string;
  start_date: string | null;
  end_date: string | null;
  participants: number | null;
  amount: number | null;
  status: string;
  payment_status: string | null;
  created_at: string;
}

const SOURCE_META: Record<
  SourceType,
  { label: string; icon: typeof FileSignature; badgeClass: string }
> = {
  quote: {
    label: "Devis accepté",
    icon: FileSignature,
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  invoice: {
    label: "Facture active",
    icon: Receipt,
    badgeClass: "bg-secondary/40 text-secondary-foreground border-secondary",
  },
  booking: {
    label: "Réservation confirmée",
    icon: CalendarCheck,
    badgeClass: "bg-accent text-accent-foreground border-accent-foreground/20",
  },
};

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—";

const formatAmount = (n: number | null) =>
  n == null ? "—" : `${Number(n).toFixed(2)} €`;

export function Reservations() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceType>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [quotesRes, invoicesRes, bookingsRes] = await Promise.all([
        supabase
          .from("quotes")
          .select(
            "id, quote_number, client_name, client_email, activity_title, start_date, end_date, participants, total_price, status, created_at"
          )
          .eq("status", "accepted"),
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, client_name, client_email, activity_title, start_date, end_date, participants, total_amount, status, payment_status, created_at"
          )
          .neq("status", "cancelled")
          .neq("payment_status", "refunded"),
        supabase
          .from("bookings")
          .select(
            "id, contact_name, contact_email, activity_id, start_date, end_date, participants, total_price, status, created_at, activities(title)"
          )
          .eq("status", "confirmed"),
      ]);

      if (quotesRes.error) throw quotesRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      const quotes: Reservation[] = (quotesRes.data ?? []).map((q) => ({
        id: q.id,
        source: "quote",
        reference: q.quote_number,
        client_name: q.client_name,
        client_email: q.client_email,
        activity_title: q.activity_title,
        start_date: q.start_date,
        end_date: q.end_date,
        participants: q.participants,
        amount: q.total_price,
        status: q.status ?? "accepted",
        created_at: q.created_at,
      }));

      const invoices: Reservation[] = (invoicesRes.data ?? []).map((i) => ({
        id: i.id,
        source: "invoice",
        reference: i.invoice_number,
        client_name: i.client_name,
        client_email: i.client_email,
        activity_title: i.activity_title,
        start_date: i.start_date,
        end_date: i.end_date,
        participants: i.participants,
        amount: i.total_amount,
        status: `${i.status ?? "—"} • ${i.payment_status ?? "pending"}`,
        created_at: i.created_at,
      }));

      const bookings: Reservation[] = (bookingsRes.data ?? []).map(
        (b: {
          id: string;
          contact_name: string;
          contact_email: string;
          start_date: string;
          end_date: string | null;
          participants: number | null;
          total_price: number | null;
          status: string;
          created_at: string;
          activities?: { title: string } | null;
        }) => ({
          id: b.id,
          source: "booking",
          reference: b.id.slice(0, 8).toUpperCase(),
          client_name: b.contact_name,
          client_email: b.contact_email,
          activity_title: b.activities?.title ?? "Réservation",
          start_date: b.start_date,
          end_date: b.end_date,
          participants: b.participants,
          amount: b.total_price,
          status: b.status ?? "confirmed",
          created_at: b.created_at,
        })
      );

      setItems([...quotes, ...invoices, ...bookings]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Chargement impossible : ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((r) => sourceFilter === "all" || r.source === sourceFilter)
      .filter((r) => {
        if (!q) return true;
        return (
          r.client_name.toLowerCase().includes(q) ||
          r.client_email.toLowerCase().includes(q) ||
          r.activity_title.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "client":
            return a.client_name.localeCompare(b.client_name) * dir;
          case "amount":
            return ((a.amount ?? 0) - (b.amount ?? 0)) * dir;
          case "source":
            return a.source.localeCompare(b.source) * dir;
          case "date":
          default: {
            const da = a.start_date ?? a.created_at;
            const db = b.start_date ?? b.created_at;
            return (new Date(da).getTime() - new Date(db).getTime()) * dir;
          }
        }
      });
  }, [items, search, sourceFilter, sortKey, sortDir]);

  const counts = useMemo(
    () => ({
      total: items.length,
      quote: items.filter((i) => i.source === "quote").length,
      invoice: items.filter((i) => i.source === "invoice").length,
      booking: items.filter((i) => i.source === "booking").length,
    }),
    [items]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Réservations</h1>
          <p className="text-sm text-muted-foreground">
            Vue fusionnée des devis acceptés, factures actives et réservations confirmées.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Rafraîchir
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileSignature className="h-3 w-3" /> Devis acceptés
            </p>
            <p className="text-2xl font-bold text-primary">{counts.quote}</p>
          </CardContent>
        </Card>
        <Card className="border-secondary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Factures actives
            </p>
            <p className="text-2xl font-bold text-secondary-foreground">{counts.invoice}</p>
          </CardContent>
        </Card>
        <Card className="border-accent-foreground/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" /> Réservations confirmées
            </p>
            <p className="text-2xl font-bold">{counts.booking}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Recherche & tri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher : client, email, activité, référence…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="quote">Devis acceptés</SelectItem>
                <SelectItem value="invoice">Factures actives</SelectItem>
                <SelectItem value="booking">Réservations confirmées</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortKey}:${sortDir}`}
              onValueChange={(v) => {
                const [k, d] = v.split(":") as [SortKey, SortDir];
                setSortKey(k);
                setSortDir(d);
              }}
            >
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date:desc">Date — plus récente</SelectItem>
                <SelectItem value="date:asc">Date — plus ancienne</SelectItem>
                <SelectItem value="client:asc">Client — A → Z</SelectItem>
                <SelectItem value="client:desc">Client — Z → A</SelectItem>
                <SelectItem value="amount:desc">Montant — décroissant</SelectItem>
                <SelectItem value="amount:asc">Montant — croissant</SelectItem>
                <SelectItem value="source:asc">Source — A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} / {items.length} réservation(s) affichée(s).
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("source")}
                >
                  Source <ArrowDownUp className="h-3 w-3 opacity-60" />
                </button>
              </TableHead>
              <TableHead>Réf.</TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("client")}
                >
                  Client <ArrowDownUp className="h-3 w-3 opacity-60" />
                </button>
              </TableHead>
              <TableHead>Activité</TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("date")}
                >
                  Période <ArrowDownUp className="h-3 w-3 opacity-60" />
                </button>
              </TableHead>
              <TableHead className="text-right">Pers.</TableHead>
              <TableHead className="text-right">
                <button
                  className="flex items-center gap-1 hover:text-foreground ml-auto"
                  onClick={() => toggleSort("amount")}
                >
                  Montant <ArrowDownUp className="h-3 w-3 opacity-60" />
                </button>
              </TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  Aucune réservation ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const meta = SOURCE_META[r.source];
                const Icon = meta.icon;
                return (
                  <TableRow key={`${r.source}-${r.id}`}>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${meta.badgeClass}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{r.client_name}</span>
                        <span className="text-xs text-muted-foreground">{r.client_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.activity_title}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span>{formatDate(r.start_date)}</span>
                        {r.end_date && r.end_date !== r.start_date && (
                          <span className="text-muted-foreground">→ {formatDate(r.end_date)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{r.participants ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
