-- ACTION 1: Réparation du compte admin patrice.simion@gmail.com

-- 1. Confirmation forcée de l'email dans auth.users
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'patrice.simion@gmail.com';

-- 2. S'assurer que le profil existe avec les bonnes colonnes
INSERT INTO public.profiles (user_id, first_name, last_name, onboarding_completed)
SELECT id, 'Patrice', 'Simion', true
FROM auth.users 
WHERE email = 'patrice.simion@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  onboarding_completed = true,
  updated_at = NOW();

-- 3. Attribution du rôle admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'patrice.simion@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;