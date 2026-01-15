-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
  v_email text;
  v_space_pos integer;
BEGIN
  -- Get email from auth.users
  v_email := NEW.email;
  
  -- Extract data from OAuth metadata (works for Google, Facebook, etc.)
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );
  
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );
  
  -- Try to get first_name directly, otherwise split full_name
  v_first_name := NEW.raw_user_meta_data ->> 'first_name';
  v_last_name := NEW.raw_user_meta_data ->> 'last_name';
  
  -- If no direct first/last name, split the full name
  IF v_first_name IS NULL AND v_full_name != '' THEN
    v_space_pos := position(' ' in v_full_name);
    IF v_space_pos > 0 THEN
      v_first_name := substring(v_full_name from 1 for v_space_pos - 1);
      v_last_name := substring(v_full_name from v_space_pos + 1);
    ELSE
      v_first_name := v_full_name;
      v_last_name := NULL;
    END IF;
  END IF;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    avatar_url,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    v_avatar_url,
    false,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();