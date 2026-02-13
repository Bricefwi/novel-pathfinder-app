import { useEffect, useRef } from "react";
import { useTranslation } from "@/contexts/TranslationContext";

/**
 * Hook to auto-translate visible text on the page when language changes.
 * Call this in page-level components with the list of texts to translate.
 */
export function useAutoTranslate(texts: string[]) {
  const { lang, translateBatch } = useTranslation();
  const prevLang = useRef(lang);

  useEffect(() => {
    if (lang !== "fr" && texts.length > 0) {
      translateBatch(texts);
    }
    prevLang.current = lang;
  }, [lang, texts, translateBatch]);
}
