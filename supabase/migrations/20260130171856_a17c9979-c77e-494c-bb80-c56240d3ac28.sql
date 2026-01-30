-- Fix infinite recursion in chat_messages RLS policy
-- The current policy references chat_messages table which causes recursion

-- First, drop the problematic SELECT policy
DROP POLICY IF EXISTS "Les utilisateurs connectés peuvent voir les messages de leur a" ON public.chat_messages;

-- Create a security definer function to check if user has participated in a chat room
CREATE OR REPLACE FUNCTION public.user_has_participated_in_room(_user_id uuid, _activity_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE user_id = _user_id AND activity_type = _activity_type
  )
$$;

-- Create new policy using the security definer function to avoid recursion
CREATE POLICY "Les utilisateurs peuvent voir les messages de leur activité"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR user_has_participated_in_room(auth.uid(), activity_type)
  )
);