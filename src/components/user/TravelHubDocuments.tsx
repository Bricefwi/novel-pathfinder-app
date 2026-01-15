import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Check, 
  Euro,
  Upload,
  FolderLock,
  Eye,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { downloadQuotePDF, type QuoteData } from "@/components/pdf/QuotePDFGenerator";
import { downloadInvoicePDF, type InvoiceData } from "@/components/pdf/InvoicePDFGenerator";

interface TravelHubDocumentsProps {
  userId: string;
}

export const TravelHubDocuments = ({ userId }: TravelHubDocumentsProps) => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["user-quotes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("client_email", (await supabase.auth.getUser()).data.user?.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
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
  });

  // Validate invoice mutation
  const validateInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          client_validated: true,
          client_validated_at: new Date().toISOString(),
          cgu_accepted: true,
          cgu_accepted_at: new Date().toISOString(),
          cgv_accepted: true,
          cgv_accepted_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-invoices"] });
      toast.success("Facture validée avec succès");
      setValidationOpen(false);
      resetValidation();
    },
    onError: () => {
      toast.error("Erreur lors de la validation");
    },
  });

  const resetValidation = () => {
    setCguAccepted(false);
    setCgvAccepted(false);
    setSignatureConfirmed(false);
    setSelectedInvoice(null);
  };

  const handleValidate = () => {
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
      client_phone: quote.client_phone || '',
      client_address: quote.client_address || '',
      activity_title: quote.activity_title,
      activity_duration: quote.activity_duration || '',
      start_date: quote.start_date || undefined,
      end_date: quote.end_date || undefined,
      unit_price: quote.unit_price,
      participants: quote.participants,
      total_price: quote.total_price,
      deposit_amount: quote.deposit_amount || 0,
      deposit_percentage: quote.deposit_percentage || 30,
      payment_option: quote.payment_option || 'deposit',
      valid_until: quote.valid_until || undefined,
      notes: quote.notes,
      created_at: quote.created_at,
    };
    downloadQuotePDF(quoteData);
  };

  const handleDownloadInvoice = (invoice: any) => {
    const invoiceData: InvoiceData = {
      invoice_number: invoice.invoice_number,
      quote_number: invoice.quote_id ? undefined : undefined,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_phone: invoice.client_phone || '',
      client_address: invoice.client_address || '',
      activity_title: invoice.activity_title,
      activity_duration: invoice.activity_duration || '',
      start_date: invoice.start_date || undefined,
      end_date: invoice.end_date || undefined,
      unit_price: invoice.unit_price,
      participants: invoice.participants,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate || 0,
      tax_amount: invoice.tax_amount || 0,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid || 0,
      payment_status: invoice.payment_status,
      payment_date: invoice.payment_date || undefined,
      payment_method: invoice.payment_method || undefined,
      due_date: invoice.due_date || undefined,
      client_validated: invoice.client_validated || false,
      client_validated_at: invoice.client_validated_at || undefined,
      cgu_accepted: invoice.cgu_accepted || false,
      cgv_accepted: invoice.cgv_accepted || false,
      notes: invoice.notes,
      created_at: invoice.created_at,
    };
    downloadInvoicePDF(invoiceData);
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
      case 'pending':
      case 'sent':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">À valider</Badge>;
      case 'accepted':
      case 'validated':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Validé</Badge>;
      case 'expired':
        return <Badge className="bg-muted text-muted-foreground">Expiré</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Refusé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentProgress = (invoice: any) => {
    if (!invoice.total_amount) return 0;
    return Math.round(((invoice.amount_paid || 0) / invoice.total_amount) * 100);
  };

  const isLoading = quotesLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Devis ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Factures ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="vault" className="flex items-center gap-2">
            <FolderLock className="h-4 w-4" />
            Coffre-fort
          </TabsTrigger>
        </TabsList>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          {quotes.length === 0 ? (
            <EmptyDocumentsState type="quotes" />
          ) : (
            quotes.map((quote: any) => (
              <Card key={quote.id} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{quote.quote_number}</h4>
                          {getQuoteStatusBadge(quote.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{quote.activity_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary">{quote.total_price}€</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedQuote(quote)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadQuote(quote)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {invoices.length === 0 ? (
            <EmptyDocumentsState type="invoices" />
          ) : (
            invoices.map((invoice: any) => (
              <Card key={invoice.id} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/50 flex items-center justify-center">
                          <Euro className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{invoice.invoice_number}</h4>
                            <Badge className={
                              invoice.payment_status === 'paid' 
                                ? 'bg-green-500/10 text-green-700 border-green-500/30'
                                : invoice.payment_status === 'partial'
                                ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
                                : 'bg-muted text-muted-foreground'
                            }>
                              {invoice.payment_status === 'paid' ? 'Payé' : 
                               invoice.payment_status === 'partial' ? 'Partiel' : 'En attente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.activity_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{invoice.total_amount}€</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.payment_status === 'paid' && !invoice.client_validated && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setValidationOpen(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Payment Progress */}
                    {invoice.payment_status !== 'paid' && (
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">État du règlement</span>
                          <span className="font-medium">
                            {invoice.amount_paid || 0}€ / {invoice.total_amount}€
                          </span>
                        </div>
                        <Progress value={getPaymentProgress(invoice)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Reste à payer : {invoice.total_amount - (invoice.amount_paid || 0)}€
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Digital Vault Tab */}
        <TabsContent value="vault">
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <FolderLock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">Coffre-fort Numérique</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Stockez vos documents importants en toute sécurité : passeports, assurances, certificats médicaux...
                </p>
                <div className="border-2 border-dashed border-border rounded-xl p-8 max-w-md mx-auto hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez vos fichiers ici<br />ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF, JPG, PNG • Max 10MB
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  🔒 Vos documents sont chiffrés et accessibles uniquement par vous
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote Detail Sheet */}
      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedQuote && (
            <>
              <SheetHeader>
                <SheetTitle>Devis {selectedQuote.quote_number}</SheetTitle>
                <SheetDescription>
                  Créé le {format(new Date(selectedQuote.created_at), 'dd MMMM yyyy', { locale: fr })}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Séjour</h4>
                  <p className="text-muted-foreground">{selectedQuote.activity_title}</p>
                  {selectedQuote.start_date && (
                    <p className="text-sm text-muted-foreground">
                      Du {format(new Date(selectedQuote.start_date), 'dd MMM yyyy', { locale: fr })}
                      {selectedQuote.end_date && ` au ${format(new Date(selectedQuote.end_date), 'dd MMM yyyy', { locale: fr })}`}
                    </p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Prix unitaire</span>
                    <span>{selectedQuote.unit_price}€</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Participants</span>
                    <span>{selectedQuote.participants}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{selectedQuote.total_price}€</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleDownloadQuote(selectedQuote)}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                  {(selectedQuote.status === 'pending' || selectedQuote.status === 'sent' || selectedQuote.status === 'draft') && (
                    <Button variant="default" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Accepter & Payer
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la facture</DialogTitle>
            <DialogDescription>
              Pour valider cette facture, veuillez accepter les conditions suivantes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="cgu"
                checked={cguAccepted}
                onCheckedChange={(checked) => setCguAccepted(!!checked)}
              />
              <label htmlFor="cgu" className="text-sm leading-relaxed cursor-pointer">
                J'accepte les <a href="/cgu" className="text-primary underline" target="_blank">Conditions Générales d'Utilisation</a>
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="cgv"
                checked={cgvAccepted}
                onCheckedChange={(checked) => setCgvAccepted(!!checked)}
              />
              <label htmlFor="cgv" className="text-sm leading-relaxed cursor-pointer">
                J'accepte les <a href="/cgv" className="text-primary underline" target="_blank">Conditions Générales de Vente</a>
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="signature"
                checked={signatureConfirmed}
                onCheckedChange={(checked) => setSignatureConfirmed(!!checked)}
              />
              <label htmlFor="signature" className="text-sm leading-relaxed cursor-pointer">
                Je confirme ma signature électronique pour cette facture
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleValidate}
              disabled={!cguAccepted || !cgvAccepted || !signatureConfirmed}
            >
              Valider la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Empty State Component
const EmptyDocumentsState = ({ type }: { type: 'quotes' | 'invoices' }) => (
  <Card className="border-border/50">
    <CardContent className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        {type === 'quotes' ? (
          <FileText className="h-6 w-6 text-muted-foreground" />
        ) : (
          <Euro className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-semibold mb-2">
        {type === 'quotes' ? 'Aucun devis' : 'Aucune facture'}
      </h3>
      <p className="text-muted-foreground text-sm">
        {type === 'quotes' 
          ? 'Vos devis personnalisés apparaîtront ici'
          : 'Vos factures apparaîtront ici après validation de vos réservations'}
      </p>
    </CardContent>
  </Card>
);

export default TravelHubDocuments;
