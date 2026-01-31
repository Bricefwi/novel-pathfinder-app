import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Plus, 
  X, 
  BookOpen, 
  MapPin, 
  Shirt, 
  Info, 
  Quote, 
  Bed,
  Utensils,
  Plane,
  FileText
} from "lucide-react";

// Interface pour le carnet de voyage enrichi
export interface TravelDiaryData {
  editorial: {
    title: string;
    content: string;
    organizer_word: string;
  };
  daily_itinerary: {
    day_number: number;
    title: string;
    description: string;
    accommodation: string;
    meals: string;
  }[];
  packing_list: {
    category: string;
    items: string[];
  }[];
  practical_info: {
    meeting_point: string;
    flights_info: string;
    required_documents: string;
  };
}

// Structure par défaut
export const DEFAULT_TRAVEL_DIARY: TravelDiaryData = {
  editorial: {
    title: "",
    content: "",
    organizer_word: "",
  },
  daily_itinerary: [],
  packing_list: [
    { category: "Tête", items: [] },
    { category: "Buste", items: [] },
    { category: "Jambes", items: [] },
    { category: "Pieds & Mains", items: [] },
    { category: "Pharmacie / Hygiène", items: [] },
    { category: "Matériel à Cheval", items: [] },
  ],
  practical_info: {
    meeting_point: "",
    flights_info: "",
    required_documents: "",
  },
};

interface TravelDiaryEditorProps {
  value: TravelDiaryData;
  onChange: (diary: TravelDiaryData) => void;
  activityTitle?: string;
}

