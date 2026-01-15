import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pencil, MapPin, Users, Euro, Calendar } from "lucide-react";
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
  const getStatusBadge = (status: string) => {
    const styles = {
      available: "bg-green-100 text-green-800 border-green-200",
      low: "bg-orange-100 text-orange-800 border-orange-200",
      full: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = { available: "Disponible", low: "Remplissage faible", full: "Complet" };
    return <Badge variant="outline" className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
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
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{activity.title}</h3>
                  {getStatusBadge(activity.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.country} - {activity.region}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{activity.duration || "N/A"}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{activity.max_participants} places</span>
                  <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{activity.price_from}€ - {activity.price_to}€</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Remplissage</span>
                    <span className="font-medium">{Math.round(activity.occupancyRate)}%</span>
                  </div>
                  <Progress value={activity.occupancyRate} className="h-2" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => onEdit(activity)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
