import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, MapPin, Users, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";

interface ActivitySlot {
  id: string;
  activity_id: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  price: number | null;
  is_available: boolean;
  activity?: {
    title: string;
    location: string;
    activity_type: string;
    featured_image: string | null;
  };
}

interface AccommodationSlot {
  id: string;
  date: string;
  is_available: boolean;
  price_per_night: number;
  name: string;
}

const Planning = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activitySlots, setActivitySlots] = useState<ActivitySlot[]>([]);
  const [accommodationSlots, setAccommodationSlots] = useState<AccommodationSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch activity slots with activity details
    const { data: slots } = await supabase
      .from("activity_slots")
      .select(`
        *,
        activity:activities(title, location, activity_type, featured_image)
      `)
      .gte("start_date", format(subMonths(currentMonth, 1), "yyyy-MM-dd"))
      .lte("end_date", format(addMonths(currentMonth, 2), "yyyy-MM-dd"));

    // Fetch accommodation availability
    const { data: accommodation } = await supabase
      .from("accommodation_slots")
      .select("*")
      .gte("date", format(subMonths(currentMonth, 1), "yyyy-MM-dd"))
      .lte("date", format(addMonths(currentMonth, 2), "yyyy-MM-dd"));

    if (slots) setActivitySlots(slots as ActivitySlot[]);
    if (accommodation) setAccommodationSlots(accommodation);
    setLoading(false);
  };

  const getActivityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      randonnee: "bg-primary/20 text-primary border-primary/30",
      sejour: "bg-accent/20 text-accent-foreground border-accent/30",
      stage: "bg-secondary/20 text-secondary-foreground border-secondary/30",
      evenement: "bg-destructive/20 text-destructive border-destructive/30",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      randonnee: "Randonnée",
      sejour: "Séjour",
      stage: "Stage",
      evenement: "Événement",
    };
    return labels[type] || type;
  };

  const getDatesWithActivities = () => {
    const dates: Date[] = [];
    activitySlots.forEach((slot) => {
      const start = parseISO(slot.start_date);
      const end = parseISO(slot.end_date);
      let current = start;
      while (current <= end) {
        dates.push(new Date(current));
        current = new Date(current.setDate(current.getDate() + 1));
      }
    });
    return dates;
  };

  const getActivitiesForDate = (date: Date) => {
    return activitySlots.filter((slot) => {
      const start = parseISO(slot.start_date);
      const end = parseISO(slot.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const getAccommodationForDate = (date: Date) => {
    return accommodationSlots.find((slot) => isSameDay(parseISO(slot.date), date));
  };

  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];
  const selectedAccommodation = selectedDate ? getAccommodationForDate(selectedDate) : null;

  return (
    <Layout>
      <SEOHead {...seoConfigs.planning} />
      <section className="pt-32 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
              <CalendarDays className="w-4 h-4 mr-2" />
              Planning & Disponibilités
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Agenda des <span className="text-primary">Aventures</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Consultez nos prochaines randonnées, séjours et événements ainsi que les disponibilités de l'hébergement.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-serif">Calendrier</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[140px] text-center">
                      {format(currentMonth, "MMMM yyyy", { locale: fr })}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="activities" className="mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="activities" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Activités
                      </TabsTrigger>
                      <TabsTrigger value="hebergement" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Hébergement
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="activities" className="mt-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="rounded-lg border-0 w-full"
                        modifiers={{
                          hasActivity: getDatesWithActivities(),
                        }}
                        modifiersStyles={{
                          hasActivity: {
                            backgroundColor: "hsl(var(--primary) / 0.2)",
                            borderRadius: "50%",
                            fontWeight: "bold",
                          },
                        }}
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                          month: "space-y-4 w-full",
                          table: "w-full border-collapse",
                          head_row: "flex w-full justify-between",
                          head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm flex-1 text-center",
                          row: "flex w-full mt-2 justify-between",
                          cell: "h-12 w-full text-center text-sm p-0 relative flex-1 flex items-center justify-center",
                          day: "h-10 w-10 p-0 font-normal rounded-full hover:bg-accent transition-colors",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                          day_today: "bg-accent text-accent-foreground",
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="hebergement" className="mt-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="rounded-lg border-0 w-full"
                        modifiers={{
                          available: accommodationSlots
                            .filter((s) => s.is_available)
                            .map((s) => parseISO(s.date)),
                          booked: accommodationSlots
                            .filter((s) => !s.is_available)
                            .map((s) => parseISO(s.date)),
                        }}
                        modifiersStyles={{
                          available: {
                            backgroundColor: "hsl(142 76% 36% / 0.2)",
                            borderRadius: "50%",
                          },
                          booked: {
                            backgroundColor: "hsl(var(--destructive) / 0.2)",
                            borderRadius: "50%",
                            textDecoration: "line-through",
                          },
                        }}
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                          month: "space-y-4 w-full",
                          table: "w-full border-collapse",
                          head_row: "flex w-full justify-between",
                          head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm flex-1 text-center",
                          row: "flex w-full mt-2 justify-between",
                          cell: "h-12 w-full text-center text-sm p-0 relative flex-1 flex items-center justify-center",
                          day: "h-10 w-10 p-0 font-normal rounded-full hover:bg-accent transition-colors",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                          day_today: "bg-accent text-accent-foreground",
                        }}
                      />
                      <div className="flex gap-4 mt-4 justify-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500/20" />
                          <span className="text-muted-foreground">Disponible</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-destructive/20" />
                          <span className="text-muted-foreground">Réservé</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Upcoming Activities */}
              <Card className="mt-8 border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Prochaines Activités
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : activitySlots.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Aucune activité programmée pour le moment. Revenez bientôt !
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activitySlots.slice(0, 5).map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedDate(parseISO(slot.start_date))}
                        >
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                              {format(parseISO(slot.start_date), "d")}
                            </span>
                            <span className="text-xs text-muted-foreground uppercase">
                              {format(parseISO(slot.start_date), "MMM", { locale: fr })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {slot.activity?.title || "Activité"}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {slot.activity?.location || "Bretagne"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {slot.current_participants}/{slot.max_participants}
                              </span>
                            </div>
                          </div>
                          <Badge className={getActivityTypeColor(slot.activity?.activity_type || "")}>
                            {getActivityTypeLabel(slot.activity?.activity_type || "")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Selected Date Details */}
            <div className="space-y-6">
              <Card className="border-border/50 sticky top-24">
                <CardHeader>
                  <CardTitle className="font-serif">
                    {selectedDate
                      ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                      : "Sélectionnez une date"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <p className="text-muted-foreground text-center py-8">
                      Cliquez sur une date du calendrier pour voir les détails
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Activities for selected date */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Activités
                        </h4>
                        {selectedActivities.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Aucune activité ce jour
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {selectedActivities.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-3 rounded-lg bg-muted/30 border border-border/50"
                              >
                                <h5 className="font-medium">{slot.activity?.title}</h5>
                                <div className="flex items-center justify-between mt-2">
                                  <Badge
                                    variant="outline"
                                    className={getActivityTypeColor(slot.activity?.activity_type || "")}
                                  >
                                    {getActivityTypeLabel(slot.activity?.activity_type || "")}
                                  </Badge>
                                  <span className="text-sm font-semibold text-primary">
                                    {slot.price ? `${slot.price}€` : "Sur demande"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>
                                    {slot.max_participants - slot.current_participants} places restantes
                                  </span>
                                </div>
                                <Button className="w-full mt-3" size="sm">
                                  Réserver
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Accommodation for selected date */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          Hébergement
                        </h4>
                        {!selectedAccommodation ? (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-sm text-muted-foreground">
                              Disponibilité non renseignée
                            </p>
                            <Button variant="outline" className="w-full mt-3" size="sm">
                              Demander disponibilité
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{selectedAccommodation.name}</span>
                              <Badge
                                variant={selectedAccommodation.is_available ? "default" : "destructive"}
                              >
                                {selectedAccommodation.is_available ? "Disponible" : "Réservé"}
                              </Badge>
                            </div>
                            {selectedAccommodation.is_available && (
                              <>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {selectedAccommodation.price_per_night}€ / nuit
                                </p>
                                <Button className="w-full mt-3" size="sm">
                                  Réserver
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legend */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Légende</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getActivityTypeColor("randonnee")}>Randonnée</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getActivityTypeColor("sejour")}>Séjour</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getActivityTypeColor("stage")}>Stage</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getActivityTypeColor("evenement")}>Événement</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Planning;
