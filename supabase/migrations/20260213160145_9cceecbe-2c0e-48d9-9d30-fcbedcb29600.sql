-- Renforcer la politique SELECT sur quotes : exiger que user_id ne soit pas NULL pour les non-admins
DROP POLICY IF EXISTS "quotes_select_secure" ON public.quotes;

CREATE POLICY "quotes_select_secure"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id IS NOT NULL
    AND auth.uid() = user_id
  )
);

-- Renforcer la politique UPDATE sur quotes
DROP POLICY IF EXISTS "quotes_update_secure" ON public.quotes;

CREATE POLICY "quotes_update_secure"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id IS NOT NULL
    AND auth.uid() = user_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id IS NOT NULL
    AND auth.uid() = user_id
  )
);

-- S'assurer que les futurs devis ont toujours un user_id renseigné quand créés par un utilisateur
-- (les admins peuvent créer avec n'importe quel user_id via la politique INSERT existante)