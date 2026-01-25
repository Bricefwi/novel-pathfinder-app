import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Shield,
  Zap,
  Search,
  Accessibility,
  Palette,
  Code2,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
  History,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useSiteAudit,
  getSeverityBadgeVariant,
  getCategoryLabel,
  getScoreColor,
  getScoreGradient,
  type AuditReport,
  type AuditFinding,
} from "@/hooks/use-site-audit";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  security: <Shield className="h-5 w-5" />,
  performance: <Zap className="h-5 w-5" />,
  seo: <Search className="h-5 w-5" />,
  accessibility: <Accessibility className="h-5 w-5" />,
  ux: <Palette className="h-5 w-5" />,
  code: <Code2 className="h-5 w-5" />,
  code_quality: <Code2 className="h-5 w-5" />,
};

function ScoreCard({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${getScoreGradient(score)} opacity-10`} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
        <Progress value={score} className="h-2" />
      </CardContent>
    </Card>
  );
}

function FindingItem({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{CATEGORY_ICONS[finding.category]}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getSeverityBadgeVariant(finding.severity)}>
                {finding.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline">{getCategoryLabel(finding.category)}</Badge>
            </div>
            <h4 className="font-medium mt-1">{finding.title}</h4>
            {finding.location && (
              <p className="text-sm text-muted-foreground">📍 {finding.location}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="pl-10 space-y-3 pt-2 border-t">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-sm">{finding.description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Recommandation</p>
            <p className="text-sm">{finding.recommendation}</p>
          </div>
          {finding.code_example && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Exemple de code</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                <code>{finding.code_example}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditHistoryItem({
  report,
  onDelete,
  onView,
}: {
  report: AuditReport;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {report.status === "completed" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : report.status === "failed" ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">
            Audit {report.audit_type} - Score: {report.global_score ?? "N/A"}/100
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {report.status === "completed" && (
          <Button variant="outline" size="sm" onClick={onView}>
            <FileText className="h-4 w-4 mr-1" />
            Voir
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le rapport d'audit sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function SiteAudit() {
  const { auditReports, latestAudit, isLoadingReports, isRunning, runAudit, deleteAudit } =
    useSiteAudit();
  const [selectedAudit, setSelectedAudit] = useState<AuditReport | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const displayedAudit = selectedAudit || latestAudit;
  const findings = displayedAudit?.findings || [];
  const criticalFindings = findings.filter((f) => f.severity === "critical");
  const highFindings = findings.filter((f) => f.severity === "high");
  const otherFindings = findings.filter((f) => !["critical", "high"].includes(f.severity));

  if (isLoadingReports) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Audit du Site</h2>
          <p className="text-muted-foreground">
            Analyse complète avec Gemini 3 Pro • Sécurité, Performance, SEO, Accessibilité, UX,
            Code
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button onClick={() => runAudit()} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Lancer un audit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && auditReports && auditReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des audits</CardTitle>
            <CardDescription>{auditReports.length} audit(s) enregistré(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {auditReports.map((report) => (
              <AuditHistoryItem
                key={report.id}
                report={report}
                onDelete={() => deleteAudit(report.id)}
                onView={() => {
                  setSelectedAudit(report);
                  setShowHistory(false);
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* No audit yet */}
      {!displayedAudit && !isRunning && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun audit disponible</h3>
            <p className="text-muted-foreground text-center mb-4">
              Lancez votre premier audit pour analyser la qualité de votre site
            </p>
            <Button onClick={() => runAudit()}>
              <Play className="h-4 w-4 mr-2" />
              Lancer le premier audit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Running state */}
      {isRunning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2">Audit en cours...</h3>
            <p className="text-muted-foreground text-center">
              Gemini 3 Pro analyse votre application. Cela peut prendre 30-60 secondes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audit Results */}
      {displayedAudit && displayedAudit.status === "completed" && !isRunning && (
        <>
          {/* Global Score */}
          <Card className="relative overflow-hidden">
            <div
              className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(
                displayedAudit.global_score || 0
              )} opacity-10`}
            />
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-muted-foreground">Score Global</h3>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-bold ${getScoreColor(
                        displayedAudit.global_score || 0
                      )}`}
                    >
                      {displayedAudit.global_score}
                    </span>
                    <span className="text-2xl text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <Progress
                  value={displayedAudit.global_score || 0}
                  className="h-4 w-full md:w-64"
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Scores */}
          {displayedAudit.scores && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <ScoreCard
                label="Sécurité"
                score={displayedAudit.scores.security}
                icon={<Shield className="h-4 w-4" />}
              />
              <ScoreCard
                label="Performance"
                score={displayedAudit.scores.performance}
                icon={<Zap className="h-4 w-4" />}
              />
              <ScoreCard
                label="SEO"
                score={displayedAudit.scores.seo}
                icon={<Search className="h-4 w-4" />}
              />
              <ScoreCard
                label="Accessibilité"
                score={displayedAudit.scores.accessibility}
                icon={<Accessibility className="h-4 w-4" />}
              />
              <ScoreCard
                label="UX/Design"
                score={displayedAudit.scores.ux}
                icon={<Palette className="h-4 w-4" />}
              />
              <ScoreCard
                label="Code"
                score={displayedAudit.scores.code_quality}
                icon={<Code2 className="h-4 w-4" />}
              />
            </div>
          )}

          {/* Findings */}
          <Accordion type="multiple" defaultValue={["critical", "high"]} className="space-y-4">
            {criticalFindings.length > 0 && (
              <AccordionItem value="critical" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="font-semibold">Critiques ({criticalFindings.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {criticalFindings.map((finding, idx) => (
                    <FindingItem key={idx} finding={finding} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            {highFindings.length > 0 && (
              <AccordionItem value="high" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold">Importants ({highFindings.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {highFindings.map((finding, idx) => (
                    <FindingItem key={idx} finding={finding} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            {otherFindings.length > 0 && (
              <AccordionItem value="other" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Autres ({otherFindings.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {otherFindings.map((finding, idx) => (
                    <FindingItem key={idx} finding={finding} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Summary */}
          {displayedAudit.raw_response && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {(() => {
                    try {
                      const parsed = JSON.parse(
                        displayedAudit.raw_response.match(/\{[\s\S]*\}/)?.[0] || "{}"
                      );
                      return parsed.summary || "Aucun résumé disponible";
                    } catch {
                      return "Aucun résumé disponible";
                    }
                  })()}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Failed state */}
      {displayedAudit && displayedAudit.status === "failed" && !isRunning && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Échec de l'audit</h3>
            <p className="text-muted-foreground text-center mb-4">
              Une erreur s'est produite lors de l'analyse. Veuillez réessayer.
            </p>
            <Button onClick={() => runAudit()}>
              <Play className="h-4 w-4 mr-2" />
              Relancer l'audit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
