import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, Heart, LogOut, ChevronDown, Scale, MessageCircle, Shield, CalendarDays, BadgeCheck, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AvatarUploadDialog } from "./AvatarUploadDialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateProfileCompletion, type ProfileForCompletion } from "@/lib/profile-utils";
import { CartButton } from "@/components/cart/CartButton";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("U");
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Factorized function to load user data - prevents code duplication
  const loadUserData = async (userId: string, userMetadata: Record<string, unknown>, userEmail?: string) => {
    // Run both queries in parallel for performance
    const [roleResult, profileResult] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("first_name, last_name, phone, riding_level, riding_experience_years, dream_destinations, preferred_trip_types, interests, riding_style, travel_companions, avatar_url")
        .eq("user_id", userId)
        .maybeSingle()
    ]);
    
    setIsAdmin(!!roleResult.data);
    
    const profileData = profileResult.data;
    const completion = calculateProfileCompletion(profileData as ProfileForCompletion | null);
    setIsProfileComplete(completion === 100);
    
    // Set avatar (from profile or OAuth metadata)
    const avatarFromProfile = profileData?.avatar_url;
    const avatarFromOAuth = userMetadata?.avatar_url || userMetadata?.picture;
    setAvatarUrl((avatarFromProfile || avatarFromOAuth || null) as string | null);
    
    // Set initials
    if (profileData?.first_name || profileData?.last_name) {
      setUserInitials(`${profileData.first_name?.charAt(0) || ""}${profileData.last_name?.charAt(0) || ""}`.toUpperCase() || "U");
    } else {
      setUserInitials(userEmail?.charAt(0).toUpperCase() || "U");
    }
  };

  const clearUserData = () => {
    setIsAdmin(false);
    setIsProfileComplete(false);
    setAvatarUrl(null);
    setUserInitials("U");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state update first - prevents deadlock
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer async operations with setTimeout to prevent Supabase deadlock
          setTimeout(() => {
            loadUserData(session.user.id, session.user.user_metadata, session.user.email);
          }, 0);
        } else {
          clearUserData();
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id, session.user.user_metadata, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    // Clear local state immediately for instant UI feedback
    clearUserData();
    setUser(null);
    // Then sign out from Supabase (non-blocking for UX)
    supabase.auth.signOut();
  };

  const handleAvatarUpdate = (newUrl: string) => {
    setAvatarUrl(newUrl);
  };

  return (
    <>
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
          <Link to="/" className="flex items-center space-x-2 group shrink-0">
            <img 
              src="/logo-an-arwen.png" 
              alt="Ferme Équestre An Arwen" 
              className="h-14 w-auto"
            />
            <div className="hidden xl:block">
              <h1 className="font-serif text-sm font-bold text-foreground leading-tight whitespace-nowrap">
                Ferme Équestre An Arwen
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-0.5 min-w-0">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "px-2.5 py-2 text-xs font-medium rounded-lg transition-all duration-300 flex items-center gap-1 whitespace-nowrap",
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
                <Button variant="ghost" className="px-2.5 py-2 text-xs font-medium text-foreground/80 hover:text-primary hover:bg-primary/5">
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
          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Cart Button */}
            <CartButton />
            
            {/* Verified Profile Badge */}
            {user && isProfileComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="hidden sm:flex gap-1.5 bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20 cursor-default"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Profil vérifié</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Votre profil est complet à 100% !</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full relative p-0 h-9 w-9">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Avatar" />
                      ) : null}
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    {isProfileComplete && (
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <BadgeCheck className="h-4 w-4 text-green-600 fill-green-100" />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isProfileComplete && (
                    <>
                      <div className="px-2 py-1.5">
                        <Badge 
                          variant="secondary" 
                          className="w-full justify-center gap-1.5 bg-green-500/10 text-green-700 border-green-500/30"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Cavalier Vérifié
                        </Badge>
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setShowAvatarDialog(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Changer ma photo
                  </DropdownMenuItem>
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
            "lg:hidden transition-all duration-300",
            isOpen ? "max-h-[80vh] mt-4 overflow-y-auto" : "max-h-0 overflow-hidden"
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
            
            {/* Legal Section Mobile - Controlled toggle */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsLegalOpen(!isLegalOpen)}
                className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-all text-foreground/80 hover:text-primary hover:bg-primary/5 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Légal
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isLegalOpen && "rotate-180")} />
              </button>
              {isLegalOpen && (
                <div className="space-y-1 pl-4 pb-2">
                  {legalNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => {
                        setIsOpen(false);
                        setIsLegalOpen(false);
                      }}
                      className={cn(
                        "block px-4 py-2 text-sm rounded-lg transition-all",
                        location.pathname === item.href
                          ? "text-primary bg-primary/10"
                          : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
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

      {/* Avatar Upload Dialog */}
      {user && (
        <AvatarUploadDialog
          open={showAvatarDialog}
          onOpenChange={setShowAvatarDialog}
          userId={user.id}
          currentAvatarUrl={avatarUrl}
          userInitials={userInitials}
          onAvatarUpdate={handleAvatarUpdate}
        />
      )}
    </>
  );
}
