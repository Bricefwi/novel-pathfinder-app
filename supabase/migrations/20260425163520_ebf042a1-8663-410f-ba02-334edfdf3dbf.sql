-- Table pour stocker l'historique des contrôles de cohérence automatiques
CREATE TABLE IF NOT EXISTS public.consistency_check_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  triggered_by TEXT NOT NULL DEFAULT 'cron', -- 'cron' | 'manual'
  total_checks INTEGER NOT NULL DEFAULT 0,
  divergences_count INTEGER NOT NULL DEFAULT 0,
  divergences JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consistency_runs_run_at ON public.consistency_check_runs (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_consistency_runs_unack ON public.consistency_check_runs (acknowledged_at) WHERE acknowledged_at IS NULL AND divergences_count > 0;

ALTER TABLE public.consistency_check_runs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire / écrire / accuser réception
CREATE POLICY "Admins can view consistency runs"
ON public.consistency_check_runs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert consistency runs"
ON public.consistency_check_runs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

CREATE POLICY "Admins can update consistency runs"
ON public.consistency_check_runs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));