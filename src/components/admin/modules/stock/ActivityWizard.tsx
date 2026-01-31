import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Check, MapPin, FileText, Users, Euro, Image, BookOpen, AlertTriangle } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { TravelDiaryEditor, TravelDiaryData, DEFAULT_TRAVEL_DIARY } from "./TravelDiaryEditor";
import type { Tables } from "@/integrations/supabase/types";

type Activity = Tables<"activities">;

interface ActivityWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: "Destination", icon: MapPin },
  { id: 2, title: "Informations", icon: FileText },
  { id: 3, title: "Capacité", icon: Users },
  { id: 4, title: "Photos", icon: Image },
  { id: 5, title: "Tarifs", icon: Euro },
  { id: 6, title: "Carnet", icon: BookOpen },
];

const COUNTRIES = ["France", "Maroc", "Europe", "Asie"];
const REGIONS: Record<string, string[]> = {
  France: ["Bretagne", "Normandie", "Provence", "Vosges", "Alsace"],
  Maroc: ["Sud Marocain", "Atlas & Côte", "Désert", "Côte Atlantique"],
  Europe: ["Écosse", "Irlande", "Islande", "Espagne"],
  Asie: ["Mongolie", "Jordanie", "Inde", "Népal"],
};

const ACTIVITY_TYPES = [
  { value: "sejour", label: "Séjour / Randonnée" },
  { value: "stage", label: "Stage" },
  { value: "cours", label: "Cours" },
  { value: "randonnee", label: "Randonnée à la journée" },
];

