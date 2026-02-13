import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SupportedLang = "fr" | "en" | "es" | "de" | "ar";

export const LANGUAGES: { code: SupportedLang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

interface TranslationContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (text: string) => string;
  translateBatch: (texts: string[]) => Promise<void>;
  isTranslating: boolean;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

// In-memory cache: { "en": { "Bonjour": "Hello" } }
const cache: Record<string, Record<string, string>> = {};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem("site-lang");
    return (saved as SupportedLang) || "fr";
  });
  const [, forceUpdate] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem("site-lang", newLang);
    if (newLang === "fr") return;
    // Direction for Arabic
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  // Sync: return cached translation or original
  const t = useCallback(
    (text: string): string => {
      if (lang === "fr" || !text) return text;
      return cache[lang]?.[text] || text;
    },
    [lang]
  );

  // Batch translate and cache
  const translateBatch = useCallback(
    async (texts: string[]) => {
      if (lang === "fr") return;
      if (!cache[lang]) cache[lang] = {};

      const uncached = texts.filter((t) => t && !cache[lang][t]);
      if (uncached.length === 0) return;

      setIsTranslating(true);
      try {
        // Split into chunks of 30 to avoid token limits
        const chunks = [];
        for (let i = 0; i < uncached.length; i += 30) {
          chunks.push(uncached.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const { data, error } = await supabase.functions.invoke("translate-page", {
            body: { texts: chunk, targetLang: lang },
          });

          if (error) {
            console.error("Translation error:", error);
            continue;
          }

          const translations = data?.translations || [];
          chunk.forEach((original, idx) => {
            if (translations[idx]) {
              cache[lang][original] = translations[idx];
            }
          });
        }

        forceUpdate((n) => n + 1);
      } catch (err) {
        console.error("Translation batch error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [lang]
  );

  return (
    <TranslationContext.Provider value={{ lang, setLang, t, translateBatch, isTranslating }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationProvider");
  return ctx;
}
