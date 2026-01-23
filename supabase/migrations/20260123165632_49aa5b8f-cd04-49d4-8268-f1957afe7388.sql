-- Create table for AI prospect analysis history
CREATE TABLE public.prospect_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  budget_probable TEXT,
  intention_principale TEXT,
  confiance TEXT,
  produits_suggeres JSONB DEFAULT '[]'::jsonb,
  analyse_resume TEXT,
  events_analyzed INTEGER DEFAULT 0,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospect_analyses ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage analyses
CREATE POLICY "Les admins peuvent voir les analyses" 
ON public.prospect_analyses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent créer des analyses" 
ON public.prospect_analyses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent supprimer des analyses" 
ON public.prospect_analyses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster lookups
CREATE INDEX idx_prospect_analyses_user_id ON public.prospect_analyses(user_id);
CREATE INDEX idx_prospect_analyses_created_at ON public.prospect_analyses(created_at DESC);