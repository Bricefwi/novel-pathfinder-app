import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Wand2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface NewsletterEditorProps {
  subject: string;
  setSubject: (s: string) => void;
  content: string;
  setContent: (s: string) => void;
}

export function NewsletterEditor({ subject, setSubject, content, setContent }: NewsletterEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("engageant");

  const generateWithAI = async () => {
    const prompt = aiPrompt.trim() || "Rédige une newsletter promotionnelle pour les prochains séjours équestres.";
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { prompt, tone: aiTone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setContent(data.content || "");
      if (data.suggestedSubject) setSubject(data.suggestedSubject);
      toast.success("Contenu généré par l'IA !");
    } catch (err: unknown) {
      toast.error("Erreur IA : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Créer une Newsletter
        </CardTitle>
        <CardDescription>Rédigez ou utilisez l'IA pour générer du contenu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Assistant */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Assistant IA
            </div>
            <Textarea
              placeholder="Décrivez le contenu souhaité : ex. 'Newsletter sur les séjours au Maroc pour cavaliers confirmés, avec promotion printemps'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="text-sm rounded-md border border-input bg-background px-3 py-1.5"
              >
                <option value="engageant">🔥 Engageant</option>
                <option value="informatif">📰 Informatif</option>
                <option value="promotionnel">🎯 Promotionnel</option>
                <option value="inspirant">✨ Inspirant</option>
              </select>
              <Button
                variant="default"
                size="sm"
                onClick={generateWithAI}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Génération...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" />Générer avec l'IA</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sujet de l'email</label>
          <Input
            placeholder="Ex: 🐎 Découvrez nos nouvelles randonnées..."
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
            rows={14}
            className="resize-none font-mono text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
