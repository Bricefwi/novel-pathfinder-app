import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConsistencyRun {
  id: string;
  run_at: string;
  triggered_by: string;
  total_checks: number;
  divergences_count: number;
  divergences: Array<{
    id: string;
    label: string;
    kpi: number;
    raw: number;
    diff: number;
  }>;
  totals: Record<string, number>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

/**
 * Returns the most recent consistency run + the count of unacknowledged
 * runs that contain divergences. Used to show a notification badge
 * in the admin sidebar.
 */
export const useConsistencyRuns = () => {
  return useQuery({
    queryKey: ["consistency-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consistency_check_runs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const runs = (data ?? []) as unknown as ConsistencyRun[];
      const unacknowledgedDivergent = runs.filter(
        (r) => r.divergences_count > 0 && !r.acknowledged_at
      );
      return {
        runs,
        latest: runs[0] ?? null,
        unacknowledgedCount: unacknowledgedDivergent.length,
        hasActiveAlert: unacknowledgedDivergent.length > 0,
      };
    },
    refetchInterval: 5 * 60 * 1000, // poll every 5 min
    staleTime: 60 * 1000,
  });
};

export const acknowledgeConsistencyRun = async (runId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("consistency_check_runs")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user?.id ?? null,
    })
    .eq("id", runId);
  if (error) throw error;
};
