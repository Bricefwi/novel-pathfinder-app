import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GAConfig {
  ga_measurement_id?: string;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Composant d'initialisation Google Analytics 4
 * Récupère l'ID de mesure depuis app_config et injecte le script gtag.js
 */
export function GoogleAnalytics() {
  const [gaId, setGaId] = useState<string | null>(null);

  useEffect(() => {
    const loadGAConfig = async () => {
      try {
        // Récupérer l'ID GA depuis app_config
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'google_analytics')
          .maybeSingle();

        if (error) {
          console.error('[GA4] Erreur lors de la récupération de la config:', error);
          return;
        }

        const config = data?.value as GAConfig | null;
        const measurementId = config?.ga_measurement_id;

        if (measurementId && measurementId.startsWith('G-')) {
          setGaId(measurementId);
        }
      } catch (err) {
        console.error('[GA4] Erreur:', err);
      }
    };

    loadGAConfig();
  }, []);

  useEffect(() => {
    if (!gaId) return;

    // Vérifier si déjà initialisé
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
      return;
    }

    // Injecter le script gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    // Initialiser dataLayer et gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    console.log(`[GA4] Initialisé avec ID: ${gaId}`);

    return () => {
      // Nettoyage si nécessaire (rarement utilisé en production)
    };
  }, [gaId]);

  return null;
}

/**
 * Hook pour envoyer des événements personnalisés à GA4
 */
export function useGoogleAnalytics() {
  const trackEvent = (eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, params);
    }
  };

  const trackPageView = (pagePath: string, pageTitle?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title,
      });
    }
  };

  return { trackEvent, trackPageView };
}
