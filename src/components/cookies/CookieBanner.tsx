import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie-consent";

function safeGetConsent(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    // Certains navigateurs / iframes peuvent bloquer localStorage
  }

  try {
    return window.sessionStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
}

function safeSetConsent(value: "accepted" | "refused"): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    return;
  } catch {
    // fallback
  }

  try {
    window.sessionStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // Pas de stockage disponible : on ne persiste pas, mais on évite de casser l'app.
  }
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = safeGetConsent();
    if (!consent) {
      // Délai pour afficher le bandeau après le chargement
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    safeSetConsent("accepted");
    setIsVisible(false);
  };

  const handleRefuse = () => {
    safeSetConsent("refused");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">
                Nous utilisons des cookies
              </p>
              <p className="text-xs text-muted-foreground">
                Ce site utilise des cookies pour améliorer votre expérience de navigation. 
                Les cookies essentiels sont nécessaires au fonctionnement du site.{" "}
                <Link to="/cookies" className="text-primary hover:underline">
                  En savoir plus
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefuse}
              className="flex-1 md:flex-none"
            >
              Refuser
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 md:flex-none"
            >
              Accepter
            </Button>
          </div>
          <button
            onClick={handleRefuse}
            className="absolute top-2 right-2 md:static p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
