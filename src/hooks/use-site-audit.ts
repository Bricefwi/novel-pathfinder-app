import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AuditScores {
  security: number;
  performance: number;
  seo: number;
  accessibility: number;
  ux: number;
  code_quality: number;
}

export interface AuditFinding {
  category: "security" | "performance" | "seo" | "accessibility" | "ux" | "code";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  location: string;
  recommendation: string;
  code_example?: string;
}

export interface AuditRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface AuditReport {
  id: string;
  created_at: string;
  created_by: string | null;
  audit_type: string;
  status: "pending" | "running" | "completed" | "failed";
  scores: AuditScores | null;
  global_score: number | null;
  findings: AuditFinding[] | null;
  recommendations: AuditRecommendation[] | null;
  raw_response: string | null;
  model_used: string;
  updated_at: string;
}

export function useSiteAudit() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  // Fetch all audit reports
  const {
    data: auditReports,
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["audit-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AuditReport[];
    },
  });

  // Fetch latest completed audit
  const latestAudit = auditReports?.find((r) => r.status === "completed") || null;

  // Run a new audit
  const runAuditMutation = useMutation({
    mutationFn: async (auditType: string = "full") => {
      setIsRunning(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Non authentifié");
      }

      const { data, error } = await supabase.functions.invoke('audit-site', {
        body: { audit_type: auditType },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de l'audit");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      setIsRunning(false);
      toast({
        title: "Audit terminé",
        description: `Score global : ${data.global_score}/100 - ${data.findings_count} problèmes identifiés`,
      });
      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
    },
    onError: (error: Error) => {
      setIsRunning(false);
      toast({
        title: "Erreur d'audit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete an audit report
  const deleteAuditMutation = useMutation({
    mutationFn: async (auditId: string) => {
      const { error } = await supabase
        .from("audit_reports")
        .delete()
        .eq("id", auditId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Rapport supprimé",
        description: "Le rapport d'audit a été supprimé",
      });
      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runAudit = useCallback(
    (auditType?: string) => runAuditMutation.mutate(auditType || "full"),
    [runAuditMutation]
  );

  const deleteAudit = useCallback(
    (auditId: string) => deleteAuditMutation.mutate(auditId),
    [deleteAuditMutation]
  );

  return {
    auditReports,
    latestAudit,
    isLoadingReports,
    reportsError,
    isRunning: isRunning || runAuditMutation.isPending,
    runAudit,
    deleteAudit,
    refetchReports,
  };
}

// Helper function to get severity color
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-destructive";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

// Helper function to get severity badge variant
export function getSeverityBadgeVariant(severity: string): "destructive" | "default" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
}

// Helper function to get category icon name
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    security: "Sécurité",
    performance: "Performance",
    seo: "SEO",
    accessibility: "Accessibilité",
    ux: "UX/Design",
    code: "Code",
    code_quality: "Qualité du code",
  };
  return labels[category] || category;
}

// Helper to calculate score color
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

export function getScoreGradient(score: number): string {
  if (score >= 80) return "from-green-500 to-emerald-500";
  if (score >= 60) return "from-yellow-500 to-amber-500";
  if (score >= 40) return "from-orange-500 to-amber-600";
  return "from-red-500 to-rose-600";
}
