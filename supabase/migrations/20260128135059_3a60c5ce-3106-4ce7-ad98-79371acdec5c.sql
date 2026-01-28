
-- Add RLS policies for admins to manage user roles
-- Allow admins to insert new roles
CREATE POLICY "Les admins peuvent créer des rôles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update roles
CREATE POLICY "Les admins peuvent modifier les rôles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete roles
CREATE POLICY "Les admins peuvent supprimer les rôles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));
