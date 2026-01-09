import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Users, MapPin, Calendar, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const devisSchema = z.object({
  name: z.string().min(2, "Nom requis").max(100),
  email: z.string().email("Email invalide").max(255),
  phone: z.string().max(20).optional(),
  
  // Destination & Type
  destination: z.string().min(1, "Destination requise"),
  activityType: z.string().min(1, "Type d'activité requis"),
  
  // Dates
  preferredPeriod: z.string().optional(),
  flexibility: z.string().optional(),
  duration: z.string().optional(),
  
  // Participants
  adultsCount: z.number().min(1).max(20),
  childrenCount: z.number().min(0).max(10),
  childrenAges: z.string().optional(),
  
  // Niveau équestre
  ridingLevel: z.string().min(1, "Niveau requis"),
  ridingExperience: z.string().optional(),
  hoursPerWeek: z.string().optional(),
  
  // Condition physique
  fitnessLevel: z.string().optional(),
  healthNotes: z.string().optional(),
  
  // Hébergement
  accommodationType: z.string().optional(),
  
  // Attentes
  expectations: z.string().optional(),
  budget: z.string().optional(),
  howDidYouHear: z.string().optional(),
  newsletter: z.boolean().optional(),
});

type DevisForm = z.infer<typeof devisSchema>;

const destinations = [
  { value: "bretagne", label: "Bretagne - France" },
  { value: "maroc", label: "Maroc" },
  { value: "autre", label: "Autre / Je ne sais pas encore" },
];

const activityTypes = [
  { value: "randonnee", label: "Randonnée équestre" },
  { value: "sejour", label: "Séjour à la ferme" },
  { value: "stage", label: "Stage équitation" },
  { value: "cours", label: "Cours d'équitation" },
  { value: "hebergement", label: "Hébergement seul (Yourte)" },
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

const durations = [
  { value: "1-jour", label: "1 journée" },
  { value: "weekend", label: "Week-end (2-3 jours)" },
  { value: "semaine", label: "1 semaine" },
  { value: "2-semaines", label: "2 semaines" },
  { value: "plus", label: "Plus de 2 semaines" },
];

const accommodationTypes = [
  { value: "yourte", label: "Yourte An Arwen" },
  { value: "independant", label: "Je m'organise seul" },
  { value: "conseil", label: "J'aimerais des conseils" },
];

const DemandeDevis = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<DevisForm>>({
    adultsCount: 1,
    childrenCount: 0,
    newsletter: false,
  });

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

    setLoading(true);

    // Build the message with all details
    const detailedMessage = `
📍 DESTINATION & TYPE
- Destination souhaitée : ${form.destination}
- Type d'activité : ${form.activityType}

📅 DATES & DURÉE
- Période souhaitée : ${form.preferredPeriod || "Non précisé"}
- Flexibilité : ${form.flexibility || "Non précisé"}
- Durée : ${form.duration || "Non précisé"}

👥 PARTICIPANTS
- Adultes : ${form.adultsCount}
- Enfants : ${form.childrenCount}
${form.childrenAges ? `- Âges des enfants : ${form.childrenAges}` : ""}

🐴 NIVEAU ÉQUESTRE
- Niveau : ${form.ridingLevel}
- Expérience : ${form.ridingExperience || "Non précisé"}
- Pratique actuelle : ${form.hoursPerWeek || "Non précisé"}

💪 CONDITION PHYSIQUE
- Niveau forme : ${form.fitnessLevel || "Non précisé"}
${form.healthNotes ? `- Remarques santé : ${form.healthNotes}` : ""}

🏠 HÉBERGEMENT
- Préférence : ${form.accommodationType || "Non précisé"}

💬 ATTENTES & AUTRES
${form.expectations ? `- Attentes : ${form.expectations}` : ""}
${form.budget ? `- Budget indicatif : ${form.budget}` : ""}
${form.howDidYouHear ? `- Comment nous avez-vous connu : ${form.howDidYouHear}` : ""}
- Newsletter : ${form.newsletter ? "Oui" : "Non"}
    `.trim();

    const { error } = await supabase.from("contact_requests").insert([{
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      subject: `Demande de devis - ${form.destination} - ${form.activityType}`,
      message: detailedMessage,
      participants: (form.adultsCount || 1) + (form.childrenCount || 0),
    }]);

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } else {
      toast.success("Demande de devis envoyée avec succès ! Nous vous répondrons sous 48h.");
      setForm({ adultsCount: 1, childrenCount: 0, newsletter: false });
    }
  };

  return (
    <Layout>
      {/* Header */}
      <section className="pt-32 pb-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary font-medium mb-4">Devis personnalisé</span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
            Demandez votre devis
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Décrivez-nous votre projet de voyage équestre et nous vous proposerons une aventure sur mesure.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Vos coordonnées
                </CardTitle>
                <CardDescription>Pour vous recontacter avec notre proposition</CardDescription>
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

            {/* Destination & Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Destination & Type de séjour
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Destination souhaitée *</Label>
                  <Select value={form.destination} onValueChange={(v) => updateField("destination", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {destinations.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type d'activité *</Label>
                  <Select value={form.activityType} onValueChange={(v) => updateField("activityType", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Dates & Durée
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="preferredPeriod">Période souhaitée</Label>
                  <Input
                    id="preferredPeriod"
                    placeholder="Ex: Avril 2025, vacances de Pâques..."
                    value={form.preferredPeriod || ""}
                    onChange={(e) => updateField("preferredPeriod", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Durée souhaitée</Label>
                  <Select value={form.duration} onValueChange={(v) => updateField("duration", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {durations.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="flexibility">Flexibilité sur les dates</Label>
                  <Input
                    id="flexibility"
                    placeholder="Ex: +/- 1 semaine"
                    value={form.flexibility || ""}
                    onChange={(e) => updateField("flexibility", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

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

            {/* Accommodation */}
            <Card>
              <CardHeader>
                <CardTitle>🏠 Hébergement</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Préférence d'hébergement</Label>
                  <Select value={form.accommodationType} onValueChange={(v) => updateField("accommodationType", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {accommodationTypes.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="expectations">Décrivez vos attentes et envies</Label>
                  <Textarea
                    id="expectations"
                    placeholder="Ce que vous rêvez de vivre, vos motivations, questions particulières..."
                    rows={4}
                    value={form.expectations || ""}
                    onChange={(e) => updateField("expectations", e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget indicatif (optionnel)</Label>
                    <Input
                      id="budget"
                      placeholder="Ex: 800-1200€/personne"
                      value={form.budget || ""}
                      onChange={(e) => updateField("budget", e.target.value)}
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
              <Button type="submit" size="lg" disabled={loading} className="px-12">
                <Send className="mr-2 h-5 w-5" />
                {loading ? "Envoi en cours..." : "Envoyer ma demande de devis"}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Nous vous répondrons sous 48h avec une proposition personnalisée.
              </p>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default DemandeDevis;
