import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  CreditCard,
  Mail,
  Loader2,
  BookOpen,
  MapPin,
  Utensils,
  Backpack,
  Phone,
  Info,
  Quote,
  Shirt,
  Plane,
  FileCheck,
  Bed,
  Calendar,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { downloadQuotePDF, type QuoteData } from "@/components/pdf/QuotePDFGenerator";
import { downloadInvoicePDF, type InvoiceData } from "@/components/pdf/InvoicePDFGenerator";

// Import centralisé des types Travel Diary
import { 
  TravelDiaryData, 
  LegacyTravelDiary, 
  isNewDiaryFormat, 
  hasDiaryContent 
} from "@/types/travel-diary";

interface TravelHubDocumentsProps {
  userId: string;
}

export const TravelHubDocuments = ({ userId }: TravelHubDocumentsProps) => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedTravelDiary, setSelectedTravelDiary] = useState<{ title: string; diary: TravelDiaryData | LegacyTravelDiary; featuredImage?: string } | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  // Validation devis (CGU/CGV) — étape OBLIGATOIRE avant paiement
  const [quoteCguAccepted, setQuoteCguAccepted] = useState(false);
  const [quoteCgvAccepted, setQuoteCgvAccepted] = useState(false);
  const [quoteSignatureConfirmed, setQuoteSignatureConfirmed] = useState(false);
  const [quoteValidating, setQuoteValidating] = useState(false);
  // État local pour la checklist (non persisté)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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

  // Fetch travel diaries from confirmed bookings/quotes
  const { data: travelDiaries = [], isLoading: diariesLoading } = useQuery({
    queryKey: ["user-travel-diaries", userId],
    queryFn: async () => {
      const userEmail = (await supabase.auth.getUser()).data.user?.email;
      
      // Get accepted quotes with activity_id
      const { data: acceptedQuotes } = await supabase
        .from("quotes")
        .select("activity_id, activity_title")
        .eq("client_email", userEmail)
        .in("status", ["accepted", "validated"]);

      // Get confirmed bookings with activity_id
      const { data: confirmedBookings } = await supabase
        .from("bookings")
        .select("activity_id")
        .eq("user_id", userId)
        .in("status", ["confirmed", "completed"]);

      // Combine unique activity IDs
      const activityIds = new Set<string>();
      acceptedQuotes?.forEach(q => q.activity_id && activityIds.add(q.activity_id));
      confirmedBookings?.forEach(b => b.activity_id && activityIds.add(b.activity_id));

      if (activityIds.size === 0) return [];

      // Fetch activities with travel_diary
      const { data: activities, error } = await supabase
        .from("activities")
        .select("id, title, travel_diary, featured_image")
        .in("id", Array.from(activityIds))
        .not("travel_diary", "is", null);

      if (error) throw error;

      // Filter out activities with empty travel diaries
      return (activities || []).filter(a => {
        const diary = a.travel_diary as TravelDiaryData | LegacyTravelDiary | null;
        if (!diary) return false;
        
        // Check nouvelle structure
        if ('editorial' in diary) {
          return diary.editorial?.title || diary.daily_itinerary?.length > 0 || diary.packing_list?.some(p => p.items.length > 0);
        }
        // Check ancienne structure
        return diary.pourquoi_sejour || diary.itineraire || diary.hebergements;
      });
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

  const handleRequestPaymentLink = async (quote: any) => {
    setPaymentLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-payment-link", {
        body: { quote_id: quote.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("📧 Lien de paiement envoyé par email !", {
        description: `Vérifiez votre boîte mail (${quote.client_email})`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-quotes"] });
      setSelectedQuote(null);
    } catch (err: any) {
      console.error("Payment link error:", err);
      toast.error("Erreur lors de l'envoi du lien de paiement");
    } finally {
      setPaymentLinkLoading(false);
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
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">⏳ Actif – à valider</Badge>;
      case 'accepted':
      case 'validated':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/30">✓ Validé</Badge>;
      case 'paid':
      case 'partial':
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">💳 Payé</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">❌ Annulé – ne plus utiliser</Badge>;
      case 'expired':
        return <Badge className="bg-muted text-muted-foreground">⌛ Expiré</Badge>;
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

  // Toggle checklist item
  const toggleCheckItem = (categoryIdx: number, itemIdx: number) => {
    const key = `${categoryIdx}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Note: isNewDiaryFormat est importé depuis @/types/travel-diary

  const isLoading = quotesLoading || invoicesLoading || diariesLoading;

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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Devis</span> ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Factures</span> ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="carnets" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Carnets</span> ({travelDiaries.length})
          </TabsTrigger>
          <TabsTrigger value="vault" className="flex items-center gap-2">
            <FolderLock className="h-4 w-4" />
            <span className="hidden sm:inline">Coffre-fort</span>
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

        {/* Carnets de Voyage Tab */}
        <TabsContent value="carnets" className="space-y-4">
          {travelDiaries.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2">Carnets de Voyage</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Vos carnets de voyage seront disponibles ici après validation de votre réservation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            travelDiaries.map((activity: any) => (
              <Card key={activity.id} className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {/* Image de couverture */}
                  {activity.featured_image && (
                    <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
                      <img 
                        src={activity.featured_image} 
                        alt={activity.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {!activity.featured_image && (
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-serif font-semibold text-lg">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground">Carnet de voyage interactif</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              Itinéraire
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Shirt className="h-3 w-3 mr-1" />
                              Trousseau
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Info className="h-3 w-3 mr-1" />
                              Pratique
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setSelectedTravelDiary({ 
                            title: activity.title, 
                            diary: activity.travel_diary as TravelDiaryData | LegacyTravelDiary,
                            featuredImage: activity.featured_image
                          });
                          setCheckedItems({}); // Reset checklist
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Consulter
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </div>
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
                {/* Bloc Validation CGU/CGV — obligatoire avant paiement */}
                {selectedQuote.status !== 'cancelled' && selectedQuote.status !== 'expired' && (
                  selectedQuote.cgv_accepted && selectedQuote.cgu_accepted ? (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <Check className="h-5 w-5 text-green-700 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Devis validé (CGU/CGV acceptées)</p>
                          {selectedQuote.cgv_accepted_at && (
                            <p className="text-xs text-green-700/80">
                              Le {format(new Date(selectedQuote.cgv_accepted_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Étape obligatoire avant paiement</p>
                        <p className="text-xs text-yellow-800">Validez les conditions ci-dessous pour pouvoir recevoir votre lien de paiement.</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Checkbox id="q-cgu" checked={quoteCguAccepted} onCheckedChange={(c) => setQuoteCguAccepted(!!c)} />
                        <label htmlFor="q-cgu" className="text-sm leading-relaxed cursor-pointer">
                          J'accepte les <a href="/cgu" className="text-primary underline" target="_blank" rel="noreferrer">Conditions Générales d'Utilisation</a>
                        </label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Checkbox id="q-cgv" checked={quoteCgvAccepted} onCheckedChange={(c) => setQuoteCgvAccepted(!!c)} />
                        <label htmlFor="q-cgv" className="text-sm leading-relaxed cursor-pointer">
                          J'accepte les <a href="/cgv" className="text-primary underline" target="_blank" rel="noreferrer">Conditions Générales de Vente</a>
                        </label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Checkbox id="q-sign" checked={quoteSignatureConfirmed} onCheckedChange={(c) => setQuoteSignatureConfirmed(!!c)} />
                        <label htmlFor="q-sign" className="text-sm leading-relaxed cursor-pointer">
                          Je confirme ma signature électronique de ce devis
                        </label>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!quoteCguAccepted || !quoteCgvAccepted || !quoteSignatureConfirmed || quoteValidating}
                        onClick={() => handleValidateQuote(selectedQuote)}
                      >
                        {quoteValidating ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validation...</>
                        ) : (
                          <><Check className="h-4 w-4 mr-2" /> Valider mon devis</>
                        )}
                      </Button>
                    </div>
                  )
                )}

                <div className="flex gap-3">
                  <Button className="flex-1" variant="outline" onClick={() => handleDownloadQuote(selectedQuote)}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                  {(selectedQuote.status === 'pending' || selectedQuote.status === 'sent' || selectedQuote.status === 'draft') && (
                    <Button 
                      variant="default" 
                      className="flex-1"
                      disabled={paymentLinkLoading || !selectedQuote.cgv_accepted || !selectedQuote.cgu_accepted}
                      onClick={() => handleRequestPaymentLink(selectedQuote)}
                      title={!selectedQuote.cgv_accepted ? "Validez d'abord les CGV ci-dessus" : ""}
                    >
                      {paymentLinkLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      {paymentLinkLoading ? "Envoi en cours..." : "Recevoir le lien de paiement"}
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

      {/* Travel Diary Sheet - Nouveau design magazine */}
      <Sheet open={!!selectedTravelDiary} onOpenChange={() => setSelectedTravelDiary(null)}>
        <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
          {selectedTravelDiary && (
            <ScrollArea className="h-full">
              {/* Hero Header avec image */}
              <div className="relative h-48 sm:h-64">
                {selectedTravelDiary.featuredImage ? (
                  <img 
                    src={selectedTravelDiary.featuredImage}
                    alt={selectedTravelDiary.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <Badge className="mb-2 bg-primary/90">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Carnet de Voyage
                  </Badge>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                    {selectedTravelDiary.title}
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {isNewDiaryFormat(selectedTravelDiary.diary) ? (
                  /* NOUVEAU FORMAT */
                  <>
                    {/* Le Mot de l'Organisatrice */}
                    {selectedTravelDiary.diary.editorial.organizer_word && (
                      <Card className="border-l-4 border-l-primary bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Quote className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                            <div>
                              <p className="font-serif italic text-foreground leading-relaxed">
                                "{selectedTravelDiary.diary.editorial.organizer_word}"
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">— Votre organisatrice</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Editorial Content */}
                    {selectedTravelDiary.diary.editorial.content && (
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
                          <Info className="h-5 w-5 text-primary" />
                          {selectedTravelDiary.diary.editorial.title || "L'Esprit du Voyage"}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {selectedTravelDiary.diary.editorial.content}
                        </p>
                      </div>
                    )}

                    {/* Itinéraire Timeline */}
                    {selectedTravelDiary.diary.daily_itinerary.length > 0 && (
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          Votre Itinéraire
                        </h3>
                        <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
                          {selectedTravelDiary.diary.daily_itinerary.map((day, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary border-4 border-background" />
                              <Card className="bg-card/50">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono">J{day.day_number}</Badge>
                                    <h4 className="font-semibold">{day.title}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">{day.description}</p>
                                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    {day.accommodation && (
                                      <span className="flex items-center gap-1">
                                        <Bed className="h-3 w-3" /> {day.accommodation}
                                      </span>
                                    )}
                                    {day.meals && (
                                      <span className="flex items-center gap-1">
                                        <Utensils className="h-3 w-3" /> {day.meals}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trousseau Checklist Interactive */}
                    {selectedTravelDiary.diary.packing_list.some(p => p.items.length > 0) && (
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                          <Backpack className="h-5 w-5 text-primary" />
                          Votre Trousseau
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Checklist interactive
                          </Badge>
                        </h3>
                        <Accordion type="multiple" className="space-y-2">
                          {selectedTravelDiary.diary.packing_list.map((category, catIdx) => {
                            if (category.items.length === 0) return null;
                            const checkedCount = category.items.filter((_, itemIdx) => 
                              checkedItems[`${catIdx}-${itemIdx}`]
                            ).length;
                            
                            return (
                              <AccordionItem key={catIdx} value={`cat-${catIdx}`} className="border rounded-lg">
                                <AccordionTrigger className="px-4 hover:no-underline">
                                  <div className="flex items-center gap-3 flex-1">
                                    <Shirt className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{category.category}</span>
                                    <Badge variant="outline" className="ml-auto mr-2">
                                      {checkedCount}/{category.items.length}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="space-y-2">
                                    {category.items.map((item, itemIdx) => {
                                      const isChecked = checkedItems[`${catIdx}-${itemIdx}`];
                                      return (
                                        <div 
                                          key={itemIdx}
                                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                            isChecked ? 'bg-primary/10' : 'hover:bg-muted/50'
                                          }`}
                                          onClick={() => toggleCheckItem(catIdx, itemIdx)}
                                        >
                                          <Checkbox 
                                            checked={isChecked}
                                            onCheckedChange={() => toggleCheckItem(catIdx, itemIdx)}
                                          />
                                          <span className={isChecked ? 'line-through text-muted-foreground' : ''}>
                                            {item}
                                          </span>
                                          {isChecked && (
                                            <Check className="h-4 w-4 text-primary ml-auto" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    )}

                    {/* Infos Pratiques */}
                    {(selectedTravelDiary.diary.practical_info.meeting_point || 
                      selectedTravelDiary.diary.practical_info.flights_info || 
                      selectedTravelDiary.diary.practical_info.required_documents) && (
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-primary" />
                          Informations Pratiques
                        </h3>
                        <div className="grid gap-4">
                          {selectedTravelDiary.diary.practical_info.meeting_point && (
                            <Card className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-medium mb-1">Point de Rendez-vous</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {selectedTravelDiary.diary.practical_info.meeting_point}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {selectedTravelDiary.diary.practical_info.flights_info && (
                            <Card className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Plane className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-medium mb-1">Vols & Transport</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {selectedTravelDiary.diary.practical_info.flights_info}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {selectedTravelDiary.diary.practical_info.required_documents && (
                            <Card className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-medium mb-1">Documents Requis</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {selectedTravelDiary.diary.practical_info.required_documents}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ANCIEN FORMAT (Legacy) */
                  <>
                    {selectedTravelDiary.diary.pourquoi_sejour && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Pourquoi ce séjour ?
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.pourquoi_sejour}
                        </p>
                      </div>
                    )}
                    {selectedTravelDiary.diary.itineraire && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Itinéraire
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.itineraire}
                        </p>
                      </div>
                    )}
                    {selectedTravelDiary.diary.hebergements && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Bed className="h-4 w-4 text-primary" />
                          Hébergements
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.hebergements}
                        </p>
                      </div>
                    )}
                    {selectedTravelDiary.diary.equipement && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Backpack className="h-4 w-4 text-primary" />
                          Équipement
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.equipement}
                        </p>
                      </div>
                    )}
                    {selectedTravelDiary.diary.infos_pratiques && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          Infos pratiques
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.infos_pratiques}
                        </p>
                      </div>
                    )}
                    {selectedTravelDiary.diary.contacts && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          Contacts
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedTravelDiary.diary.contacts}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
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