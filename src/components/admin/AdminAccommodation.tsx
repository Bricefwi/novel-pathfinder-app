import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fr } from "date-fns/locale";
import { format } from "date-fns";

export function AdminAccommodation() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pricePerNight, setPricePerNight] = useState("80");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from("accommodation_slots")
      .select("*")
      .gte("date", new Date().toISOString().split("T")[0]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const booked = data?.filter(s => s.booking_id).map(s => new Date(s.date)) || [];
      const unavailable = data?.filter(s => !s.is_available && !s.booking_id).map(s => new Date(s.date)) || [];
      setBookedDates(booked);
      setUnavailableDates(unavailable);
      
      if (data && data.length > 0 && data[0].price_per_night) {
        setPricePerNight(data[0].price_per_night.toString());
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleUpdatePrice = async () => {
    const { error } = await supabase
      .from("accommodation_slots")
      .update({ price_per_night: parseFloat(pricePerNight) })
      .gte("date", new Date().toISOString().split("T")[0]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prix mis à jour" });
    }
  };

  const toggleAvailability = async () => {
    if (selectedDates.length === 0) return;

    for (const date of selectedDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Check if slot exists
      const { data: existing } = await supabase
        .from("accommodation_slots")
        .select("*")
        .eq("date", dateStr)
        .single();

      if (existing) {
        // Toggle availability
        await supabase
          .from("accommodation_slots")
          .update({ is_available: !existing.is_available })
          .eq("id", existing.id);
      } else {
        // Create slot as unavailable
        await supabase
          .from("accommodation_slots")
          .insert({ date: dateStr, is_available: false, price_per_night: parseFloat(pricePerNight) });
      }
    }

    toast({ title: "Disponibilités mises à jour" });
    setSelectedDates([]);
    fetchSlots();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Gestion de l'hébergement</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tarif par nuit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdatePrice}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Ce tarif sera appliqué à toutes les nuits futures.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendrier des disponibilités</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              locale={fr}
              disabled={(date) => date < new Date()}
              modifiers={{
                booked: bookedDates,
                unavailable: unavailableDates,
              }}
              modifiersClassNames={{
                booked: "bg-destructive/20 text-destructive",
                unavailable: "bg-muted line-through",
              }}
              className="rounded-md border"
            />
            <div className="flex gap-4 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-destructive/20"></span>
                Réservé
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-muted"></span>
                Indisponible
              </span>
            </div>
            {selectedDates.length > 0 && (
              <Button onClick={toggleAvailability} className="w-full mt-4">
                Basculer disponibilité ({selectedDates.length} date{selectedDates.length > 1 ? "s" : ""})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Réservations récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les réservations sont visibles dans le tableau de bord principal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
