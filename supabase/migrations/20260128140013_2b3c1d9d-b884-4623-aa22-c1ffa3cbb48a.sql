-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Corrects all identified security vulnerabilities
-- =====================================================

-- 1. FIX: Recreate client_activity_timeline view with explicit SECURITY INVOKER
-- This fixes the "Security Definer View" error
DROP VIEW IF EXISTS public.client_activity_timeline;

CREATE VIEW public.client_activity_timeline
WITH (security_invoker = on) AS
SELECT 
    quotes.id,
    quotes.created_at AS date,
    'quote'::text AS event_type,
    quotes.status,
    quotes.activity_title AS title,
    quotes.user_id,
    quotes.total_price AS amount
FROM quotes
UNION ALL
SELECT 
    bookings.id,
    bookings.created_at AS date,
    'booking'::text AS event_type,
    bookings.status::text AS status,
    (SELECT activities.title FROM activities WHERE activities.id = bookings.activity_id) AS title,
    bookings.user_id,
    bookings.total_price AS amount
FROM bookings
UNION ALL
SELECT 
    invoices.id,
    invoices.created_at AS date,
    'invoice'::text AS event_type,
    invoices.payment_status AS status,
    invoices.activity_title AS title,
    invoices.user_id,
    invoices.total_amount AS amount
FROM invoices
ORDER BY 2 DESC;

-- 2. FIX: Update get_config function with proper search_path
CREATE OR REPLACE FUNCTION public.get_config(config_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_config WHERE key = config_key;
$$;

-- 3. FIX: Update sync_newsletter_subscriber function with proper search_path
CREATE OR REPLACE FUNCTION public.sync_newsletter_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.newsletter_subscribed IS DISTINCT FROM OLD.newsletter_subscribed THEN
    IF NEW.newsletter_subscribed THEN
      INSERT INTO public.newsletter_subscribers (email, user_id, is_active, source)
      SELECT u.email, NEW.user_id, true, 'profile_update'
      FROM auth.users u WHERE u.id = NEW.user_id
      ON CONFLICT (email) DO UPDATE
      SET is_active = true, updated_at = NOW();
    ELSE
      UPDATE public.newsletter_subscribers
      SET is_active = false,
          unsubscribed_at = NOW(),
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. FIX: Make chat_messages more secure - users should only see messages in their activity type
-- Drop existing policy and create more restrictive one
DROP POLICY IF EXISTS "Les utilisateurs connectés peuvent voir les messages" ON public.chat_messages;

CREATE POLICY "Les utilisateurs connectés peuvent voir les messages de leur activité"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm2 
      WHERE cm2.activity_type = chat_messages.activity_type 
      AND cm2.user_id = auth.uid()
    )
  )
);

-- 5. Add RLS policy for admins to view newsletter subscribers
DROP POLICY IF EXISTS "Admins can view all subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Admins can view all subscribers"
ON public.newsletter_subscribers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. SECURITY: Add audit log for role changes
-- Create a trigger to log all role changes for security auditing
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    target_user_id uuid,
    performed_by uuid,
    old_value text,
    new_value text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log - only admins can view
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Create trigger function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (action_type, target_user_id, performed_by, new_value, metadata)
    VALUES ('ROLE_GRANTED', NEW.user_id, auth.uid(), NEW.role::text, jsonb_build_object('role_id', NEW.id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (action_type, target_user_id, performed_by, old_value, new_value, metadata)
    VALUES ('ROLE_CHANGED', NEW.user_id, auth.uid(), OLD.role::text, NEW.role::text, jsonb_build_object('role_id', NEW.id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (action_type, target_user_id, performed_by, old_value, metadata)
    VALUES ('ROLE_REVOKED', OLD.user_id, auth.uid(), OLD.role::text, jsonb_build_object('role_id', OLD.id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS trigger_log_role_change ON public.user_roles;

CREATE TRIGGER trigger_log_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();