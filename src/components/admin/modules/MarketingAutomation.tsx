import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Wand2, Mail, Megaphone } from "lucide-react";
import { toast } from "sonner";

export function MarketingAutomation() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fonction : Génération IA (Simulation Client pour rapidité)
  const generateContent = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setSubject("🐎 Découvrez la magie du désert Marocain");
      setContent(
        `Bonjour,

Envie d'évasion ? Rejoignez-nous pour une aventure inoubliable à cheval à travers les paysages somptueux du Maroc.

🌅 Au programme :
• Randonnées sur les plages d'Essaouira
• Traversée des dunes dorées du désert
• Nuits sous les étoiles en bivouac

📅 Prochains départs disponibles - Places limitées !

Contactez-nous dès maintenant pour réserver votre place.

À très bientôt sur les sentiers,
L'équipe de la Ferme Équestre An Arwen

---
Pour vous désinscrire, répondez à cet email.`
      );
      setIsGenerating(false);
      toast.success("Contenu généré avec succès !");
    }, 1500);
  };

  // Fonction : Envoi Email (Test ou Réel)
  const handleSend = async (isTest: boolean) => {
    if (!subject || !content) {
      toast.error("Veuillez remplir le sujet et le contenu");
      return;
    }
    if (isTest && !testEmail) {
      toast.error("Veuillez entrer une adresse email de test");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[Marketing] Envoi en cours...", { subject, isTest, testEmail: isTest ? testEmail : undefined });
      
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: {
          subject: isTest ? `[TEST] ${subject}` : subject,
          content: content.replace(/\n/g, "<br>"), // Conversion simple saut de ligne HTML
          testEmail: isTest ? testEmail : undefined,
        },
      });

      console.log("[Marketing] Réponse:", { data, error });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(isTest ? "✅ Email de test envoyé !" : "🚀 Campagne envoyée avec succès !");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[Marketing] Erreur envoi:", err);
      toast.error("Erreur lors de l'envoi : " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Marketing Intelligence
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Créez et envoyez des newsletters à vos clients
        </p>
      </div>

      {/* Grille 2 colonnes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne Gauche : Éditeur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Créer une Newsletter
            </CardTitle>
            <CardDescription>
              Rédigez votre message ou utilisez l'IA pour générer un brouillon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sujet de l'email</label>
              <Input
                placeholder="Ex: Découvrez nos nouvelles randonnées..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Contenu du message</label>
              <Textarea
                placeholder="Écrivez votre message ici..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="resize-none"
              />
            </div>

            <Button
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/10 text-primary"
              onClick={generateContent}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Générer un brouillon avec IA
            </Button>
          </CardContent>
        </Card>

        {/* Colonne Droite : Diffusion */}
        <div className="space-y-6">
          {/* Zone Test */}
          <Card className="border-blue-200 bg-blue-50/20 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Envoyer un Test
              </CardTitle>
              <CardDescription>
                Testez votre email avant de l'envoyer à tous vos abonnés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                placeholder="votre-email@gmail.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
                onClick={() => handleSend(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Tester l'envoi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Zone Production */}
          <Card className="border-green-200 bg-green-50/20 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                <Send className="h-5 w-5" />
                Diffusion Globale
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Audience estimée : <Badge variant="secondary">Tous les inscrits</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleSend(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer la campagne maintenant
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                L'email sera envoyé à l'adresse administrateur configurée
              </p>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="border-amber-200 bg-amber-50/20 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>💡 Conseil :</strong> Testez toujours votre email avant l'envoi final.
                Pour envoyer à une liste d'abonnés, configurez votre domaine vérifié dans Resend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
