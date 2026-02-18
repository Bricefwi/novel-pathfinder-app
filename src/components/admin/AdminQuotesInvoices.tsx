import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Plus, Download, Eye, Receipt, CheckCircle, Mail, Loader2, Copy } from "lucide-react";
import { downloadQuotePDF, type QuoteData } from "@/components/pdf/QuotePDFGenerator";
import { downloadInvoicePDF, type InvoiceData } from "@/components/pdf/InvoicePDFGenerator";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  pending: "En attente",
  partial: "Partiel",
  paid: "Payé",
  cancelled: "Annulé",
};

export const AdminQuotesInvoices = () => {
  const queryClient = useQueryClient();
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [duplicatingQuote, setDuplicatingQuote] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<typeof quotes extends (infer T)[] ? T : never | null>(null);

  // Send test email function
  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-quote-email", {
        body: {
          quote_number: "DEV-TEST-001",
          client_name: "Test Resend",
          client_email: "patrice.simion@gmail.com",
          activity_title: "🧪 Email de test - Configuration Resend",
          activity_duration: "3 jours / 2 nuits",
          start_date: "2026-03-15",
          end_date: "2026-03-17",
          participants: 2,
          unit_price: 450,
          total_price: 900,
          deposit_amount: 180,
          deposit_percentage: 20,
          valid_until: "2026-02-15",
          notes: "Ceci est un email de test pour valider la configuration Resend. Si vous recevez cet email, la configuration fonctionne correctement !",
        },
      });
      
      if (error) throw error;
      toast.success("✅ Email de test envoyé à patrice.simion@gmail.com");
    } catch (err) {
      console.error("Test email error:", err);
      toast.error("Erreur lors de l'envoi de l'email de test");
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Fetch quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch contact requests for quick quote creation
  const { data: contactRequests } = useQuery({
    queryKey: ["pending-contact-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: Partial<QuoteData>) => {
      // 1) Generate quote number
      const { data: numberData, error: numberError } = await supabase.rpc("generate_quote_number");
      if (numberError) throw numberError;

      // 2) Insert into DB first (Status: draft)
      const { data: newQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          quote_number: numberData,
          client_name: quoteData.client_name,
          client_email: quoteData.client_email,
          client_phone: quoteData.client_phone,
          client_address: quoteData.client_address,
          activity_title: quoteData.activity_title,
          activity_duration: quoteData.activity_duration,
          start_date: quoteData.start_date,
          end_date: quoteData.end_date,
          unit_price: quoteData.unit_price,
          participants: quoteData.participants,
          total_price: quoteData.total_price,
          deposit_amount: quoteData.deposit_amount,
          deposit_percentage: quoteData.deposit_percentage || 30,
          payment_option: quoteData.payment_option || "deposit",
          valid_until: quoteData.valid_until,
          notes: quoteData.notes,
          status: "draft", // Always start as draft
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newQuote;
    },
    onSuccess: async (newQuote, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success("Devis créé avec succès (Brouillon)");
      setIsQuoteDialogOpen(false);

      // 3) Attempt to send email separately
      toast.info("Tentative d'envoi de l'email...");

      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-quote-email", {
          body: {
            quote_id: newQuote.id,
            quote_number: newQuote.quote_number,
            client_name: variables.client_name,
            client_email: variables.client_email,
            activity_title: variables.activity_title,
            activity_duration: variables.activity_duration,
            start_date: variables.start_date,
            end_date: variables.end_date,
            participants: variables.participants,
            unit_price: variables.unit_price,
            total_price: variables.total_price,
            deposit_amount: variables.deposit_amount,
            deposit_percentage: variables.deposit_percentage ?? 30,
            valid_until: variables.valid_until,
            notes: variables.notes,
          },
        });

        if (emailError || emailData?.error) {
          throw new Error(emailError?.message || emailData?.error || "Erreur inconnue");
        }

        // 4) Update status to 'sent' ONLY if email success
        const { error: updateError } = await supabase
          .from("quotes")
          .update({ status: "sent" })
          .eq("id", newQuote.id);

        if (updateError) {
          console.error("Erreur update statut devis:", updateError);
          toast.warning("Email envoyé mais le statut n'a pas pu être mis à jour. Rafraîchissez la page.");
        } else {
          toast.success("Email envoyé et statut mis à jour !");
          queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
        }
      } catch (err) {
        console.error("Erreur envoi email:", err);
        toast.warning(
          "Le devis est créé mais l'email n'a pas pu être envoyé. Veuillez réessayer manuellement via le bouton d'envoi."
        );
      }
    },
    onError: (err) => {
      console.error("Erreur création:", err);
      toast.error("Erreur lors de la création du devis en base de données.");
    },
  });

  // Create invoice from quote
  const createInvoiceFromQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      const quote = quotes?.find(q => q.id === quoteId);
      if (!quote) throw new Error("Devis non trouvé");

      // Vérifier que le devis est dans un état facturable (accepted ou sent)
      const allowedStatuses = ["accepted", "sent", "validated"];
      if (!allowedStatuses.includes(quote.status || "")) {
        throw new Error("Seuls les devis acceptés ou envoyés peuvent être facturés");
      }

      const { data: numberData, error: numberError } = await supabase.rpc("generate_invoice_number");
      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: numberData,
          quote_id: quoteId,
          user_id: quote.user_id,
          client_name: quote.client_name,
          client_email: quote.client_email,
          client_phone: quote.client_phone,
          client_address: quote.client_address,
          activity_title: quote.activity_title,
          activity_duration: quote.activity_duration,
          start_date: quote.start_date,
          end_date: quote.end_date,
          unit_price: quote.unit_price,
          participants: quote.participants,
          subtotal: quote.total_price,
          total_amount: quote.total_price,
          status: "draft",
          payment_status: "pending", // Important : la facture est "À payer"
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast.success("Facture créée à partir du devis");
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création de la facture";
      toast.error(errorMessage);
    },
  });

  // Duplicate quote mutation
  const duplicateQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const quote = quotes?.find(q => q.id === quoteId);
      if (!quote) throw new Error("Devis non trouvé");

      // Generate new quote number
      const { data: numberData, error: numberError } = await supabase.rpc("generate_quote_number");
      if (numberError) throw numberError;

      // Create duplicated quote
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          quote_number: numberData,
          client_name: quote.client_name,
          client_email: quote.client_email,
          client_phone: quote.client_phone,
          client_address: quote.client_address,
          activity_title: quote.activity_title,
          activity_duration: quote.activity_duration,
          start_date: quote.start_date,
          end_date: quote.end_date,
          unit_price: quote.unit_price,
          participants: quote.participants,
          total_price: quote.total_price,
          deposit_amount: quote.deposit_amount,
          deposit_percentage: quote.deposit_percentage,
          payment_option: quote.payment_option,
          valid_until: null, // Reset validity
          notes: quote.notes,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Devis dupliqué : ${data.quote_number}`);
      setDuplicatingQuote(null);

      // Ouvrir automatiquement le dialogue d'édition avec le nouveau devis
      setEditingQuote(data);
      setIsQuoteDialogOpen(true);
    },
    onError: () => {
      toast.error("Erreur lors de la duplication du devis");
      setDuplicatingQuote(null);
    },
  });

  const handleDuplicateQuote = async (quoteId: string) => {
    setDuplicatingQuote(quoteId);
    duplicateQuoteMutation.mutate(quoteId);
  };

  const handleDownloadQuote = (quote: typeof quotes extends (infer T)[] ? T : never) => {
    const quoteData: QuoteData = {
      quote_number: quote.quote_number,
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone || undefined,
      client_address: quote.client_address || undefined,
      activity_title: quote.activity_title,
      activity_duration: quote.activity_duration || undefined,
      start_date: quote.start_date || undefined,
      end_date: quote.end_date || undefined,
      unit_price: Number(quote.unit_price),
      participants: quote.participants,
      total_price: Number(quote.total_price),
      deposit_amount: Number(quote.deposit_amount),
      deposit_percentage: Number(quote.deposit_percentage),
      payment_option: quote.payment_option || "deposit",
      valid_until: quote.valid_until || undefined,
      notes: quote.notes || undefined,
      created_at: quote.created_at,
    };
    downloadQuotePDF(quoteData);
  };

  const handleResendQuoteEmail = async (quote: typeof quotes extends (infer T)[] ? T : never) => {
    setSendingEmail(quote.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-quote-email", {
        body: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          client_name: quote.client_name,
          client_email: quote.client_email,
          activity_title: quote.activity_title,
          activity_duration: quote.activity_duration,
          start_date: quote.start_date,
          end_date: quote.end_date,
          participants: quote.participants,
          unit_price: Number(quote.unit_price),
          total_price: Number(quote.total_price),
          deposit_amount: Number(quote.deposit_amount),
          deposit_percentage: Number(quote.deposit_percentage),
          valid_until: quote.valid_until,
          notes: quote.notes,
          user_id: quote.user_id,
        },
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur réseau");
      }
      
      // Vérifier si la réponse contient une erreur
      if (data?.error) {
        console.error("API returned error:", data.error);
        throw new Error(data.error);
      }
      
      // Mettre à jour le statut
      await supabase
        .from("quotes")
        .update({ status: "sent" })
        .eq("id", quote.id);
        
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Devis envoyé à ${quote.client_email}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Email error:", err);
      toast.error(`Erreur lors de l'envoi de l'email: ${errorMessage}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDownloadInvoice = (invoice: typeof invoices extends (infer T)[] ? T : never) => {
    const invoiceData: InvoiceData = {
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_phone: invoice.client_phone || undefined,
      client_address: invoice.client_address || undefined,
      activity_title: invoice.activity_title,
      activity_duration: invoice.activity_duration || undefined,
      start_date: invoice.start_date || undefined,
      end_date: invoice.end_date || undefined,
      unit_price: Number(invoice.unit_price),
      participants: invoice.participants,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.tax_rate || 0),
      tax_amount: Number(invoice.tax_amount || 0),
      total_amount: Number(invoice.total_amount),
      amount_paid: Number(invoice.amount_paid || 0),
      payment_status: invoice.payment_status || "pending",
      payment_date: invoice.payment_date || undefined,
      payment_method: invoice.payment_method || undefined,
      due_date: invoice.due_date || undefined,
      client_validated: invoice.client_validated || false,
      client_validated_at: invoice.client_validated_at || undefined,
      cgu_accepted: invoice.cgu_accepted || false,
      cgv_accepted: invoice.cgv_accepted || false,
      notes: invoice.notes || undefined,
      created_at: invoice.created_at,
    };
    downloadInvoicePDF(invoiceData);
  };

  const handleSendInvoiceEmail = async (invoice: typeof invoices extends (infer T)[] ? T : never) => {
    setSendingInvoiceEmail(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: invoice.id,
        },
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur réseau");
      }
      
      // Vérifier si la réponse contient une erreur
      if (data?.error) {
        console.error("API returned error:", data.error);
        throw new Error(data.error);
      }
      
      toast.success(`Facture envoyée à ${invoice.client_email}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Invoice email error:", err);
      toast.error(`Erreur lors de l'envoi de l'email: ${errorMessage}`);
    } finally {
      setSendingInvoiceEmail(null);
    }
  };

  const quotePrefillRef = useRef<{ client_name?: string; client_email?: string; client_phone?: string; subject?: string; message?: string; participants?: number; preferred_date?: string; activity_id?: string } | null>(null);

  // Check for prefill data from Inbox on mount
  useEffect(() => {
    const prefillRaw = sessionStorage.getItem("inbox-quote-prefill");
    if (prefillRaw) {
      sessionStorage.removeItem("inbox-quote-prefill");
      try {
        quotePrefillRef.current = JSON.parse(prefillRaw);
      } catch {}
      setIsQuoteDialogOpen(true);
    }
  }, []);

  const QuoteForm = () => {
    const prefill = quotePrefillRef.current;

    const [formData, setFormData] = useState(() => ({
      client_name: prefill?.client_name || "",
      client_email: prefill?.client_email || "",
      client_phone: prefill?.client_phone || "",
      client_address: "",
      activity_title: prefill?.subject || "",
      activity_duration: "",
      start_date: prefill?.preferred_date || "",
      end_date: "",
      unit_price: 0,
      participants: prefill?.participants || 1,
      deposit_percentage: 30,
      payment_option: "deposit",
      valid_until: "",
      notes: prefill?.message ? `Demande initiale : ${prefill.subject || ""}\n${prefill.message}` : "",
    }));

    // Fetch activity details and update form if activity_id was provided
    useEffect(() => {
      if (!prefill?.activity_id) return;
      supabase
        .from("activities")
        .select("title, duration, price_from")
        .eq("id", prefill.activity_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFormData(prev => ({
              ...prev,
              activity_title: data.title || prev.activity_title,
              activity_duration: data.duration || prev.activity_duration,
              unit_price: data.price_from || prev.unit_price,
            }));
          }
        });
    }, []);

    const totalPrice = formData.unit_price * formData.participants;
    const depositAmount = Math.ceil(totalPrice * (formData.deposit_percentage / 100));

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createQuoteMutation.mutate({
        ...formData,
        total_price: totalPrice,
        deposit_amount: depositAmount,
      });
    };

    const fillFromContact = (contact: typeof contactRequests extends (infer T)[] ? T : never) => {
      setFormData(prev => ({
        ...prev,
        client_name: contact.name,
        client_email: contact.email,
        client_phone: contact.phone || "",
      }));
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {contactRequests && contactRequests.length > 0 && (
          <div className="space-y-2">
            <Label>Pré-remplir depuis une demande</Label>
            <Select onValueChange={(id) => {
              const contact = contactRequests.find(c => c.id === id);
              if (contact) fillFromContact(contact);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une demande..." />
              </SelectTrigger>
              <SelectContent>
                {contactRequests.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} - {c.subject || "Sans objet"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Nom du client *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={e => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_email">Email *</Label>
            <Input
              id="client_email"
              type="email"
              value={formData.client_email}
              onChange={e => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_phone">Téléphone</Label>
            <Input
              id="client_phone"
              value={formData.client_phone}
              onChange={e => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_address">Adresse</Label>
            <Input
              id="client_address"
              value={formData.client_address}
              onChange={e => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">Prestation</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_title">Titre de la prestation *</Label>
              <Input
                id="activity_title"
                value={formData.activity_title}
                onChange={e => setFormData(prev => ({ ...prev, activity_title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity_duration">Durée</Label>
              <Input
                id="activity_duration"
                value={formData.activity_duration}
                onChange={e => setFormData(prev => ({ ...prev, activity_duration: e.target.value }))}
                placeholder="ex: 5 jours / 4 nuits"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">Tarification</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Prix unitaire (€) *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                value={formData.unit_price}
                onChange={e => setFormData(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participants">Participants *</Label>
              <Input
                id="participants"
                type="number"
                min="1"
                value={formData.participants}
                onChange={e => setFormData(prev => ({ ...prev, participants: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit_percentage">Acompte (%)</Label>
              <Input
                id="deposit_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.deposit_percentage}
                onChange={e => setFormData(prev => ({ ...prev, deposit_percentage: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{totalPrice.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Acompte ({formData.deposit_percentage}%)</p>
              <p className="text-xl font-bold text-primary">{depositAmount.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Validité du devis</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={e => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={createQuoteMutation.isPending}>
          <FileText className="mr-2 h-4 w-4" />
          {createQuoteMutation.isPending ? "Création..." : "Créer le devis"}
        </Button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quotes">
        <TabsList className="mb-6">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Devis ({quotes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Factures ({invoices?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des devis</CardTitle>
                <CardDescription>Créez et gérez les devis clients</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                >
                  {sendingTestEmail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {sendingTestEmail ? "Envoi..." : "Test Email"}
                </Button>
                <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau devis
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau devis</DialogTitle>
                      <DialogDescription>
                        Remplissez les informations pour générer un devis professionnel.
                      </DialogDescription>
                    </DialogHeader>
                    <QuoteForm />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <p>Chargement...</p>
              ) : quotes && quotes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Devis</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Prestation</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map(quote => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono">{quote.quote_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{quote.client_name}</p>
                            <p className="text-sm text-muted-foreground">{quote.client_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{quote.activity_title}</TableCell>
                        <TableCell className="font-medium">{Number(quote.total_price).toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge className={statusColors[quote.status || "draft"]}>
                            {statusLabels[quote.status || "draft"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleResendQuoteEmail(quote)}
                              disabled={sendingEmail === quote.id}
                              title="Envoyer par email"
                            >
                              {sendingEmail === quote.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDownloadQuote(quote)} title="Télécharger PDF">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDuplicateQuote(quote.id)}
                              disabled={duplicatingQuote === quote.id}
                              title="Dupliquer le devis"
                            >
                              {duplicatingQuote === quote.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => createInvoiceFromQuote.mutate(quote.id)}
                              disabled={createInvoiceFromQuote.isPending}
                              title="Créer une facture"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun devis pour le moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des factures</CardTitle>
              <CardDescription>Suivez les factures et paiements clients</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <p>Chargement...</p>
              ) : invoices && invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Facture</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Prestation</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Validé</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.client_name}</p>
                              <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.activity_title}</TableCell>
                          <TableCell className="font-medium">{Number(invoice.total_amount).toFixed(2)} €</TableCell>
                          <TableCell>
                            <Badge className={statusColors[invoice.payment_status || "pending"]}>
                              {statusLabels[invoice.payment_status || "pending"]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.client_validated ? (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.created_at), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleSendInvoiceEmail(invoice)}
                                disabled={sendingInvoiceEmail === invoice.id}
                                title="Envoyer la facture par email"
                                className="gap-2"
                              >
                                {sendingInvoiceEmail === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Envoyer facture</span>
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(invoice)} title="Télécharger PDF">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune facture pour le moment</p>
                  <p className="text-sm">Créez une facture à partir d'un devis accepté</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
