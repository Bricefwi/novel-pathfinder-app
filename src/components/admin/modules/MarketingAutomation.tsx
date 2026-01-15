import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Zap, Mail, Users, Bell, Clock, Plus } from "lucide-react";

export function MarketingAutomation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Marketing Automation
          <Badge variant="secondary" className="ml-2">Bientôt disponible</Badge>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatisez vos campagnes et workflows marketing
        </p>
      </div>

      {/* Coming Soon Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-amber-500" />
              Workflow Editor
            </CardTitle>
            <CardDescription>
              Créez des règles d'automatisation simples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Exemple de règle :</p>
              <p>SI nouveau séjour créé dans [Mongolie]</p>
              <p>ALORS notifier abonnés intéressés par [Mongolie]</p>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Créer un workflow
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-blue-500" />
              Campagnes Email
            </CardTitle>
            <CardDescription>
              Newsletters et emails automatisés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Segmentation automatique</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Notifications push</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Programmation avancée</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle campagne
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-500" />
              Segments Dynamiques
            </CardTitle>
            <CardDescription>
              Groupes de clients mis à jour automatiquement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">VIP (2+ voyages)</Badge>
              <Badge variant="outline" className="mr-2">Prospects chauds</Badge>
              <Badge variant="outline" className="mr-2">Mongolie</Badge>
              <Badge variant="outline" className="mr-2">Maroc</Badge>
              <Badge variant="outline">Débutants</Badge>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Créer un segment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Module en développement</h3>
              <p className="text-muted-foreground mt-1">
                Le module Marketing Automation sera disponible prochainement. 
                Il vous permettra de créer des workflows automatisés pour engager vos clients 
                au bon moment avec le bon message.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
