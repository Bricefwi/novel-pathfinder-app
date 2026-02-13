import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CookieBanner } from "@/components/cookies/CookieBanner";
import { FloatingHelpButton } from "./FloatingHelpButton";
import { AutoTranslator } from "@/components/translation/AutoTranslator";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AutoTranslator />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
      <FloatingHelpButton />
    </div>
  );
}
