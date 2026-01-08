-- Table pour les messages du chat communautaire
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('randonnee', 'cours', 'stage', 'sejour', 'general')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes par type d'activité
CREATE INDEX idx_chat_messages_activity_type ON public.chat_messages(activity_type, created_at DESC);

-- Activer RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Les utilisateurs connectés peuvent voir les messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs connectés peuvent envoyer des messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Activer le realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;