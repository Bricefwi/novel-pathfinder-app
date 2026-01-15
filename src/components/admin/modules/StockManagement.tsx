import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, addDays, differenceInDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Package,
  Plus,
  Calendar as CalendarIcon,
  List,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  MapPin,
  Euro,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { ActivityWizard } from "./stock/ActivityWizard";
import { StockListView } from "./stock/StockListView";
import type { Tables } from "@/integrations/supabase/types";

type Activity = Tables<"activities">;
type ActivitySlot = Tables<"activity_slots">;

interface ActivityWithSlots extends Activity {
  slots: ActivitySlot[];
  occupancyRate: number;
  status: "available" | "low" | "full";
}

export function StockManagement() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Fetch activities with their slots
  const { data: activitiesWithSlots, isLoading } = useQuery({
    queryKey: ["stock-management"],
    queryFn: async () => {
      const [activitiesRes, slotsRes] = await Promise.all([
        supabase
          .from("activities")
          .select("*")
          .eq("activity_type", "sejour")
          .order("created_at", { ascending: false }),
        supabase
          .from("activity_slots")
          .select("*")
          .gte("start_date", new Date().toISOString().split("T")[0]),
      ]);

      if (activitiesRes.error) throw activitiesRes.error;
      if (slotsRes.error) throw slotsRes.error;

      const activities = activitiesRes.data || [];
      const slots = slotsRes.data || [];

      // Map slots to activities with occupancy calculation
      const activitiesMap: ActivityWithSlots[] = activities.map((activity) => {
        const activitySlots = slots.filter((s) => s.activity_id === activity.id);
        const totalCapacity = activitySlots.reduce((acc, s) => acc + (s.max_participants || 0), 0);
        const currentOccupancy = activitySlots.reduce((acc, s) => acc + (s.current_participants || 0), 0);
        const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;

        let status: "available" | "low" | "full" = "available";
        if (occupancyRate >= 100) status = "full";
        else if (occupancyRate < 20) status = "low";

        return {
          ...activity,
          slots: activitySlots,
          occupancyRate,
          status,
        };
      });

      return activitiesMap;
    },
  });

  // Fetch all slots for calendar
  const { data: calendarEvents } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_slots")
        .select("*, activities(title, country, region)")
        .gte("start_date", new Date().toISOString().split("T")[0]);

      if (error) throw error;

      return (data || []).map((slot) => {
        const occupancy = slot.max_participants 
          ? ((slot.current_participants || 0) / slot.max_participants) * 100 
          : 0;
        
        let backgroundColor = "hsl(var(--primary))"; // Available
        if (occupancy >= 100) backgroundColor = "hsl(var(--destructive))"; // Full
        else if (occupancy < 20 && differenceInDays(new Date(slot.start_date), new Date()) <= 30) {
          backgroundColor = "hsl(45, 93%, 47%)"; // Yield warning - orange
        }

        return {
          id: slot.id,
          title: `${slot.activities?.title || "Séjour"} (${slot.current_participants || 0}/${slot.max_participants || 0})`,
          start: slot.start_date,
          end: slot.end_date,
          backgroundColor,
          borderColor: backgroundColor,
          extendedProps: {
            slot,
            occupancy,
          },
        };
      });
    },
  });

  // Stats calculation
  const stats = {
    total: activitiesWithSlots?.length || 0,
    available: activitiesWithSlots?.filter((a) => a.status === "available").length || 0,
    low: activitiesWithSlots?.filter((a) => a.status === "low").length || 0,
    full: activitiesWithSlots?.filter((a) => a.status === "full").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Gestion des Stocks & Yield
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos séjours équestres, créneaux et taux de remplissage
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Séjour
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Séjours</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remplissage faible</p>
                <p className="text-2xl font-bold text-orange-600">{stats.low}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complets</p>
                <p className="text-2xl font-bold text-red-600">{stats.full}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary" />
              Disponible
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              Yield Alert
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-destructive" />
              Complet
            </span>
          </div>
        </div>

        <TabsContent value="list" className="mt-6">
          <StockListView 
            activities={activitiesWithSlots || []} 
            onEdit={(activity) => {
              setSelectedActivity(activity);
              setWizardOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardContent className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale="fr"
                events={calendarEvents || []}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek",
                }}
                height="auto"
                eventClick={(info) => {
                  const slot = info.event.extendedProps.slot;
                  toast.info(
                    `${info.event.title}\n${format(new Date(slot.start_date), "dd MMM", { locale: fr })} - ${format(new Date(slot.end_date), "dd MMM yyyy", { locale: fr })}\nOccupation: ${Math.round(info.event.extendedProps.occupancy)}%`
                  );
                }}
                eventContent={(eventInfo) => (
                  <div className="p-1 text-xs overflow-hidden">
                    <div className="font-medium truncate">{eventInfo.event.title}</div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wizard Dialog */}
      <ActivityWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        activity={selectedActivity}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["stock-management"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
          setSelectedActivity(null);
          setWizardOpen(false);
        }}
      />
    </div>
  );
}
