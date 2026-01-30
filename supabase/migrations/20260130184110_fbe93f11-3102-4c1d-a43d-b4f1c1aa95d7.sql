-- Fonction RPC sécurisée pour récupérer les emails des utilisateurs (admin uniquement)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_profiles()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u;
END;
$$;