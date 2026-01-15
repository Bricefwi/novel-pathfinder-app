-- ACTION 2 : Déblocage du compte admin patrice.simion@gmail.com

-- 1. Confirmer l'email dans auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'patrice.simion@gmail.com';

-- 2. Supprimer l'ancien rôle s'il existe
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'patrice.simion@gmail.com');

-- 3. Insérer le rôle admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'patrice.simion@gmail.com';