export function TravelDiaryEditor({ value, onChange, activityTitle }: TravelDiaryEditorProps) {
  const [newItemInputs, setNewItemInputs] = useState<Record<number, string>>({});

  // Helper pour mettre à jour l'éditorial
  const updateEditorial = (field: keyof TravelDiaryData["editorial"], newValue: string) => {
    onChange({
      ...value,
      editorial: { ...value.editorial, [field]: newValue },
    });
  };

  // Helper pour mettre à jour les infos pratiques
  const updatePracticalInfo = (field: keyof TravelDiaryData["practical_info"], newValue: string) => {
    onChange({
      ...value,
      practical_info: { ...value.practical_info, [field]: newValue },
    });
  };

  // Gestion de l'itinéraire jour par jour
  const addDay = () => {
    const newDay = {
      day_number: value.daily_itinerary.length + 1,
      title: `Jour ${value.daily_itinerary.length + 1}`,
      description: "",
      accommodation: "",
      meals: "",
    };
    onChange({
      ...value,
      daily_itinerary: [...value.daily_itinerary, newDay],
    });
  };

  const updateDay = (index: number, field: keyof TravelDiaryData["daily_itinerary"][0], newValue: string | number) => {
    const updated = [...value.daily_itinerary];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange({ ...value, daily_itinerary: updated });
  };

  const removeDay = (index: number) => {
    const updated = value.daily_itinerary.filter((_, i) => i !== index);
    // Renumérote les jours
    updated.forEach((day, i) => (day.day_number = i + 1));
    onChange({ ...value, daily_itinerary: updated });
  };

  // Gestion du trousseau
  const addPackingCategory = () => {
    onChange({
      ...value,
      packing_list: [...value.packing_list, { category: "Nouvelle catégorie", items: [] }],
    });
  };

  const updatePackingCategory = (index: number, newCategory: string) => {
    const updated = [...value.packing_list];
    updated[index] = { ...updated[index], category: newCategory };
    onChange({ ...value, packing_list: updated });
  };

  const removePackingCategory = (index: number) => {
    onChange({
      ...value,
      packing_list: value.packing_list.filter((_, i) => i !== index),
    });
  };

  const addPackingItem = (categoryIndex: number, item: string) => {
    if (!item.trim()) return;
    const updated = [...value.packing_list];
    updated[categoryIndex] = {
      ...updated[categoryIndex],
      items: [...updated[categoryIndex].items, item.trim()],
    };
    onChange({ ...value, packing_list: updated });
    setNewItemInputs({ ...newItemInputs, [categoryIndex]: "" });
  };

  const removePackingItem = (categoryIndex: number, itemIndex: number) => {
    const updated = [...value.packing_list];
    updated[categoryIndex] = {
      ...updated[categoryIndex],
      items: updated[categoryIndex].items.filter((_, i) => i !== itemIndex),
    };
    onChange({ ...value, packing_list: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Carnet de Voyage</span>
        {activityTitle && <span className="text-muted-foreground">• {activityTitle}</span>}
      </div>

      <Accordion type="multiple" defaultValue={["editorial", "itinerary"]} className="space-y-2">
        {/* Section A: L'Esprit du Voyage */}
        <AccordionItem value="editorial" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-primary" />
              <span className="font-medium">A. L'Esprit du Voyage</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editorial-title">Titre éditorial</Label>
              <Input
                id="editorial-title"
                value={value.editorial.title}
                onChange={(e) => updateEditorial("title", e.target.value)}
                placeholder="Ex: Pourquoi un séjour à cheval au Maroc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editorial-content">Contenu marketing / émotionnel</Label>
              <Textarea
                id="editorial-content"
                value={value.editorial.content}
                onChange={(e) => updateEditorial("content", e.target.value)}
                rows={5}
                placeholder="Décrivez ce qui rend ce voyage unique, l'ambiance, les sensations attendues..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizer-word">Le mot de l'organisatrice</Label>
              <Textarea
                id="organizer-word"
                value={value.editorial.organizer_word}
                onChange={(e) => updateEditorial("organizer_word", e.target.value)}
                rows={3}
                placeholder="Un message personnel de bienvenue, vos conseils, votre vision du voyage..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section B: Itinéraire Jour par Jour */}
        <AccordionItem value="itinerary" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">B. Itinéraire Jour par Jour</span>
              <Badge variant="secondary" className="ml-2">
                {value.daily_itinerary.length} jour(s)
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {value.daily_itinerary.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun jour programmé</p>
                <p className="text-sm">Ajoutez les étapes de votre voyage</p>
              </div>
            ) : (
              <div className="space-y-3">
                {value.daily_itinerary.map((day, index) => (
                  <Card key={index} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => removeDay(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">J{day.day_number}</Badge>
                        <Input
                          value={day.title}
                          onChange={(e) => updateDay(index, "title", e.target.value)}
                          className="h-8 font-medium border-none shadow-none px-0 focus-visible:ring-0"
                          placeholder="Titre du jour"
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={day.description}
                          onChange={(e) => updateDay(index, "description", e.target.value)}
                          rows={2}
                          placeholder="Activités prévues, points d'intérêt, durée à cheval..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Bed className="h-3 w-3" /> Hébergement
                          </Label>
                          <Input
                            value={day.accommodation}
                            onChange={(e) => updateDay(index, "accommodation", e.target.value)}
                            placeholder="Ex: Bivouac de luxe"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Utensils className="h-3 w-3" /> Repas
                          </Label>
                          <Input
                            value={day.meals}
                            onChange={(e) => updateDay(index, "meals", e.target.value)}
                            placeholder="Ex: Petit-déj + Dîner"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={addDay} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un jour
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Section C: Le Trousseau */}
        <AccordionItem value="packing" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Shirt className="h-4 w-4 text-primary" />
              <span className="font-medium">C. Trousseau & Équipement</span>
              <Badge variant="secondary" className="ml-2">
                {value.packing_list.reduce((acc, cat) => acc + cat.items.length, 0)} items
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Listez l'équipement recommandé par catégorie (inspiré du PDF : Tête, Buste, Jambes...)
            </p>

            <div className="space-y-3">
              {value.packing_list.map((section, idx) => (
                <Card key={idx} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={() => removePackingCategory(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      value={section.category}
                      onChange={(e) => updatePackingCategory(idx, e.target.value)}
                      className="font-semibold text-base border-none shadow-none px-0 focus-visible:ring-0"
                      placeholder="Nom de la catégorie"
                    />
                    
                    <div className="flex flex-wrap gap-2">
                      {section.items.map((item, itemIdx) => (
                        <Badge key={itemIdx} variant="secondary" className="flex items-center gap-1 py-1">
                          {item}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removePackingItem(idx, itemIdx)}
                          />
                        </Badge>
                      ))}
                      {section.items.length === 0 && (
                        <span className="text-sm text-muted-foreground italic">
                          Aucun équipement ajouté
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Nouvel équipement (ex: Lunettes de soleil)"
                        value={newItemInputs[idx] || ""}
                        onChange={(e) => setNewItemInputs({ ...newItemInputs, [idx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addPackingItem(idx, newItemInputs[idx] || "");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPackingItem(idx, newItemInputs[idx] || "")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="ghost" onClick={addPackingCategory} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Section D: Infos Pratiques */}
        <AccordionItem value="practical" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="font-medium">D. Informations Pratiques</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-point" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Point de rendez-vous
              </Label>
              <Textarea
                id="meeting-point"
                value={value.practical_info.meeting_point}
                onChange={(e) => updatePracticalInfo("meeting_point", e.target.value)}
                rows={2}
                placeholder="Lieu de RDV, heure, contact sur place..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flights-info" className="flex items-center gap-1">
                <Plane className="h-3 w-3" /> Informations vols / transport
              </Label>
              <Textarea
                id="flights-info"
                value={value.practical_info.flights_info}
                onChange={(e) => updatePracticalInfo("flights_info", e.target.value)}
                rows={2}
                placeholder="Compagnies recommandées, aéroports, transferts..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="required-docs" className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> Documents requis
              </Label>
              <Textarea
                id="required-docs"
                value={value.practical_info.required_documents}
                onChange={(e) => updatePracticalInfo("required_documents", e.target.value)}
                rows={2}
                placeholder="Passeport valide, visa, assurance voyage, certificat vaccinal..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
