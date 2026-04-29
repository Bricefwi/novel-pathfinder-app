import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Receipt, Download, CheckCircle, Clock, AlertCircle, Shield, PenTool } from "lucide-react";
import { downloadQuotePDF, type QuoteData } from "@/components/pdf/QuotePDFGenerator";
import { downloadInvoicePDF, type InvoiceData } from "@/components/pdf/InvoicePDFGenerator";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
  sent: "✓ Actif – Envoyé",
  accepted: "✓ Accepté",
  rejected: "Refusé",
  expired: "⌛ Expiré",
  pending: "⏳ En attente",
  partial: "💳 Partiellement payé",
  paid: "💳 Payé",
  cancelled: "❌ Annulé",
};

interface UserDocumentsProps {
  userId: string;
}

export const UserDocuments = ({ userId }: UserDocumentsProps) => {
  const queryClient = useQueryClient();
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  // Fetch user quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["user-quotes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["user-invoices", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Mutation for validating invoice
  const validateInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          client_validated: true,
          client_validated_at: new Date().toISOString(),
          cgu_accepted: true,
          cgu_accepted_at: new Date().toISOString(),
          cgv_accepted: true,
          cgv_accepted_at: new Date().toISOString(),
          client_signature: `Signature électronique - ${new Date().toISOString()}`,
        })
        .eq("id", invoiceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-invoices", userId] });
      toast.success("Facture validée avec succès !");
      setValidationDialogOpen(false);
      resetValidationForm();
    },
    onError: () => {
      toast.error("Erreur lors de la validation de la facture");
    },
  });

  const resetValidationForm = () => {
    setCguAccepted(false);
    setCgvAccepted(false);
    setSignatureConfirmed(false);
    setSelectedInvoice(null);
  };

  const openValidationDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setValidationDialogOpen(true);
  };

  const handleValidateInvoice = () => {
    if (!cguAccepted || !cgvAccepted || !signatureConfirmed) {
      toast.error("Veuillez accepter toutes les conditions");
      return;
    }
    if (selectedInvoice) {
      validateInvoiceMutation.mutate(selectedInvoice.id);
    }
  };

  const handleDownloadQuote = (quote: any) => {
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

  const handleDownloadInvoice = (invoice: any) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
      case "draft":
      case "sent":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Mes Documents
        </CardTitle>
        <CardDescription>
          Consultez et téléchargez vos devis et factures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quotes">
          <TabsList className="mb-4">
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Devis ({quotes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Factures ({invoices?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="space-y-4">
            {quotesLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : quotes && quotes.length > 0 ? (
              quotes.map(quote => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(quote.status || "draft")}
                    <div>
                      <p className="font-medium">Devis {quote.quote_number}</p>
                      <p className="text-sm text-muted-foreground">{quote.activity_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{Number(quote.total_price).toFixed(2)} €</p>
                      <Badge className={statusColors[quote.status || "draft"]}>
                        {statusLabels[quote.status || "draft"]}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadQuote(quote)}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun devis pour le moment</p>
                <p className="text-sm">Vos devis apparaîtront ici après une demande de réservation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {invoicesLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : invoices && invoices.length > 0 ? (
              invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(invoice.payment_status || "pending")}
                    <div>
                      <p className="font-medium">Facture {invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{invoice.activity_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(invoice.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                      {invoice.client_validated && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          Validée le {format(new Date(invoice.client_validated_at!), "d/MM/yyyy", { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{Number(invoice.total_amount).toFixed(2)} €</p>
                      {Number(invoice.amount_paid) > 0 && Number(invoice.amount_paid) < Number(invoice.total_amount) && (
                        <p className="text-xs text-muted-foreground">
                          Reste: {(Number(invoice.total_amount) - Number(invoice.amount_paid)).toFixed(2)} €
                        </p>
                      )}
                      <Badge className={statusColors[invoice.payment_status || "pending"]}>
                        {statusLabels[invoice.payment_status || "pending"]}
                      </Badge>
                    </div>
                    {!invoice.client_validated && invoice.payment_status === "paid" && (
                      <Button variant="default" size="sm" onClick={() => openValidationDialog(invoice)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Valider
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune facture pour le moment</p>
                <p className="text-sm">Vos factures apparaîtront ici après confirmation de réservation</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Valider la facture
            </DialogTitle>
            <DialogDescription>
              Pour valider votre facture, veuillez accepter les conditions générales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox id="cgu" checked={cguAccepted} onCheckedChange={(checked) => setCguAccepted(!!checked)} />
              <Label htmlFor="cgu" className="text-sm leading-relaxed">
                J'accepte les <Link to="/cgu" target="_blank" className="text-primary underline">Conditions Générales d'Utilisation</Link>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox id="cgv" checked={cgvAccepted} onCheckedChange={(checked) => setCgvAccepted(!!checked)} />
              <Label htmlFor="cgv" className="text-sm leading-relaxed">
                J'accepte les <Link to="/cgv" target="_blank" className="text-primary underline">Conditions Générales de Vente</Link>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox id="signature" checked={signatureConfirmed} onCheckedChange={(checked) => setSignatureConfirmed(!!checked)} />
              <Label htmlFor="signature" className="text-sm leading-relaxed flex items-center gap-1">
                <PenTool className="h-4 w-4" />
                Je confirme ma signature électronique
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleValidateInvoice} 
              disabled={!cguAccepted || !cgvAccepted || !signatureConfirmed || validateInvoiceMutation.isPending}
            >
              {validateInvoiceMutation.isPending ? "Validation..." : "Valider la facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
