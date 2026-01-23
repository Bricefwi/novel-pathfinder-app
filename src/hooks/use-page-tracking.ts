import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      // 1. Gestion de la session visiteur (anonyme)
      let sessionId = localStorage.getItem('visitor_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('visitor_session_id', sessionId);
      }

      // 2. Récupération de l'utilisateur connecté (s'il existe)
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Extraction des paramètres UTM (Marketing)
      const searchParams = new URLSearchParams(location.search);
      const utmSource = searchParams.get('utm_source');
      const utmMedium = searchParams.get('utm_medium');
      const utmCampaign = searchParams.get('utm_campaign');

      // 4. Envoi de la donnée à Supabase
      await supabase.from('analytics_events').insert({
        event_type: 'page_view',
        page_path: location.pathname,
        user_id: user?.id || null,
        session_id: sessionId,
        source: utmSource || document.referrer || 'direct',
        metadata: {
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          screen_width: window.innerWidth,
        }
      });
    };

    trackPageView();
  }, [location]);
};
