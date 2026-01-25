-- Create audit_reports table for storing site audit results
CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'pending',
  scores JSONB,
  global_score INTEGER,
  findings JSONB,
  recommendations JSONB,
  raw_response TEXT,
  model_used TEXT DEFAULT 'google/gemini-3-pro-preview',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Admin only access
CREATE POLICY "Admins can view all audit reports"
ON public.audit_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit reports"
ON public.audit_reports
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update audit reports"
ON public.audit_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete audit reports"
ON public.audit_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_audit_reports_updated_at
BEFORE UPDATE ON public.audit_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for faster queries
CREATE INDEX idx_audit_reports_created_at ON public.audit_reports(created_at DESC);
CREATE INDEX idx_audit_reports_status ON public.audit_reports(status);