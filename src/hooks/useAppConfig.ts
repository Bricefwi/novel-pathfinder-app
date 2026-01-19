import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppConfig {
  contact_main: {
    email: string;
    phone: string;
    website: string;
  };
  email_from_system: {
    email: string;
    name: string;
  };
  email_from_admin: {
    email: string;
    name: string;
  };
  email_from_newsletter: {
    email: string;
    name: string;
  };
  company_name: string;
  company_address: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
  website_url: string;
  app_url: string;
  auto_invoice_on_booking: boolean;
  auto_send_invoice_on_creation: boolean;
  newsletter_enabled: boolean;
  whatsapp_number: string;
}

// Valeurs par défaut (fallback)
const DEFAULT_CONFIG: AppConfig = {
  contact_main: {
    email: "contact@an-arwen.fr",
    phone: "06 21 49 60 00",
    website: "https://www.ferme-equestre-an-arwen.com"
  },
  email_from_system: {
    email: "notifications@an-arwen.fr",
    name: "An Arwen"
  },
  email_from_admin: {
    email: "direction@an-arwen.fr",
    name: "Direction An Arwen"
  },
  email_from_newsletter: {
    email: "newsletter@an-arwen.fr",
    name: "Newsletter An Arwen"
  },
  company_name: "Ferme Équestre An Arwen",
  company_address: {
    street: "Le Bignon",
    city: "La Chapelle du Lou du Lac",
    zip: "35360",
    country: "France"
  },
  website_url: "https://www.ferme-equestre-an-arwen.com",
  app_url: "https://novel-pathfinder-app.lovable.app",
  auto_invoice_on_booking: true,
  auto_send_invoice_on_creation: true,
  newsletter_enabled: true,
  whatsapp_number: "+33659226270"
};

const CONFIG_KEYS = [
  "contact_main",
  "email_from_system",
  "email_from_admin",
  "email_from_newsletter",
  "company_name",
  "company_address",
  "website_url",
  "app_url",
  "auto_invoice_on_booking",
  "auto_send_invoice_on_creation",
  "newsletter_enabled",
  "whatsapp_number"
] as const;

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async (): Promise<AppConfig> => {
      try {
        const { data, error } = await supabase
          .from("app_config")
          .select("key, value")
          .in("key", [...CONFIG_KEYS]);

        if (error) {
          console.warn("Error fetching app config, using defaults:", error.message);
          return DEFAULT_CONFIG;
        }

        const config: Partial<AppConfig> = {};
        (data || []).forEach((row: { key: string; value: unknown }) => {
          (config as Record<string, unknown>)[row.key] = row.value;
        });

        // Merge avec les valeurs par défaut
        return {
          ...DEFAULT_CONFIG,
          ...config
        };
      } catch (err) {
        console.warn("Failed to fetch app config, using defaults:", err);
        return DEFAULT_CONFIG;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (anciennement cacheTime)
    retry: 1,
  });
}

export function useConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] | null {
  const { data, isLoading } = useAppConfig();
  if (isLoading || !data) return null;
  return data[key];
}

export default useAppConfig;
