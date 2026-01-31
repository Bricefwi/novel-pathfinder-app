import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Map,
  Backpack,
  Info,
  ChevronRight,
  CalendarDays,
  Home,
  Utensils,
  Check,
} from "lucide-react";
import {
  TravelDiaryData,
  LegacyTravelDiary,
  isNewDiaryFormat,
  hasDiaryContent,
} from "@/types/travel-diary";

interface TravelDiarySectionProps {
  travelDiary: TravelDiaryData | LegacyTravelDiary | null;
  activityTitle: string;
}

export const TravelDiarySection = ({
  travelDiary,
  activityTitle,
}: TravelDiarySectionProps) => {
  const [open, setOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Check if there's content to display
  if (!hasDiaryContent(travelDiary)) {
    return null;
  }

  const toggleItem = (category: string, itemIndex: number) => {
    const key = `${category}-${itemIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isNewFormat = travelDiary && isNewDiaryFormat(travelDiary);

  return (
    <>
      {/* CTA Card on product page */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Carnet de Voyage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Découvrez l'itinéraire détaillé, le trousseau à emporter et toutes
            les informations pratiques pour préparer votre aventure.
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full group">
                <BookOpen className="h-4 w-4 mr-2" />
                Consulter le Carnet
                <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="font-serif text-2xl flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Carnet de Voyage - {activityTitle}
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-100px)]">
                <div className="p-6">
                  {isNewFormat ? (
                    <NewFormatContent
                      diary={travelDiary as TravelDiaryData}
                      checkedItems={checkedItems}
                      onToggleItem={toggleItem}
                    />
                  ) : (
                    <LegacyFormatContent
                      diary={travelDiary as LegacyTravelDiary}
                    />
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
};

// Component for new format diary
const NewFormatContent = ({
  diary,
  checkedItems,
  onToggleItem,
}: {
  diary: TravelDiaryData;
  checkedItems: Record<string, boolean>;
  onToggleItem: (category: string, itemIndex: number) => void;
}) => {
  return (
    <Tabs defaultValue="esprit" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="esprit" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">L'Esprit</span>
        </TabsTrigger>
        <TabsTrigger value="itineraire" className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          <span className="hidden sm:inline">Itinéraire</span>
        </TabsTrigger>
        <TabsTrigger value="trousseau" className="flex items-center gap-2">
          <Backpack className="h-4 w-4" />
          <span className="hidden sm:inline">Trousseau</span>
        </TabsTrigger>
        <TabsTrigger value="pratique" className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Pratique</span>
        </TabsTrigger>
      </TabsList>

      {/* L'Esprit */}
      <TabsContent value="esprit" className="space-y-6">
        {diary.editorial?.title && (
          <div>
            <h3 className="font-serif text-xl font-bold mb-3">
              {diary.editorial.title}
            </h3>
          </div>
        )}
        {diary.editorial?.content && (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
              {diary.editorial.content}
            </p>
          </div>
        )}
        {diary.editorial?.organizer_word && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <p className="text-sm italic text-muted-foreground">
                "{diary.editorial.organizer_word}"
              </p>
              <p className="text-xs text-primary mt-2 font-medium">
                — L'équipe An Arwen
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Itinéraire */}
      <TabsContent value="itineraire" className="space-y-4">
        {diary.daily_itinerary?.length > 0 ? (
          <div className="relative">
            {/* Timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
            <div className="space-y-6">
              {diary.daily_itinerary.map((day, idx) => (
                <div key={idx} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {day.day_number}
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Jour {day.day_number}: {day.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground whitespace-pre-line">
                        {day.description}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-2 border-t">
                        {day.accommodation && (
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">
                              {day.accommodation}
                            </span>
                          </div>
                        )}
                        {day.meals && (
                          <div className="flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">
                              {day.meals}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            L'itinéraire détaillé sera bientôt disponible.
          </p>
        )}
      </TabsContent>

      {/* Trousseau (Packing List) */}
      <TabsContent value="trousseau" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Cochez les éléments au fur et à mesure de votre préparation :
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {diary.packing_list?.map(
            (category, catIdx) =>
              category.items.length > 0 && (
                <Card key={catIdx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Backpack className="h-4 w-4 text-primary" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIdx) => {
                        const key = `${category.category}-${itemIdx}`;
                        const isChecked = checkedItems[key] || false;
                        return (
                          <li key={itemIdx} className="flex items-center gap-3">
                            <Checkbox
                              id={key}
                              checked={isChecked}
                              onCheckedChange={() =>
                                onToggleItem(category.category, itemIdx)
                              }
                            />
                            <label
                              htmlFor={key}
                              className={`text-sm cursor-pointer ${
                                isChecked
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {item}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )
          )}
        </div>
      </TabsContent>

      {/* Infos Pratiques */}
      <TabsContent value="pratique" className="space-y-4">
        {diary.practical_info?.meeting_point && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Point de Rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {diary.practical_info.meeting_point}
              </p>
            </CardContent>
          </Card>
        )}
        {diary.practical_info?.flights_info && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vols / Transport</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {diary.practical_info.flights_info}
              </p>
            </CardContent>
          </Card>
        )}
        {diary.practical_info?.required_documents && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Documents Requis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {diary.practical_info.required_documents}
              </p>
            </CardContent>
          </Card>
        )}
        {!diary.practical_info?.meeting_point &&
          !diary.practical_info?.flights_info &&
          !diary.practical_info?.required_documents && (
            <p className="text-center text-muted-foreground py-8">
              Les informations pratiques seront bientôt disponibles.
            </p>
          )}
      </TabsContent>
    </Tabs>
  );
};

// Component for legacy format diary
const LegacyFormatContent = ({ diary }: { diary: LegacyTravelDiary }) => {
  return (
    <div className="space-y-6">
      {diary.pourquoi_sejour && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pourquoi ce séjour ?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {diary.pourquoi_sejour}
            </p>
          </CardContent>
        </Card>
      )}
      {diary.itineraire && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itinéraire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {diary.itineraire}
            </p>
          </CardContent>
        </Card>
      )}
      {diary.hebergements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hébergements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {diary.hebergements}
            </p>
          </CardContent>
        </Card>
      )}
      {diary.equipement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Équipement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {diary.equipement}
            </p>
          </CardContent>
        </Card>
      )}
      {diary.infos_pratiques && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Infos Pratiques</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {diary.infos_pratiques}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
