import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Activity = Tables<"activities">;
type ActivitySlot = Tables<"activity_slots">;

// Arborescence Pays → Régions selon le fichier transmis
const COUNTRIES_HIERARCHY: Record<string, string[]> = {
  "France": ["Bretagne", "Vosges", "Normandie", "Provence"],
  "Maroc": ["Maroc", "Désert", "Atlas", "Côte Atlantique"],
  "Europe": ["Ecosse", "Highlands", "Île de Skye"],
  "Asie": ["Mongolie", "Steppes", "Gobi"],
};

const COUNTRY_OPTIONS = Object.keys(COUNTRIES_HIERARCHY);

export function AdminActivities() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitySlots, setActivitySlots] = useState<Record<string, ActivitySlot[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivityForSlots, setSelectedActivityForSlots] = useState<Activity | null>(null);
  const [newSlot, setNewSlot] = useState({
    start_date: null as Date | null,
    end_date: null as Date | null,
    price: "",
    max_participants: "8",
  });
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    short_description: "",
    activity_type: "randonnee" as "randonnee" | "cours" | "stage" | "sejour" | "hebergement",
    location: "",
    region: "",
    country: "France",
    duration: "",
    price_from: "",
    price_to: "",
    max_participants: "8",
    riding_level: "debutant" as "debutant" | "intermediaire" | "confirme" | "expert",
    is_active: true,
    is_featured: false,
  });

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setActivities(data || []);
      // Fetch slots for all activities
      if (data && data.length > 0) {
        const { data: slotsData } = await supabase
          .from("activity_slots")
          .select("*")
          .in("activity_id", data.map(a => a.id))
          .order("start_date", { ascending: true });
        
        if (slotsData) {
          const grouped: Record<string, ActivitySlot[]> = {};
          slotsData.forEach(slot => {
            if (slot.activity_id) {
              if (!grouped[slot.activity_id]) grouped[slot.activity_id] = [];
              grouped[slot.activity_id].push(slot);
            }
          });
          setActivitySlots(grouped);
        }
      }
    }
    setIsLoading(false);
  };

  const fetchSlotsForActivity = async (activityId: string) => {
    const { data } = await supabase
      .from("activity_slots")
      .select("*")
      .eq("activity_id", activityId)
      .order("start_date", { ascending: true });
    
    if (data) {
      setActivitySlots(prev => ({ ...prev, [activityId]: data }));
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Gestion des créneaux
  const handleAddSlot = async () => {
    if (!selectedActivityForSlots || !newSlot.start_date || !newSlot.end_date) {
      toast({ title: "Erreur", description: "Veuillez remplir les dates", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("activity_slots").insert({
      activity_id: selectedActivityForSlots.id,
      start_date: format(newSlot.start_date, "yyyy-MM-dd"),
      end_date: format(newSlot.end_date, "yyyy-MM-dd"),
      price: newSlot.price ? parseFloat(newSlot.price) : null,
      max_participants: newSlot.max_participants ? parseInt(newSlot.max_participants) : 8,
      is_available: true,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Créneau ajouté" });
      fetchSlotsForActivity(selectedActivityForSlots.id);
      setNewSlot({ start_date: null, end_date: null, price: "", max_participants: "8" });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Supprimer ce créneau ?")) return;
    
    const { error } = await supabase.from("activity_slots").delete().eq("id", slotId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Créneau supprimé" });
      if (selectedActivityForSlots) {
        fetchSlotsForActivity(selectedActivityForSlots.id);
      }
    }
  };

  const openSlotsDialog = (activity: Activity) => {
    setSelectedActivityForSlots(activity);
    fetchSlotsForActivity(activity.id);
    setIsSlotsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData = {
      ...formData,
      price_from: formData.price_from ? parseFloat(formData.price_from) : null,
      price_to: formData.price_to ? parseFloat(formData.price_to) : null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : 8,
    };

    let error;
    const isNewActivity = !editingActivity;

    if (editingActivity) {
      const { error: updateError } = await supabase
        .from("activities")
        .update(activityData)
        .eq("id", editingActivity.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("activities")
        .insert([activityData]);
      error = insertError;
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingActivity ? "Activité mise à jour" : "Activité créée" });
      
      // Send notification to subscribers for new activities
      if (isNewActivity && activityData.is_active) {
        try {
          await supabase.functions.invoke("notify-subscribers", {
            body: {
              type: "nouvelle_activite",
              data: {
                title: activityData.title,
                description: activityData.short_description || activityData.description,
                activityType: activityData.activity_type,
                location: activityData.location,
                price: activityData.price_from,
              },
            },
          });
          toast({ title: "Notification envoyée aux abonnés" });
        } catch (notifyError) {
          console.error("Error notifying subscribers:", notifyError);
        }
      }
      
      resetForm();
      setIsDialogOpen(false);
    }
    
    fetchActivities();
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      slug: activity.slug,
      description: activity.description || "",
      short_description: activity.short_description || "",
      activity_type: activity.activity_type,
      location: activity.location || "",
      region: activity.region || "",
      country: activity.country || "France",
      duration: activity.duration || "",
      price_from: activity.price_from?.toString() || "",
      price_to: activity.price_to?.toString() || "",
      max_participants: activity.max_participants?.toString() || "8",
      riding_level: activity.riding_level || "debutant",
      is_active: activity.is_active ?? true,
      is_featured: activity.is_featured ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette activité ?")) return;

    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Activité supprimée" });
      fetchActivities();
    }
  };

  const resetForm = () => {
    setEditingActivity(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      short_description: "",
      activity_type: "randonnee",
      location: "",
      region: "",
      country: "France",
      duration: "",
      price_from: "",
      price_to: "",
      max_participants: "8",
      riding_level: "debutant",
      is_active: true,
      is_featured: false,
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des activités</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle activité</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingActivity ? "Modifier l'activité" : "Nouvelle activité"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Description courte</Label>
                <Input id="short_description" value={formData.short_description} onChange={(e) => setFormData({...formData, short_description: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description complète</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity_type">Type d'activité *</Label>
                  <Select value={formData.activity_type} onValueChange={(v: any) => setFormData({...formData, activity_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="randonnee">Randonnée</SelectItem>
                      <SelectItem value="cours">Cours</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="sejour">Séjour</SelectItem>
                      <SelectItem value="hebergement">Hébergement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riding_level">Niveau requis</Label>
                  <Select value={formData.riding_level} onValueChange={(v: any) => setFormData({...formData, riding_level: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debutant">Débutant</SelectItem>
                      <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                      <SelectItem value="confirme">Confirmé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Pays / Zone *</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(v) => setFormData({...formData, country: v, region: ""})}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Région *</Label>
                  <Select 
                    value={formData.region} 
                    onValueChange={(v) => setFormData({...formData, region: v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {(COUNTRIES_HIERARCHY[formData.country] || []).map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lieu</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="ex: Ferme An Arwen" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée</Label>
                  <Input id="duration" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="ex: 3 jours" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_from">Prix min (€)</Label>
                  <Input id="price_from" type="number" value={formData.price_from} onChange={(e) => setFormData({...formData, price_from: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_to">Prix max (€)</Label>
                  <Input id="price_to" type="number" value={formData.price_to} onChange={(e) => setFormData({...formData, price_to: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Places max</Label>
                  <Input id="max_participants" type="number" value={formData.max_participants} onChange={(e) => setFormData({...formData, max_participants: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                  Actif
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({...formData, is_featured: e.target.checked})} />
                  Mis en avant
                </label>
              </div>

              <Button type="submit" className="w-full">{editingActivity ? "Mettre à jour" : "Créer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {activities.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{activity.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activity.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {activity.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" />
                    {activity.country} • {activity.region || "—"} • {activity.activity_type}
                    {activity.price_from ? ` • ${activity.price_from}€` : ""}{activity.price_to ? ` - ${activity.price_to}€` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openSlotsDialog(activity)}>
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Créneaux ({activitySlots[activity.id]?.length || 0})
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(activity)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de gestion des créneaux */}
      <Dialog open={isSlotsDialogOpen} onOpenChange={setIsSlotsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Créneaux - {selectedActivityForSlots?.title}
            </DialogTitle>
          </DialogHeader>

          {/* Formulaire d'ajout de créneau */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3">Ajouter un créneau</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date début *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newSlot.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newSlot.start_date ? format(newSlot.start_date, "dd/MM/yyyy") : "Choisir"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newSlot.start_date || undefined}
                      onSelect={(d) => setNewSlot({...newSlot, start_date: d || null})}
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Date fin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newSlot.end_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newSlot.end_date ? format(newSlot.end_date, "dd/MM/yyyy") : "Choisir"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newSlot.end_date || undefined}
                      onSelect={(d) => setNewSlot({...newSlot, end_date: d || null})}
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Prix (€)</Label>
                <Input 
                  type="number" 
                  value={newSlot.price} 
                  onChange={(e) => setNewSlot({...newSlot, price: e.target.value})}
                  placeholder="1200"
                />
              </div>
              <div className="space-y-2">
                <Label>Places</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={newSlot.max_participants} 
                    onChange={(e) => setNewSlot({...newSlot, max_participants: e.target.value})}
                  />
                  <Button onClick={handleAddSlot}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des créneaux */}
          {selectedActivityForSlots && activitySlots[selectedActivityForSlots.id]?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Nuitées</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Places</TableHead>
                  <TableHead>Inscrits</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitySlots[selectedActivityForSlots.id].map((slot) => {
                  const startDate = new Date(slot.start_date);
                  const endDate = new Date(slot.end_date);
                  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <TableRow key={slot.id}>
                      <TableCell>{format(startDate, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{format(endDate, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{nights}</TableCell>
                      <TableCell>{slot.price ? `${slot.price} €` : "—"}</TableCell>
                      <TableCell>{slot.max_participants || "—"}</TableCell>
                      <TableCell>{slot.current_participants || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun créneau défini pour cette activité.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
