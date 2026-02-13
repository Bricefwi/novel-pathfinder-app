import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/contexts/TranslationContext";

/**
 * DOM-based auto-translator that observes the page and translates
 * all visible text nodes automatically when the language changes.
 * Works like Google Translate — no need to wrap each text manually.
 */

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED",
  "SVG", "MATH", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT",
]);

// Minimum text length to bother translating
const MIN_TEXT_LENGTH = 2;

// Attribute to mark translated nodes
const TRANSLATED_ATTR = "data-translated-lang";
const ORIGINAL_ATTR = "data-original-text";

function isVisible(el: Element): boolean {
  if (!el.parentElement) return false;
  const style = window.getComputedStyle(el.parentElement);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function getTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      // Skip elements marked as no-translate
      if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      const text = node.textContent?.trim();
      if (!text || text.length < MIN_TEXT_LENGTH) return NodeFilter.FILTER_REJECT;
      // Skip pure numbers, URLs, emails
      if (/^[\d\s.,€$%+\-()/:]+$/.test(text)) return NodeFilter.FILTER_REJECT;
      if (/^https?:\/\//.test(text)) return NodeFilter.FILTER_REJECT;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return NodeFilter.FILTER_REJECT;
      if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push(node);
  }
  return nodes;
}

export function AutoTranslator() {
  const { lang, translateBatch, t } = useTranslation();
  const observerRef = useRef<MutationObserver | null>(null);
  const translateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTranslatingRef = useRef(false);

  const translatePage = useCallback(async () => {
    if (lang === "fr" || isTranslatingRef.current) return;
    isTranslatingRef.current = true;

    try {
      const mainEl = document.querySelector("main") || document.body;
      const headerEl = document.querySelector("header");
      const footerEl = document.querySelector("footer");

      const allNodes: Text[] = [];
      [mainEl, headerEl, footerEl].forEach((el) => {
        if (el) allNodes.push(...getTextNodes(el));
      });

      // Collect unique texts that need translation
      const textsToTranslate = new Set<string>();
      const nodeMap: { node: Text; original: string }[] = [];

      for (const node of allNodes) {
        const parent = node.parentElement;
        if (!parent) continue;

        // Get original text (stored or current)
        const original = parent.getAttribute(ORIGINAL_ATTR) || node.textContent?.trim() || "";
        if (!original || original.length < MIN_TEXT_LENGTH) continue;

        // Store original if not already stored
        if (!parent.getAttribute(ORIGINAL_ATTR)) {
          parent.setAttribute(ORIGINAL_ATTR, original);
        }

        textsToTranslate.add(original);
        nodeMap.push({ node, original });
      }

      if (textsToTranslate.size === 0) {
        isTranslatingRef.current = false;
        return;
      }

      // Batch translate all texts
      await translateBatch(Array.from(textsToTranslate));

      // Apply translations to DOM
      for (const { node, original } of nodeMap) {
        const translated = t(original);
        if (translated && translated !== original && node.textContent) {
          // Preserve leading/trailing whitespace from the original node
          const leadingSpace = node.textContent.match(/^\s*/)?.[0] || "";
          const trailingSpace = node.textContent.match(/\s*$/)?.[0] || "";
          node.textContent = leadingSpace + translated + trailingSpace;
          node.parentElement?.setAttribute(TRANSLATED_ATTR, lang);
        }
      }
    } catch (err) {
      console.error("AutoTranslator error:", err);
    } finally {
      isTranslatingRef.current = false;
    }
  }, [lang, translateBatch, t]);

  const restoreOriginals = useCallback(() => {
    const translatedElements = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
    translatedElements.forEach((el) => {
      const original = el.getAttribute(ORIGINAL_ATTR);
      if (original && el.firstChild?.nodeType === Node.TEXT_NODE) {
        const textNode = el.firstChild as Text;
        const leadingSpace = textNode.textContent?.match(/^\s*/)?.[0] || "";
        const trailingSpace = textNode.textContent?.match(/\s*$/)?.[0] || "";
        textNode.textContent = leadingSpace + original + trailingSpace;
      }
      el.removeAttribute(TRANSLATED_ATTR);
    });
  }, []);

  // Debounced translate trigger
  const scheduletranslate = useCallback(() => {
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current);
    }
    translateTimeoutRef.current = setTimeout(() => {
      translatePage();
    }, 500);
  }, [translatePage]);

  // React to language changes
  useEffect(() => {
    if (lang === "fr") {
      restoreOriginals();
      return;
    }

    // Small delay to let React render first
    const timeout = setTimeout(() => {
      translatePage();
    }, 300);

    return () => clearTimeout(timeout);
  }, [lang, translatePage, restoreOriginals]);

  // Observe DOM mutations to translate new content (route changes, lazy loads)
  useEffect(() => {
    if (lang === "fr") {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    observerRef.current = new MutationObserver((mutations) => {
      // Only re-translate if meaningful content was added
      const hasNewContent = mutations.some((m) =>
        m.type === "childList" && m.addedNodes.length > 0 &&
        Array.from(m.addedNodes).some(
          (n) => n.nodeType === Node.ELEMENT_NODE || 
                 (n.nodeType === Node.TEXT_NODE && (n.textContent?.trim().length || 0) > MIN_TEXT_LENGTH)
        )
      );
      if (hasNewContent) {
        scheduletranslate();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
    };
  }, [lang, scheduletranslate]);

  return null; // Renderless component
}
