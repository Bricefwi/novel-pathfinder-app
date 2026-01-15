import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Check, MapPin, Flag, FileText, Users, Calendar, Euro } from "lucide-react";
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
  { id: 4, title: "Créneaux", icon: Calendar },
  { id: 5, title: "Tarifs", icon: Euro },
];

const COUNTRIES = ["France", "Maroc", "Mongolie", "Écosse", "Jordanie"];
const REGIONS: Record<string, string[]> = {
  France: ["Bretagne", "Normandie", "Provence"],
  Maroc: ["Désert", "Atlas", "Côte Atlantique"],
  Mongolie: ["Steppes", "Gobi", "Khentii"],
  Écosse: ["Highlands", "Île de Skye"],
  Jordanie: ["Wadi Rum", "Pétra"],
};

export function ActivityWizard({ open, onOpenChange, activity, onComplete }: ActivityWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: activity?.country || "France",
    region: activity?.region || "",
    title: activity?.title || "",
    slug: activity?.slug || "",
    description: activity?.description || "",
    short_description: activity?.short_description || "",
    riding_level: activity?.riding_level || "debutant",
    max_participants: activity?.max_participants || 8,
    duration: activity?.duration || "",
    price_from: activity?.price_from || 0,
    price_to: activity?.price_to || 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        ...formData,
        activity_type: "sejour",
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Séjour créé avec succès");
      onComplete();
      setStep(1);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const handleNext = () => step < 5 && setStep(step + 1);
  const handleBack = () => step > 1 && setStep(step - 1);

  const handleSubmit = () => {
    if (!formData.title || !formData.slug) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau Séjour - Étape {step}/5</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= s.id ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
              }`}>
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[200px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pays *</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v, region: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Région *</Label>
                <Select value={formData.region} onValueChange={(v) => setFormData({ ...formData, region: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une région" /></SelectTrigger>
                  <SelectContent>
                    {(REGIONS[formData.country] || []).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description courte</Label>
                <Input value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description complète</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Niveau équestre requis</Label>
                <Select value={formData.riding_level || "debutant"} onValueChange={(v: any) => setFormData({ ...formData, riding_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 8 })} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Durée</Label>
                <Input placeholder="ex: 5 jours / 4 nuits" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
              </div>
              <p className="text-sm text-muted-foreground">Les créneaux détaillés peuvent être ajoutés après la création du séjour.</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix minimum (€)</Label>
                  <Input type="number" value={formData.price_from} onChange={(e) => setFormData({ ...formData, price_from: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Prix maximum (€)</Label>
                  <Input type="number" value={formData.price_to} onChange={(e) => setFormData({ ...formData, price_to: parseInt(e.target.value) || 0 })} />
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
          {step < 5 ? (
            <Button onClick={handleNext}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              <Check className="h-4 w-4 mr-1" /> Créer le séjour
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
