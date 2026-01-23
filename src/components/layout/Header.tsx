import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, Heart, LogOut, ChevronDown, Scale, MessageCircle, Shield, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const navigation = [
  { name: "Accueil", href: "/" },
  { name: "Destinations", href: "/destinations" },
  { name: "Planning", href: "/planning" },
  { name: "Hébergement", href: "/hebergement" },
  { name: "Préparer Voyage", href: "/preparer-voyage" },
  { name: "Éco-Système", href: "/eco-systeme" },
  { name: "Carnet de Voyage", href: "/carnet-de-voyage" },
  { name: "Contact", href: "/contact" },
  { name: "FAQ", href: "/agent-faq", icon: MessageCircle },
];

const legalNavigation = [
  { name: "Mentions légales", href: "/mentions-legales" },
  { name: "CGU", href: "/cgu" },
  { name: "CGV", href: "/cgv" },
  { name: "Confidentialité", href: "/politique-confidentialite" },
  { name: "Cookies", href: "/cookies" },
];

const authNavigation = [
  { name: "Mon Espace", href: "/mon-espace" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Check admin role
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "admin")
            .single();
          setIsAdmin(!!data);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();
        setIsAdmin(!!data);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-lg py-3"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo-an-arwen.png" 
              alt="Ferme Équestre An Arwen" 
              className="h-20 w-auto"
            />
            <div className="hidden sm:block">
              <h1 className="font-serif text-xl font-bold text-foreground">
                Ferme Équestre An Arwen
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-1",
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                )}
              >
                {'icon' in item && item.icon && <item.icon className="h-4 w-4" />}
                {item.name}
              </Link>
            ))}
            
            {/* Legal Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5">
                  <Scale className="h-4 w-4 mr-1" />
                  Légal
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {legalNavigation.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link to={item.href}>{item.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {user && authNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-primary/80 hover:text-primary hover:bg-primary/5"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/mon-espace" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Mon Espace
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mon-espace" className="flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Mes Réservations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mon-espace" className="flex items-center">
                      <Heart className="mr-2 h-4 w-4" />
                      Mes Favoris
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center text-primary font-medium">
                          <Shield className="mr-2 h-4 w-4" />
                          Administration
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="flex">
                  <User className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Connexion</span>
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300",
            isOpen ? "max-h-[500px] mt-4" : "max-h-0"
          )}
        >
          <nav className="flex flex-col space-y-2 pb-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded-lg transition-all",
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                )}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Legal Section Mobile */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Scale className="h-3 w-3" />
                Légal
              </p>
              <div className="space-y-1 pl-2">
                {legalNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block px-3 py-2 text-sm rounded-lg transition-all",
                      location.pathname === item.href
                        ? "text-primary bg-primary/10"
                        : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {user && authNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded-lg transition-all border border-primary/30",
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-primary hover:bg-primary/5"
                )}
              >
                {item.name}
              </Link>
            ))}
            {!user && (
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full mt-2">
                  Connexion
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
