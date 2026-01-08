import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Activity = Tables<"activities">;

export function AdminActivities() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
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
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData = {
      ...formData,
      price_from: formData.price_from ? parseFloat(formData.price_from) : null,
      price_to: formData.price_to ? parseFloat(formData.price_to) : null,
      max_participants: parseInt(formData.max_participants),
    };

    if (editingActivity) {
      const { error } = await supabase
        .from("activities")
        .update(activityData)
        .eq("id", editingActivity.id);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Activité mise à jour" });
        fetchActivities();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("activities")
        .insert(activityData);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Activité créée" });
        fetchActivities();
        setIsDialogOpen(false);
      }
    }
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
                  <Label htmlFor="location">Lieu</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Région</Label>
                  <Input id="region" value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
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
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{activity.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activity.activity_type} • {activity.location || "Non défini"} • 
                  {activity.price_from ? ` ${activity.price_from}€` : ""}{activity.price_to ? ` - ${activity.price_to}€` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${activity.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {activity.is_active ? "Actif" : "Inactif"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(activity)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
