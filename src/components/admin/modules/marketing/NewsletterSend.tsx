import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Mail } from "lucide-react";

interface Props {
  testEmail: string;
  setTestEmail: (s: string) => void;
  isLoading: boolean;
  hasActiveFilters: boolean;
  estimatedAudience: number | null;
  onSend: (isTest: boolean) => void;
}

export function NewsletterSend({ testEmail, setTestEmail, isLoading, hasActiveFilters, estimatedAudience, onSend }: Props) {
  return (
    <div className="space-y-4">
      {/* Test */}
      <Card className="border-blue-200 bg-blue-50/20 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4" /> Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder="votre-email@gmail.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full border-blue-300 text-blue-700 dark:text-blue-300"
            onClick={() => onSend(true)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer un test
          </Button>
        </CardContent>
      </Card>

      {/* Production */}
      <Card className="border-green-200 bg-green-50/20 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2 text-sm">
            <Send className="h-4 w-4" /> Diffusion
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            {hasActiveFilters ? (
              <>Envoi ciblé : <Badge variant="secondary" className="text-xs">{estimatedAudience ?? "..."} contacts</Badge></>
            ) : (
              <>Tous les inscrits : <Badge variant="secondary" className="text-xs">{estimatedAudience ?? "..."}</Badge></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onSend(false)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer la campagne
          </Button>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/20 dark:bg-green-950/20">
        <CardContent className="pt-3">
          <p className="text-xs text-green-800 dark:text-green-200">
            <strong>✅ Domaine vérifié :</strong> Envoi depuis{" "}
            <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-[10px]">newsletter@ferme-equestre-arwen.com</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