export function ActivityWizard({ open, onOpenChange, activity, onComplete }: ActivityWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const isEditing = !!activity;

  const [formData, setFormData] = useState({
    country: "France",
    region: "",
    title: "",
    slug: "",
    description: "",
    short_description: "",
    riding_level: "debutant" as "debutant" | "intermediaire" | "confirme" | "expert",
    max_participants: 8,
    duration: "",
    price_from: 0,
    price_to: 0,
    activity_type: "sejour" as "sejour" | "stage" | "cours" | "randonnee" | "hebergement",
    inclusions: [] as string[],
    exclusions: [] as string[],
    requirements: [] as string[],
    images: [] as string[],
    featured_image: "",
    travel_diary: DEFAULT_TRAVEL_DIARY as TravelDiaryData,
  });

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      // Parse existing travel_diary from JSON
      const existingDiary = (activity as any).travel_diary as TravelDiaryData | null;
      
      setFormData({
        country: activity.country || "France",
        region: activity.region || "",
        title: activity.title || "",
        slug: activity.slug || "",
        description: activity.description || "",
        short_description: activity.short_description || "",
        riding_level: activity.riding_level || "debutant",
        max_participants: activity.max_participants || 8,
        duration: activity.duration || "",
        price_from: activity.price_from || 0,
        price_to: activity.price_to || 0,
        activity_type: activity.activity_type || "sejour",
        inclusions: activity.inclusions || [],
        exclusions: activity.exclusions || [],
        requirements: activity.requirements || [],
        images: (activity.images as string[]) || [],
        featured_image: activity.featured_image || "",
        travel_diary: existingDiary || DEFAULT_TRAVEL_DIARY,
      });
    } else {
      // Reset to defaults for new activity
      setFormData({
        country: "France",
        region: "",
        title: "",
        slug: "",
        description: "",
        short_description: "",
        riding_level: "debutant",
        max_participants: 8,
        duration: "",
        price_from: 0,
        price_to: 0,
        activity_type: "sejour",
        inclusions: [],
        exclusions: [],
        requirements: [],
        images: [],
        featured_image: "",
        travel_diary: DEFAULT_TRAVEL_DIARY,
      });
    }
    setStep(1);
  }, [activity, open]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.title, isEditing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Cast travel_diary to JSON type for Supabase
      const travelDiaryJson = formData.travel_diary as unknown as { [key: string]: string };
      
      // Sécurisation des données numériques avec Number()
      const payload = {
        country: formData.country,
        region: formData.region,
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        short_description: formData.short_description,
        riding_level: formData.riding_level,
        max_participants: Number(formData.max_participants) || 8,
        duration: formData.duration,
        price_from: Number(formData.price_from) || 0,
        price_to: Number(formData.price_to) || 0,
        activity_type: formData.activity_type,
        inclusions: formData.inclusions,
        exclusions: formData.exclusions,
        requirements: formData.requirements,
        travel_diary: travelDiaryJson,
        is_active: true,
        // Only update images if they exist, otherwise preserve existing
        ...(formData.images.length > 0 
          ? { 
              images: formData.images,
              featured_image: formData.images[0] 
            } 
          : activity?.featured_image 
            ? { featured_image: activity.featured_image, images: activity.images }
            : {}
        ),
      };

      // MODE UPDATE: Target specific ID
      if (isEditing && activity?.id) {
        const { data, error } = await supabase
          .from("activities")
          .update(payload as any)
          .eq("id", activity.id)
          .select()
          .single();
        
        if (error) {
          console.error("[ActivityWizard] Erreur UPDATE:", error);
          throw error;
        }
        
        return { mode: "update", data };
      } else {
        // MODE CREATE: Insert new activity
        const { data, error } = await supabase
          .from("activities")
          .insert([payload] as any)
          .select()
          .single();
        
        if (error) {
          console.error("[ActivityWizard] Erreur INSERT:", error);
          throw error;
        }
        
        return { mode: "insert", data };
      }
    },
    onSuccess: (result) => {
      const message = result?.mode === "update" 
        ? `✓ Séjour "${formData.title}" mis à jour avec succès` 
        : `✓ Séjour "${formData.title}" créé avec succès`;
      toast.success(message);
      
      // Invalidate ALL related queries for immediate UI refresh
      queryClient.invalidateQueries({ queryKey: ["stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["sejours-grouped"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      
      onComplete();
      setStep(1);
    },
    onError: (error: any) => {
      console.error("[ActivityWizard] Save error:", error);
      if (error.code === "23505") {
        toast.error("Ce slug existe déjà. Choisissez un autre titre.");
      } else {
        toast.error(`Erreur lors de la sauvegarde: ${error.message || "Erreur inconnue"}`);
      }
    },
  });

  const handleNext = () => step < 6 && setStep(step + 1);
  const handleBack = () => step > 1 && setStep(step - 1);

  const handleSubmit = () => {
    if (!formData.title || !formData.slug) {
      toast.error("Veuillez remplir le titre du séjour");
      setStep(2);
      return;
    }
    if (!formData.region) {
      toast.error("Veuillez sélectionner une région");
      setStep(1);
      return;
    }
    saveMutation.mutate();
  };

  const handleImagesChange = (images: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images,
      featured_image: images[0] || prev.featured_image,
    }));
  };

  const handleListChange = (field: "inclusions" | "exclusions" | "requirements", value: string) => {
    const items = value.split("\n").filter((item) => item.trim() !== "");
    setFormData((prev) => ({ ...prev, [field]: items }));
  };

  // Check if travel diary is empty (nouvelle structure)
  const isTravelDiaryEmpty = () => {
    const d = formData.travel_diary;
    const hasEditorial = d.editorial.title || d.editorial.content || d.editorial.organizer_word;
    const hasItinerary = d.daily_itinerary.length > 0;
    const hasPackingItems = d.packing_list.some(cat => cat.items.length > 0);
    const hasPracticalInfo = d.practical_info.meeting_point || d.practical_info.flights_info || d.practical_info.required_documents;
    return !hasEditorial && !hasItinerary && !hasPackingItems && !hasPracticalInfo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Modifier "${activity?.title}"` : "Nouveau Séjour"} - Étape {step}/6
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step >= s.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 hover:border-primary/50"
                }`}
              >
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 md:w-12 h-0.5 mx-1 ${step > s.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type d'activité *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(v: any) => setFormData({ ...formData, activity_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pays *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => setFormData({ ...formData, country: v, region: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Région *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(v) => setFormData({ ...formData, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {(REGIONS[formData.country] || []).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Titre *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Bretagne Romantique"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Slug (URL) *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="bretagne-romantique"
                    disabled={isEditing}
                  />
                  <p className="text-xs text-muted-foreground">URL: /sejour/{formData.slug || "..."}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description courte (accroche)</Label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="Une escapade entre châteaux et forêts enchantées"
                />
              </div>
              <div className="space-y-2">
                <Label>Description complète</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Description détaillée du séjour..."
                />
              </div>
              <div className="space-y-2">
                <Label>Durée</Label>
                <Input
                  placeholder="Ex: 4 jours / 3 nuits"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Niveau équestre requis</Label>
                <Select
                  value={formData.riding_level}
                  onValueChange={(v: any) => setFormData({ ...formData, riding_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debutant">Débutant</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                    <SelectItem value="confirme">Confirmé</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Places maximum</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) =>
                    setFormData({ ...formData, max_participants: parseInt(e.target.value) || 8 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Inclusions (une par ligne)</Label>
                <Textarea
                  value={formData.inclusions.join("\n")}
                  onChange={(e) => handleListChange("inclusions", e.target.value)}
                  rows={3}
                  placeholder="Hébergement en gîte&#10;Pension complète&#10;Guide accompagnateur"
                />
              </div>
              <div className="space-y-2">
                <Label>Non inclus (une par ligne)</Label>
                <Textarea
                  value={formData.exclusions.join("\n")}
                  onChange={(e) => handleListChange("exclusions", e.target.value)}
                  rows={2}
                  placeholder="Transport jusqu'au point de départ&#10;Équipement personnel"
                />
              </div>
              <div className="space-y-2">
                <Label>Prérequis (une par ligne)</Label>
                <Textarea
                  value={formData.requirements.join("\n")}
                  onChange={(e) => handleListChange("requirements", e.target.value)}
                  rows={2}
                  placeholder="Savoir monter au pas, trot, galop&#10;Bonne condition physique"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Photos du séjour</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez jusqu'à 5 photos. La première sera l'image principale affichée sur le site.
                </p>
              </div>
              <ImageUploader
                images={formData.images}
                onChange={handleImagesChange}
                maxImages={5}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix minimum (€)</Label>
                  <Input
                    type="number"
                    value={formData.price_from}
                    onChange={(e) =>
                      setFormData({ ...formData, price_from: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix maximum (€)</Label>
                  <Input
                    type="number"
                    value={formData.price_to}
                    onChange={(e) =>
                      setFormData({ ...formData, price_to: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Les prix affichés sont indicatifs. Les tarifs exacts seront définis dans les créneaux.
              </p>
            </div>
          )}

          {/* Step 6: Carnet de Voyage */}
          {step === 6 && (
            <div className="space-y-4">
              <Badge variant="outline" className="ml-auto">Optionnel</Badge>
              <p className="text-sm text-muted-foreground mb-4">
                Ce document sera téléchargeable par les clients après réservation.
                Vous pourrez le compléter ultérieurement.
              </p>

              {isTravelDiaryEmpty() && (
                <Alert className="border-warning/30 bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground">
                    Carnet de voyage non renseigné. Les clients ne pourront pas le télécharger.
                  </AlertDescription>
                </Alert>
              )}

              {/* Nouveau composant TravelDiaryEditor */}
              <TravelDiaryEditor
                value={formData.travel_diary}
                onChange={(newDiary) => setFormData({ ...formData, travel_diary: newDiary })}
                activityTitle={formData.title}
              />

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Type :</span>
                  <span>{ACTIVITY_TYPES.find((t) => t.value === formData.activity_type)?.label}</span>
                  <span className="text-muted-foreground">Destination :</span>
                  <span>
                    {formData.region}, {formData.country}
                  </span>
                  <span className="text-muted-foreground">Titre :</span>
                  <span>{formData.title || "-"}</span>
                  <span className="text-muted-foreground">Durée :</span>
                  <span>{formData.duration || "-"}</span>
                  <span className="text-muted-foreground">Prix :</span>
                  <span>
                    {formData.price_from ? `${formData.price_from}€` : "-"}
                    {formData.price_to ? ` - ${formData.price_to}€` : ""}
                  </span>
                  <span className="text-muted-foreground">Photos :</span>
                  <span>{formData.images.length} image(s)</span>
                  <span className="text-muted-foreground">Carnet :</span>
                  <span>{isTravelDiaryEmpty() ? "Non renseigné ⚠️" : "Complété ✓"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          {step < 6 ? (
            <Button onClick={handleNext}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              <Check className="h-4 w-4 mr-1" />
              {saveMutation.isPending
                ? "Enregistrement..."
                : isEditing
                ? "Mettre à jour"
                : "Créer le séjour"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
