import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import { 
  Leaf, 
  Mountain, 
  Castle, 
  Trees, 
  Send,
  MapPin,
  Globe,
  CheckCircle,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";

import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";

// Schéma de validation
const suggestionSchema = z.object({
  suggester_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  suggester_email: z.string().trim().email("Email invalide").max(255),
  location_name: z.string().trim().min(3, "Le nom du lieu doit contenir au moins 3 caractères").max(200),
  location_address: z.string().trim().max(300).optional().or(z.literal("")),
  location_website: z.string().trim().url("URL invalide").optional().or(z.literal("")),
  category: z.enum(["Randonnées", "Fermes Pédagogiques", "Patrimoine", "Nature"]),
  description: z.string().trim().min(20, "La description doit contenir au moins 20 caractères").max(2000),
});

const categories = [
  { id: "Randonnées", label: "Randonnée / Sentier", icon: Mountain, color: "bg-emerald-500/10 text-emerald-700" },
  { id: "Fermes Pédagogiques", label: "Ferme Pédagogique", icon: Leaf, color: "bg-amber-500/10 text-amber-700" },
  { id: "Patrimoine", label: "Patrimoine & Culture", icon: Castle, color: "bg-rose-500/10 text-rose-700" },
  { id: "Nature", label: "Nature & Écologie", icon: Trees, color: "bg-teal-500/10 text-teal-700" },
];

const ProposerLieu = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    suggester_name: "",
    suggester_email: "",
    location_name: "",
    location_address: "",
    location_website: "",
    category: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const result = suggestionSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("ecosystem_suggestions")
        .insert({
          suggester_name: form.suggester_name.trim(),
          suggester_email: form.suggester_email.trim(),
          location_name: form.location_name.trim(),
          location_address: form.location_address.trim() || null,
          location_website: form.location_website.trim() || null,
          category: form.category,
          description: form.description.trim(),
          status: "pending",
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Merci pour votre suggestion !");
    } catch (err) {
      console.error("Error submitting suggestion:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead
          title="Merci pour votre suggestion - Éco-Système"
          description="Votre suggestion de lieu a bien été enregistrée."
        />
        <Layout>
          <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
            <div className="container mx-auto px-4">
              <Card className="max-w-xl mx-auto text-center">
                <CardContent className="p-12">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-primary" />
                  </div>
                  <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
                    Merci pour votre contribution !
                  </h1>
                  <p className="text-muted-foreground text-lg mb-8">
                    Votre suggestion a bien été enregistrée. Notre équipe va l'examiner 
                    et, si elle correspond à notre ligne éditoriale, un article sera 
                    généré et publié prochainement.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild>
                      <Link to="/eco-systeme">
                        Retour à l'Éco-Système
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setSubmitted(false);
                      setForm({
                        suggester_name: "",
                        suggester_email: "",
                        location_name: "",
                        location_address: "",
                        location_website: "",
                        category: "",
                        description: "",
                      });
                    }}>
                      Proposer un autre lieu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </Layout>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Proposer un lieu - Éco-Système"
        description="Partagez vos bonnes adresses éco-touristiques en Bretagne : fermes, sentiers, patrimoine..."
        keywords="proposer lieu, éco-tourisme Bretagne, suggestion, contribution"
      />
      <Layout>
        {/* Hero */}
        <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={korrigansForetChevaux}
              alt="Forêt bretonne"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-background" />
          </div>
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/30">
              <Lightbulb className="h-3 w-3 mr-1.5" />
              Contribution
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-4 drop-shadow-lg">
              Proposer un lieu
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto drop-shadow-md">
              Partagez vos découvertes éco-touristiques en Bretagne !
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Votre suggestion</CardTitle>
                  <CardDescription>
                    Remplissez ce formulaire pour nous suggérer un lieu à découvrir. 
                    Notre équipe examinera votre proposition et, si elle est retenue, 
                    un article sera généré automatiquement.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Informations personnelles */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">Vos coordonnées</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="suggester_name">Votre nom *</Label>
                          <Input
                            id="suggester_name"
                            value={form.suggester_name}
                            onChange={(e) => setForm(prev => ({ ...prev, suggester_name: e.target.value }))}
                            className={errors.suggester_name ? "border-destructive" : ""}
                          />
                          {errors.suggester_name && (
                            <p className="text-sm text-destructive">{errors.suggester_name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="suggester_email">Votre email *</Label>
                          <Input
                            id="suggester_email"
                            type="email"
                            value={form.suggester_email}
                            onChange={(e) => setForm(prev => ({ ...prev, suggester_email: e.target.value }))}
                            className={errors.suggester_email ? "border-destructive" : ""}
                          />
                          {errors.suggester_email && (
                            <p className="text-sm text-destructive">{errors.suggester_email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations sur le lieu */}
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="font-medium text-foreground">Le lieu à découvrir</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="location_name">Nom du lieu *</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="location_name"
                            placeholder="Ex: Forêt de Brocéliande, Ferme du Tertre..."
                            value={form.location_name}
                            onChange={(e) => setForm(prev => ({ ...prev, location_name: e.target.value }))}
                            className={`pl-10 ${errors.location_name ? "border-destructive" : ""}`}
                          />
                        </div>
                        {errors.location_name && (
                          <p className="text-sm text-destructive">{errors.location_name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location_address">Adresse (optionnel)</Label>
                        <Input
                          id="location_address"
                          placeholder="Adresse complète si connue"
                          value={form.location_address}
                          onChange={(e) => setForm(prev => ({ ...prev, location_address: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location_website">Site web (optionnel)</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="location_website"
                            type="url"
                            placeholder="https://..."
                            value={form.location_website}
                            onChange={(e) => setForm(prev => ({ ...prev, location_website: e.target.value }))}
                            className={`pl-10 ${errors.location_website ? "border-destructive" : ""}`}
                          />
                        </div>
                        {errors.location_website && (
                          <p className="text-sm text-destructive">{errors.location_website}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Catégorie *</Label>
                        <Select 
                          value={form.category} 
                          onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => {
                              const Icon = cat.icon;
                              return (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {cat.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {errors.category && (
                          <p className="text-sm text-destructive">{errors.category}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Pourquoi ce lieu ? *</Label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez ce qui rend ce lieu spécial, son intérêt éco-touristique, ce qu'on peut y découvrir..."
                          rows={5}
                          value={form.description}
                          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                          className={errors.description ? "border-destructive" : ""}
                        />
                        {errors.description && (
                          <p className="text-sm text-destructive">{errors.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Minimum 20 caractères. Plus vous donnez de détails, meilleur sera l'article généré.
                        </p>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        "Envoi en cours..."
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Envoyer ma suggestion
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
};

export default ProposerLieu;
