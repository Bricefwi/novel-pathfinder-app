import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, MapPin, Users, Euro, Calendar, Trash2, ExternalLink, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

interface SlotEditData {
  slotId: string;
  maxParticipants: number;
  currentParticipants: number;
  activityTitle: string;
  startDate: string;
  endDate: string;
}

export function StockListView({ activities, onEdit }: StockListViewProps) {
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: Activity | null }>({
    open: false,
    activity: null,
  });
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [editSlot, setEditSlot] = useState<SlotEditData | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error: slotsError } = await supabase
        .from("activity_slots")
        .delete()
        .eq("activity_id", activityId);
      if (slotsError) throw slotsError;
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

  const updateSlotMutation = useMutation({
    mutationFn: async ({ slotId, maxParticipants, currentParticipants }: { slotId: string; maxParticipants: number; currentParticipants: number }) => {
      const { error } = await supabase
        .from("activity_slots")
        .update({
          max_participants: maxParticipants,
          current_participants: currentParticipants,
          is_available: currentParticipants < maxParticipants,
        })
        .eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Places mises à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditSlot(null);
    },
    onError: (error) => {
      console.error("Update slot error:", error);
      toast.error("Erreur lors de la mise à jour des places");
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

  const toggleExpand = (activityId: string) => {
    setExpandedActivity(prev => prev === activityId ? null : activityId);
  };

  const handleSaveSlot = () => {
    if (!editSlot) return;
    if (editSlot.currentParticipants < 0 || editSlot.maxParticipants < 1) {
      toast.error("Valeurs invalides");
      return;
    }
    if (editSlot.currentParticipants > editSlot.maxParticipants) {
      toast.error("Les participants actuels ne peuvent pas dépasser le maximum");
      return;
    }
    updateSlotMutation.mutate({
      slotId: editSlot.slotId,
      maxParticipants: editSlot.maxParticipants,
      currentParticipants: editSlot.currentParticipants,
    });
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
        {activities.map((activity) => {
          const isExpanded = expandedActivity === activity.id;
          const totalMax = activity.slots.reduce((a, s) => a + (s.max_participants || 0), 0);
          const totalCurrent = activity.slots.reduce((a, s) => a + (s.current_participants || 0), 0);
          const remaining = totalMax - totalCurrent;

          return (
            <Card key={activity.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-0">
                {/* Activity row */}
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
                        {remaining <= 0
                          ? <span className="font-semibold text-destructive">Complet</span>
                          : `${remaining} places restantes`}
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
                      {activity.slots.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(activity.id)}
                          title="Voir les créneaux"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild title="Voir sur le site">
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

                {/* Expanded slots */}
                {isExpanded && activity.slots.length > 0 && (
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Créneaux ({activity.slots.length})
                    </p>
                    {activity.slots
                      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                      .map((slot) => {
                        const slotRemaining = (slot.max_participants || 0) - (slot.current_participants || 0);
                        const slotOccupancy = slot.max_participants
                          ? ((slot.current_participants || 0) / slot.max_participants) * 100
                          : 0;

                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
                              <span className="text-sm font-medium whitespace-nowrap">
                                {format(new Date(slot.start_date), "dd MMM", { locale: fr })} → {format(new Date(slot.end_date), "dd MMM yyyy", { locale: fr })}
                              </span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {slot.current_participants || 0} / {slot.max_participants || 0}
                              </span>
                              {slotRemaining <= 0 ? (
                                <Badge variant="destructive" className="text-xs">Complet</Badge>
                              ) : slotRemaining <= 2 ? (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                                  {slotRemaining} place{slotRemaining > 1 ? "s" : ""} restante{slotRemaining > 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                                  {slotRemaining} places restantes
                                </Badge>
                              )}
                              {slot.price && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  {slot.price}€
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 hidden sm:block">
                                <Progress value={slotOccupancy} className="h-1.5" />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditSlot({
                                  slotId: slot.id,
                                  maxParticipants: slot.max_participants || 0,
                                  currentParticipants: slot.current_participants || 0,
                                  activityTitle: activity.title,
                                  startDate: slot.start_date,
                                  endDate: slot.end_date,
                                })}
                                className="gap-1 text-xs"
                              >
                                <Pencil className="h-3 w-3" />
                                Places
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Slot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={(open) => !open && setEditSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Modifier les places
            </DialogTitle>
            <DialogDescription>
              {editSlot && (
                <>
                  <strong>{editSlot.activityTitle}</strong>
                  <br />
                  {format(new Date(editSlot.startDate), "dd MMMM yyyy", { locale: fr })} → {format(new Date(editSlot.endDate), "dd MMMM yyyy", { locale: fr })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editSlot && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="max-participants">Places maximum</Label>
                <Input
                  id="max-participants"
                  type="number"
                  min={1}
                  value={editSlot.maxParticipants}
                  onChange={(e) => setEditSlot({ ...editSlot, maxParticipants: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Capacité totale pour ce créneau</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-participants">Places occupées</Label>
                <Input
                  id="current-participants"
                  type="number"
                  min={0}
                  max={editSlot.maxParticipants}
                  value={editSlot.currentParticipants}
                  onChange={(e) => setEditSlot({ ...editSlot, currentParticipants: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Nombre de participants déjà inscrits</p>
              </div>

              {/* Live preview */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Aperçu</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Places restantes :</span>
                  <span className="font-bold text-lg">
                    {Math.max(0, editSlot.maxParticipants - editSlot.currentParticipants)}
                  </span>
                </div>
                <Progress
                  value={editSlot.maxParticipants > 0
                    ? (editSlot.currentParticipants / editSlot.maxParticipants) * 100
                    : 0}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {editSlot.currentParticipants} / {editSlot.maxParticipants} ({editSlot.maxParticipants > 0
                    ? Math.round((editSlot.currentParticipants / editSlot.maxParticipants) * 100)
                    : 0}%)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Annuler</Button>
            <Button onClick={handleSaveSlot} disabled={updateSlotMutation.isPending} className="gap-2">
              {updateSlotMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
