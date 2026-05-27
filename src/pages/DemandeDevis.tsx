import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Send, Users, MapPin, Calendar, Heart, CreditCard, Clock, Percent, Euro, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

const devisSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: z.string()
    .trim()
    .email("Adresse email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  phone: z.string()
    .trim()
    .max(20, "Le téléphone ne peut pas dépasser 20 caractères")
    .regex(/^[\d\s\+\-\(\)]*$/, "Format de téléphone invalide")
    .optional()
    .or(z.literal("")),
  
  // Séjour sélectionné
  selectedSejour: z.string().min(1, "Veuillez sélectionner un séjour"),
  selectedSlot: z.string().optional().or(z.literal("")),
  
  // Participants
  adultsCount: z.number().min(1, "Au moins 1 adulte requis").max(20, "Maximum 20 adultes"),
  childrenCount: z.number().min(0).max(10, "Maximum 10 enfants"),
  childrenAges: z.string().max(100).optional().or(z.literal("")),
  
  // Niveau équestre - now has default, make it optional with default
  ridingLevel: z.string().min(1, "Veuillez indiquer votre niveau équestre").max(50).default("intermediaire"),
  ridingExperience: z.string().max(1000).optional().or(z.literal("")),
  hoursPerWeek: z.string().max(100).optional().or(z.literal("")),
  
  // Condition physique
  fitnessLevel: z.string().max(50).optional().or(z.literal("")),
  healthNotes: z.string().max(500).optional().or(z.literal("")),
  
  // Paiement
  paymentOption: z.enum(["deposit", "full", "installments"]).default("deposit"),
  
  // Attentes
  expectations: z.string().max(2000).optional().or(z.literal("")),
  howDidYouHear: z.string().max(200).optional().or(z.literal("")),
  newsletter: z.boolean().optional().default(false),
});

type DevisForm = z.infer<typeof devisSchema>;

// Séjours statiques (utilisés si pas de données en BDD)
const staticSejours = [
  { 
    id: "bretagne-romantique", 
    title: "Bretagne Romantique", 
    price: 890, 
    duration: "5 jours / 4 nuits",
    location: "Bretagne",
    description: "Entre terre et mer, découvrez la Bretagne à cheval"
  },
  { 
    id: "bretagne-terre-mer", 
    title: "Bretagne Terre & Mer", 
    price: 1190, 
    duration: "7 jours / 6 nuits",
    location: "Bretagne",
    description: "La grande traversée bretonne"
  },
  { 
    id: "maroc-desert", 
    title: "Maroc - Désert & Dunes", 
    price: 1490, 
    duration: "8 jours / 7 nuits",
    location: "Maroc",
    description: "Aventure équestre dans le désert marocain"
  },
  { 
    id: "maroc-essaouira", 
    title: "Maroc - Essaouira & Côte", 
    price: 1290, 
    duration: "7 jours / 6 nuits",
    location: "Maroc",
    description: "Randonnée côtière au Maroc"
  },
  { 
    id: "hebergement-yourte", 
    title: "Hébergement Yourte An Arwen", 
    price: 85, 
    duration: "par nuit",
    location: "Bretagne",
    description: "Nuit insolite en yourte traditionnelle"
  },
];

// Dates disponibles statiques (utilisées si pas de slots en BDD)
const staticDates: { id: string; label: string; startDate: string; endDate: string; available: boolean; price?: number }[] = [
  { id: "avril-2025", label: "12-16 Avril 2025", startDate: "2025-04-12", endDate: "2025-04-16", available: true },
  { id: "mai-2025", label: "3-9 Mai 2025", startDate: "2025-05-03", endDate: "2025-05-09", available: true },
  { id: "juin-2025", label: "14-20 Juin 2025", startDate: "2025-06-14", endDate: "2025-06-20", available: true },
  { id: "juillet-2025", label: "5-11 Juillet 2025", startDate: "2025-07-05", endDate: "2025-07-11", available: false },
  { id: "aout-2025", label: "16-22 Août 2025", startDate: "2025-08-16", endDate: "2025-08-22", available: true },
];

const ridingLevels = [
  { value: "debutant", label: "Débutant - Jamais ou très peu monté" },
  { value: "initie", label: "Initié - Bases acquises (pas, trot)" },
  { value: "intermediaire", label: "Intermédiaire - À l'aise aux 3 allures" },
  { value: "confirme", label: "Confirmé - Pratique régulière" },
  { value: "expert", label: "Expert - Compétition / professionnel" },
];

