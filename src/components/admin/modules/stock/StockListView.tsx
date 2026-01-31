import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, MapPin, Users, Euro, Calendar, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Activity = Tables<"activities">;
type ActivitySlot = Tables<"activity_slots">;

interface ActivityWithSlots extends Activity {
  slots: ActivitySlot[];
  occupancyRate: number;
  status: "available" | "low" | "full";
}

interface StockListViewProps {
  activities: ActivityWithSlots[];
  onEdit: (activity: Activity) => void;
}

export function StockListView({ activities, onEdit }: StockListViewProps) {
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: Activity | null }>({
    open: false,
    activity: null,
  });

  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) => {
      // First delete all related slots
      const { error: slotsError } = await supabase
        .from("activity_slots")
        .delete()
        .eq("activity_id", activityId);
      
      if (slotsError) throw slotsError;

      // Then delete the activity
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Séjour supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["sejours-grouped"] });
      setDeleteDialog({ open: false, activity: null });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression. Vérifiez qu'il n'y a pas de réservations liées.");
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      available: "bg-emerald-100 text-emerald-800 border-emerald-200",
      low: "bg-amber-100 text-amber-800 border-amber-200",
      full: "bg-destructive/10 text-destructive border-destructive/20",
    };
    const labels = { available: "Disponible", low: "Remplissage faible", full: "Complet" };
    return <Badge variant="outline" className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  const handleDelete = (activity: Activity) => {
    setDeleteDialog({ open: true, activity });
  };

  const confirmDelete = () => {
    if (deleteDialog.activity) {
      deleteMutation.mutate(deleteDialog.activity.id);
    }
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun séjour trouvé. Créez votre premier séjour !
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {activities.map((activity) => (
          <Card key={activity.id} className="overflow-hidden hover:border-primary/30 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{activity.title}</h3>
                    {getStatusBadge(activity.status)}
                    <Badge variant="secondary" className="text-xs">{activity.slug}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {activity.country || "N/A"} - {activity.region || "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {activity.duration || "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {(() => {
                        const totalMax = activity.slots.reduce((a, s) => a + (s.max_participants || 0), 0);
                        const totalCurrent = activity.slots.reduce((a, s) => a + (s.current_participants || 0), 0);
                        const remaining = totalMax - totalCurrent;
                        return remaining <= 0
                          ? <span className="font-semibold text-destructive">Complet</span>
                          : `${remaining} places restantes`;
                      })()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {activity.price_from ? `${activity.price_from}€` : "N/A"}
                      {activity.price_to ? ` - ${activity.price_to}€` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 hidden md:block">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Remplissage</span>
                      <span className="font-medium">{Math.round(activity.occupancyRate)}%</span>
                    </div>
                    <Progress value={activity.occupancyRate} className="h-2" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Voir sur le site"
                    >
                      <a href={`/sejour/${activity.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(activity)} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(activity)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le séjour <strong>"{deleteDialog.activity?.title}"</strong> ?
              <br /><br />
              Cette action est irréversible. Tous les créneaux associés seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
