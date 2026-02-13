import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation, LANGUAGES, type SupportedLang } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang, isTranslating } = useTranslation();
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-base leading-none">{currentLang?.flag}</span>
          )}
          <span className="hidden sm:inline text-xs uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={cn(
              "gap-2 cursor-pointer",
              lang === l.code && "bg-primary/10 text-primary font-medium"
            )}
          >
            <span className="text-base">{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