const fitnessLevels = [
  { value: "sedentaire", label: "Sédentaire - Peu d'activité physique" },
  { value: "modere", label: "Modéré - Activité occasionnelle" },
  { value: "actif", label: "Actif - Sport régulier" },
  { value: "sportif", label: "Sportif - Entraînement intensif" },
];

const DemandeDevis = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialPrefillDone, setInitialPrefillDone] = useState(false);
  const [form, setForm] = useState<Partial<DevisForm>>({
    name: "",
    email: "",
    phone: "",
    selectedSejour: "",
    selectedSlot: "",
    adultsCount: 1,
    childrenCount: 0,
    ridingLevel: "intermediaire",
    newsletter: false,
    paymentOption: "deposit",
  });

  // Fetch activities from database
  const { data: dbActivities } = useQuery({
    queryKey: ["activities-for-booking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, price_from, price_to, duration, location, short_description, activity_type")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch activity slots from database
  const { data: dbSlots } = useQuery({
    queryKey: ["activity-slots", form.selectedSejour],
    queryFn: async () => {
      if (!form.selectedSejour) return [];
      const { data, error } = await supabase
        .from("activity_slots")
        .select("*")
        .eq("activity_id", form.selectedSejour)
        .eq("is_available", true)
        .gte("start_date", new Date().toISOString())
        .order("start_date");
      if (error) throw error;
      return data;
    },
    enabled: !!form.selectedSejour && !staticSejours.find(s => s.id === form.selectedSejour),
  });

  // Use DB activities if available, otherwise use static
  const sejours = dbActivities && dbActivities.length > 0 
    ? dbActivities.map(a => ({
        id: a.id,
        title: a.title,
        price: a.price_from || 0,
        duration: a.duration || "",
        location: a.location || "",
        description: a.short_description || "",
      }))
    : staticSejours;

  // Use DB slots if available, otherwise use static dates
  const availableSlots = dbSlots && dbSlots.length > 0
    ? dbSlots.map(s => ({
        id: s.id,
        label: `${format(new Date(s.start_date), "d MMM", { locale: fr })} - ${format(new Date(s.end_date), "d MMM yyyy", { locale: fr })}`,
        startDate: s.start_date,
        endDate: s.end_date,
        available: s.is_available && (s.max_participants ? (s.current_participants || 0) < s.max_participants : true),
        price: s.price,
      }))
    : staticDates;

  const selectedSejourDetails = sejours.find(s => s.id === form.selectedSejour);
  const selectedSlotDetails = availableSlots.find(s => s.id === form.selectedSlot);
  
  // Calculate price
  const basePrice = selectedSlotDetails?.price || selectedSejourDetails?.price || 0;
  const totalParticipants = (form.adultsCount || 1) + (form.childrenCount || 0);
  const totalPrice = basePrice * totalParticipants;
  const depositAmount = Math.ceil(totalPrice * 0.3); // 30% deposit

  // Pre-fill from URL params ONCE when activities are loaded
  useEffect(() => {
    if (initialPrefillDone || sejours.length === 0) return;

    const sejourParam = searchParams.get("sejour");
    const activityIdParam = searchParams.get("activityId");
    const participantsParam = searchParams.get("participants");
    const slotParam = searchParams.get("slot");

    const updates: Partial<DevisForm> = {};

    // Match by activity ID first, then by title
    if (activityIdParam) {
      const matchById = sejours.find(s => s.id === activityIdParam);
      if (matchById) {
        updates.selectedSejour = matchById.id;
      }
    } else if (sejourParam) {
      const sejourLower = sejourParam.toLowerCase();
      const matchingSejour = sejours.find(s => 
        s.title.toLowerCase().includes(sejourLower) ||
        sejourLower.includes(s.title.toLowerCase().split(" ")[0])
      );
      if (matchingSejour) {
        updates.selectedSejour = matchingSejour.id;
      }
    }

    // Pre-fill participants
    if (participantsParam) {
      const count = parseInt(participantsParam, 10);
      if (!isNaN(count) && count >= 1) {
        updates.adultsCount = count;
      }
    }

    // Pre-fill slot
    if (slotParam) {
      updates.selectedSlot = slotParam;
    }

    if (Object.keys(updates).length > 0) {
      setForm(prev => ({ ...prev, ...updates }));
    }
    setInitialPrefillDone(true);
  }, [searchParams, sejours, initialPrefillDone]);

  const updateField = <K extends keyof DevisForm>(field: K, value: DevisForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = devisSchema.safeParse(form);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // 🛡️ Détection doublons : check si une demande récente existe pour cet email + ce séjour
    try {
      const sejourTitle = selectedSejourDetails?.title || form.selectedSejour;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingRequests } = await supabase
        .from("contact_requests")
        .select("id, created_at, subject")
        .eq("email", result.data.email.trim().toLowerCase())
        .eq("is_archived", false)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      const duplicate = existingRequests?.find((r) =>
        r.subject?.toLowerCase().includes((sejourTitle || "__none__").toLowerCase())
      );

      if (duplicate) {
        const daysAgo = Math.floor(
          (Date.now() - new Date(duplicate.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const dayLabel = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? "hier" : `il y a ${daysAgo} jours`;
        const confirmed = window.confirm(
          `⚠️ Vous avez déjà envoyé une demande pour ce séjour ${dayLabel}.\n\n` +
          `Pour éviter un doublon, nous vous recommandons de :\n` +
          `1. Vérifier vos emails (y compris vos courriers indésirables)\n` +
          `2. Nous contacter au 06 59 22 62 70 si vous n'avez rien reçu\n\n` +
          `Voulez-vous tout de même envoyer cette nouvelle demande ?`
        );
        if (!confirmed) return;
      }
    } catch (dupErr) {
      console.warn("[DemandeDevis] Vérification doublon échouée:", dupErr);
    }

    setLoading(true);

    const paymentLabel = form.paymentOption === "deposit" 
      ? `Acompte 30% (${depositAmount}€)` 
      : form.paymentOption === "full" 
        ? `Paiement comptant (${totalPrice}€)` 
        : `Paiement en 3 fois (3x${Math.ceil(totalPrice / 3)}€)`;

    const detailedMessage = `
🎯 SÉJOUR SÉLECTIONNÉ
- Séjour : ${selectedSejourDetails?.title || form.selectedSejour}
- Durée : ${selectedSejourDetails?.duration || "Non précisé"}
- Date : ${selectedSlotDetails?.label || "À définir"}
- Prix unitaire : ${basePrice}€

👥 PARTICIPANTS
- Adultes : ${form.adultsCount}
- Enfants : ${form.childrenCount}
${form.childrenAges ? `- Âges des enfants : ${form.childrenAges}` : ""}

💰 PAIEMENT
- Total : ${totalPrice}€
- Option choisie : ${paymentLabel}

🐴 NIVEAU ÉQUESTRE
- Niveau : ${form.ridingLevel}
- Expérience : ${form.ridingExperience || "Non précisé"}
- Pratique actuelle : ${form.hoursPerWeek || "Non précisé"}

💪 CONDITION PHYSIQUE
- Niveau forme : ${form.fitnessLevel || "Non précisé"}
${form.healthNotes ? `- Remarques santé : ${form.healthNotes}` : ""}

💬 ATTENTES
${form.expectations ? `- Attentes : ${form.expectations}` : ""}
${form.howDidYouHear ? `- Comment nous avez-vous connu : ${form.howDidYouHear}` : ""}
- Newsletter : ${form.newsletter ? "Oui" : "Non"}
    `.trim();

    const validatedForm = result.data;
    const { error } = await supabase.from("contact_requests").insert([{
      name: validatedForm.name,
      email: validatedForm.email,
      phone: validatedForm.phone || null,
      subject: `Réservation - ${selectedSejourDetails?.title || validatedForm.selectedSejour} - ${paymentLabel}`,
      message: detailedMessage,
      participants: totalParticipants,
    }]);

    if (error) {
      setLoading(false);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }

    try {
      await supabase.functions.invoke("notify-admin", {
        body: {
          type: "reservation",
          data: {
            name: validatedForm.name,
            email: validatedForm.email,
            phone: validatedForm.phone,
            subject: `Réservation - ${selectedSejourDetails?.title} - ${paymentLabel}`,
            message: detailedMessage,
            participants: totalParticipants,
            totalPrice,
            depositAmount,
            paymentOption: validatedForm.paymentOption,
          },
        },
      });
    } catch (emailError) {
      console.error("Error sending notification email:", emailError);
    }

    setLoading(false);
    toast.success("Demande de réservation envoyée ! Vous recevrez un lien de paiement sous 24h.");
    setForm({ adultsCount: 1, childrenCount: 0, newsletter: false, paymentOption: "deposit" });
  };

  return (
    <Layout>
      <SEOHead {...seoConfigs.devis} />
      
      {/* Header */}
      <section className="pt-32 pb-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary font-medium mb-4">Réservation en ligne</span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
            Réservez votre aventure
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Sélectionnez votre séjour, vos dates et procédez au paiement sécurisé.
          </p>
          
          {/* Payment options badges */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 bg-background">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Paiement sécurisé</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 bg-background">
              <Percent className="h-4 w-4 text-primary" />
              <span>Acompte 30% pour réserver</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 bg-background">
              <Clock className="h-4 w-4 text-primary" />
              <span>Paiement en 3 fois sans frais</span>
            </Badge>
          </div>
        </div>
      </section>

      {/* Reservation Form */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Séjour Selection */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Choisissez votre séjour
                </CardTitle>
                <CardDescription>Hébergement et repas inclus dans le prix</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={form.selectedSejour}
                  onValueChange={(v) => {
                    updateField("selectedSejour", v);
                    updateField("selectedSlot", ""); // Reset slot when sejour changes
                  }}
                  className="grid gap-4"
                >
                  {sejours.map((sejour) => (
                    <div key={sejour.id} className="relative">
                      <RadioGroupItem
                        value={sejour.id}
                        id={sejour.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={sejour.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{sejour.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {sejour.location} • {sejour.duration}
                          </div>
                          {sejour.description && (
                            <div className="text-xs text-muted-foreground mt-1">{sejour.description}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-primary text-lg">{sejour.price}€</div>
                          <div className="text-xs text-muted-foreground">/personne</div>
                        </div>
                      </Label>
                      {form.selectedSejour === sejour.id && (
                        <Check className="absolute top-4 right-4 h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Dates Selection */}
            {form.selectedSejour && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Dates disponibles
                  </CardTitle>
                  <CardDescription>Sélectionnez votre créneau préféré</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={form.selectedSlot}
                    onValueChange={(v) => updateField("selectedSlot", v)}
                    className="grid sm:grid-cols-2 md:grid-cols-3 gap-3"
                  >
                    {availableSlots.map((slot) => (
                      <div key={slot.id} className="relative">
                        <RadioGroupItem
                          value={slot.id}
                          id={slot.id}
                          className="peer sr-only"
                          disabled={!slot.available}
                        />
                        <Label
                          htmlFor={slot.id}
                          className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all text-center
                            ${slot.available 
                              ? "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5" 
                              : "opacity-50 cursor-not-allowed bg-muted/30"
                            }`}
                        >
                          <span className="font-medium text-sm">{slot.label}</span>
                          {!slot.available && (
                            <Badge variant="secondary" className="mt-1 text-xs">Complet</Badge>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground mt-4">
                    Autre date souhaitée ? Précisez-la dans le champ "Attentes" ci-dessous.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="adultsCount">Nombre d'adultes *</Label>
                  <Input
                    id="adultsCount"
                    type="number"
                    min={1}
                    max={20}
                    value={form.adultsCount || 1}
                    onChange={(e) => updateField("adultsCount", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="childrenCount">Nombre d'enfants</Label>
                  <Input
                    id="childrenCount"
                    type="number"
                    min={0}
                    max={10}
                    value={form.childrenCount || 0}
                    onChange={(e) => updateField("childrenCount", parseInt(e.target.value) || 0)}
                  />
                </div>
                {(form.childrenCount ?? 0) > 0 && (
                  <div>
                    <Label htmlFor="childrenAges">Âges des enfants</Label>
                    <Input
                      id="childrenAges"
                      placeholder="Ex: 8 ans, 12 ans"
                      value={form.childrenAges || ""}
                      onChange={(e) => updateField("childrenAges", e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Options */}
            {selectedSejourDetails && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Récapitulatif & Paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Summary */}
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{selectedSejourDetails.title}</span>
                      <span>{basePrice}€ × {totalParticipants} pers.</span>
                    </div>
                    {selectedSlotDetails && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Dates</span>
                        <span>{selectedSlotDetails.label}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">{totalPrice}€</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div>
                    <Label className="text-base font-medium mb-4 block">Choisissez votre mode de paiement</Label>
                    <RadioGroup
                      value={form.paymentOption}
                      onValueChange={(v) => updateField("paymentOption", v as "deposit" | "full" | "installments")}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="deposit" id="deposit" />
                        <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Acompte 30%</span>
                              <p className="text-sm text-muted-foreground">Réservez maintenant, payez le solde avant le départ</p>
                            </div>
                            <span className="font-bold text-primary">{depositAmount}€</span>
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Paiement comptant</span>
                              <p className="text-sm text-muted-foreground">Réglez la totalité maintenant</p>
                            </div>
                            <span className="font-bold text-primary">{totalPrice}€</span>
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="installments" id="installments" />
                        <Label htmlFor="installments" className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Paiement en 3 fois</span>
                              <p className="text-sm text-muted-foreground">Sans frais, par carte bancaire</p>
                            </div>
                            <span className="font-bold text-primary">3 × {Math.ceil(totalPrice / 3)}€</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Vos coordonnées
                </CardTitle>
                <CardDescription>Pour vous envoyer le lien de paiement sécurisé</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={form.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Riding Level */}
            <Card>
              <CardHeader>
                <CardTitle>🐴 Niveau équestre</CardTitle>
                <CardDescription>Aidez-nous à adapter le séjour à votre expérience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Niveau équestre *</Label>
                    <Select value={form.ridingLevel} onValueChange={(v) => updateField("ridingLevel", v)}>
                      <SelectTrigger><SelectValue placeholder="Choisir votre niveau..." /></SelectTrigger>
                      <SelectContent>
                        {ridingLevels.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hoursPerWeek">Pratique actuelle</Label>
                    <Input
                      id="hoursPerWeek"
                      placeholder="Ex: 2h/semaine, occasionnel..."
                      value={form.hoursPerWeek || ""}
                      onChange={(e) => updateField("hoursPerWeek", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ridingExperience">Expérience équestre (optionnel)</Label>
                  <Textarea
                    id="ridingExperience"
                    placeholder="Décrivez votre parcours : années de pratique, disciplines, randonnées déjà réalisées..."
                    rows={3}
                    value={form.ridingExperience || ""}
                    onChange={(e) => updateField("ridingExperience", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fitness */}
            <Card>
              <CardHeader>
                <CardTitle>💪 Condition physique</CardTitle>
                <CardDescription>Pour adapter l'intensité du séjour</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Niveau de forme physique</Label>
                  <Select value={form.fitnessLevel} onValueChange={(v) => updateField("fitnessLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {fitnessLevels.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="healthNotes">Remarques santé (confidentiel)</Label>
                  <Input
                    id="healthNotes"
                    placeholder="Allergies, limitations physiques..."
                    value={form.healthNotes || ""}
                    onChange={(e) => updateField("healthNotes", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Expectations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Vos attentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="expectations">Décrivez vos attentes, envies ou dates alternatives</Label>
                  <Textarea
                    id="expectations"
                    placeholder="Ce que vous rêvez de vivre, vos motivations, dates alternatives souhaitées..."
                    rows={4}
                    value={form.expectations || ""}
                    onChange={(e) => updateField("expectations", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="howDidYouHear">Comment nous avez-vous connu ?</Label>
                  <Input
                    id="howDidYouHear"
                    placeholder="Ex: Instagram, bouche à oreille..."
                    value={form.howDidYouHear || ""}
                    onChange={(e) => updateField("howDidYouHear", e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newsletter"
                    checked={form.newsletter || false}
                    onCheckedChange={(checked) => updateField("newsletter", !!checked)}
                  />
                  <Label htmlFor="newsletter" className="text-sm text-muted-foreground cursor-pointer">
                    Je souhaite recevoir les actualités et offres spéciales d'An Arwen
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="text-center">
              <Button type="submit" size="lg" disabled={loading || !form.selectedSejour} className="px-12">
                <Send className="mr-2 h-5 w-5" />
                {loading ? "Envoi en cours..." : "Confirmer ma réservation"}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Vous recevrez un lien de paiement sécurisé par email sous 24h.
              </p>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default DemandeDevis;
