import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, MapPin, Users, Home, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isWithinInterval, parseISO, isBefore, startOfDay, addDays, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  booking_id?: string | null;
}

interface AvailabilityRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const Planning = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activitySlots, setActivitySlots] = useState<ActivitySlot[]>([]);
  const [accommodationSlots, setAccommodationSlots] = useState<AccommodationSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Dialog states
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [requestType, setRequestType] = useState<"activity" | "accommodation">("activity");
  const [selectedActivity, setSelectedActivity] = useState<ActivitySlot | null>(null);
  const [requestForm, setRequestForm] = useState<AvailabilityRequest>({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkUser();
    fetchData();
  }, [currentMonth]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setRequestForm(prev => ({
          ...prev,
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
          email: user.email || "",
          phone: profile.phone || "",
        }));
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Fetch ALL future activity slots with activity details (not limited by currentMonth)
    const { data: slots } = await supabase
      .from("activity_slots")
      .select(`
        *,
        activity:activities(title, location, activity_type, featured_image)
      `)
      .gte("end_date", today)
      .order("start_date", { ascending: true });

    // Fetch accommodation availability for visible calendar range
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
      randonnee: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
      sejour: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      stage: "bg-amber-500/20 text-amber-700 border-amber-500/30",
      cours: "bg-purple-500/20 text-purple-700 border-purple-500/30",
    };
    return colors[type] || "bg-muted text-muted-foreground border-muted";
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      randonnee: "Randonnée",
      sejour: "Séjour",
      stage: "Stage",
      cours: "Cours",
    };
    return labels[type] || type;
  };

  // Filter out hébergement and get only equestrian activities
  const filteredActivitySlots = activitySlots.filter(
    (slot) => slot.activity?.activity_type !== "hebergement"
  );

  // Get next 3 upcoming activities from today
  const today = startOfDay(new Date());
  const upcomingActivities = filteredActivitySlots
    .filter((slot) => !isBefore(parseISO(slot.end_date), today))
    .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())
    .slice(0, 3);

  const getDatesWithActivities = () => {
    const dates: Date[] = [];
    filteredActivitySlots.forEach((slot) => {
      const start = parseISO(slot.start_date);
      const end = parseISO(slot.end_date);
      let current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current = addDays(current, 1);
      }
    });
    return dates;
  };

  // Generate all dates in the visible range
  const getAccommodationDatesInRange = () => {
    const start = startOfMonth(subMonths(currentMonth, 1));
    const end = endOfMonth(addMonths(currentMonth, 2));
    return eachDayOfInterval({ start, end });
  };

  // Get available dates for accommodation - dates NOT booked or marked unavailable
  const getAvailableAccommodationDates = () => {
    const allDates = getAccommodationDatesInRange();
    const today = startOfDay(new Date());
    
    return allDates.filter(date => {
      if (isBefore(date, today)) return false;
      
      const slot = accommodationSlots.find(s => isSameDay(parseISO(s.date), date));
      // Available if: no slot exists OR (slot exists AND is_available is true AND no booking)
      if (!slot) return true;
      return slot.is_available && !slot.booking_id;
    });
  };

  // Get booked dates
  const getBookedAccommodationDates = () => {
    return accommodationSlots
      .filter(s => !s.is_available || s.booking_id)
      .map(s => parseISO(s.date));
  };

  const getActivitiesForDate = (date: Date) => {
    return filteredActivitySlots.filter((slot) => {
      const start = parseISO(slot.start_date);
      const end = parseISO(slot.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const getAccommodationForDate = (date: Date) => {
    const slot = accommodationSlots.find((slot) => isSameDay(parseISO(slot.date), date));
    // If no slot exists, it's available by default
    if (!slot) {
      return {
        id: "default",
        date: format(date, "yyyy-MM-dd"),
        is_available: true,
        price_per_night: 80,
        name: "Yourte An Arwen",
        booking_id: null,
      };
    }
    return slot;
  };

  const handleReserveActivity = (slot: ActivitySlot) => {
    // Redirect to quote form with pre-filled activity
    navigate(`/demande-devis?activity=${slot.activity?.title || ""}&date=${slot.start_date}`);
  };

  const handleRequestAvailability = (type: "activity" | "accommodation", activity?: ActivitySlot) => {
    setRequestType(type);
    setSelectedActivity(activity || null);
    setShowAvailabilityDialog(true);
  };

  const handleSubmitAvailabilityRequest = async () => {
    if (!requestForm.name || !requestForm.email) {
      toast.error("Veuillez renseigner votre nom et email");
      return;
    }

    setSubmitting(true);

    try {
      // Call the notify-admin edge function
      const { error } = await supabase.functions.invoke("notify-admin", {
        body: {
          type: "disponibilite",
          data: {
            name: requestForm.name,
            email: requestForm.email,
            phone: requestForm.phone,
            date: selectedDate ? format(selectedDate, "dd/MM/yyyy") : undefined,
            activityTitle: selectedActivity?.activity?.title,
            accommodationName: requestType === "accommodation" ? "Yourte An Arwen" : undefined,
            message: requestForm.message,
          },
        },
      });

      if (error) throw error;

      // Also save to contact_requests table
      await supabase.from("contact_requests").insert({
        name: requestForm.name,
        email: requestForm.email,
        phone: requestForm.phone,
        subject: `Demande de disponibilité - ${requestType === "accommodation" ? "Yourte An Arwen" : selectedActivity?.activity?.title}`,
        message: `Date demandée: ${selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Non précisée"}\n\n${requestForm.message}`,
        preferred_date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
      });

      toast.success("Votre demande a été envoyée ! Nous vous répondrons rapidement.");
      setShowAvailabilityDialog(false);
      setRequestForm(prev => ({ ...prev, message: "" }));
    } catch (error: any) {
      console.error("Error sending availability request:", error);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReserveAccommodation = () => {
    if (!selectedDate) return;
    navigate(`/demande-devis?accommodation=yourte&date=${format(selectedDate, "yyyy-MM-dd")}`);
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
                  {/* Calendar for Activities only - Hébergement tab removed */}
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
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-4 justify-center">
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                      Randonnée
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-700 border-blue-500/30">
                      Séjour
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                      Stage
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-700 border-purple-500/30">
                      Cours
                    </Badge>
                  </div>
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
                  ) : upcomingActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Aucune activité programmée pour le moment.
                      </p>
                      <Button variant="outline" onClick={() => navigate("/destinations")}>
                        Découvrez nos destinations
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingActivities.map((slot) => (
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
                                <div className="flex gap-2 mt-3">
                                  <Button 
                                    className="flex-1" 
                                    size="sm"
                                    onClick={() => handleReserveActivity(slot)}
                                  >
                                    Réserver
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRequestAvailability("activity", slot)}
                                  >
                                    Demander info
                                  </Button>
                                </div>
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
                        {selectedAccommodation ? (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{selectedAccommodation.name}</span>
                              <Badge
                                variant={selectedAccommodation.is_available && !selectedAccommodation.booking_id ? "default" : "destructive"}
                              >
                                {selectedAccommodation.is_available && !selectedAccommodation.booking_id ? "Disponible" : "Réservé"}
                              </Badge>
                            </div>
                            {selectedAccommodation.is_available && !selectedAccommodation.booking_id && (
                              <>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {selectedAccommodation.price_per_night}€ / nuit
                                </p>
                                <div className="flex gap-2 mt-3">
                                  <Button 
                                    className="flex-1" 
                                    size="sm"
                                    onClick={handleReserveAccommodation}
                                  >
                                    Réserver
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRequestAvailability("accommodation")}
                                  >
                                    Demander dispo
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-sm text-muted-foreground">
                              Date passée
                            </p>
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

      {/* Availability Request Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander des informations</DialogTitle>
            <DialogDescription>
              {requestType === "activity" 
                ? `Demande concernant : ${selectedActivity?.activity?.title || "Activité"}`
                : `Demande concernant : Yourte An Arwen`}
              {selectedDate && ` - ${format(selectedDate, "dd/MM/yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="req-name">Nom *</Label>
                <Input
                  id="req-name"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <Label htmlFor="req-email">Email *</Label>
                <Input
                  id="req-email"
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="votre@email.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="req-phone">Téléphone</Label>
              <Input
                id="req-phone"
                value={requestForm.phone}
                onChange={(e) => setRequestForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <Label htmlFor="req-message">Message</Label>
              <Textarea
                id="req-message"
                value={requestForm.message}
                onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Précisez votre demande, le nombre de participants, vos questions..."
                rows={4}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSubmitAvailabilityRequest}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer ma demande
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Planning;
