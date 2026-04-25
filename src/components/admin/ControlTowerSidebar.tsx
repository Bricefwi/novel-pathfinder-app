import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  Users,
  Inbox,
  Megaphone,
  BarChart3,
  Globe,
  Zap,
  BellRing,
  Landmark,
  MapPin,
  FileText,
  Image,
  Star,
  MessageSquare,
  Home,
  Lightbulb,
  Receipt,
  Leaf,
  Search,
  Settings,
  LogOut,
  ExternalLink,
  BadgeCheck,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminModule } from "./ControlTower";
import logoAnArwen from "@/assets/logo-an-arwen.png";
import { calculateProfileCompletion, type ProfileForCompletion } from "@/lib/profile-utils";
import { useConsistencyRuns } from "@/hooks/use-consistency-runs";
import { AlertTriangle } from "lucide-react";

interface ControlTowerSidebarProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  onOpenCommand: () => void;
}

interface UserProfile extends ProfileForCompletion {
  avatar_url: string | null;
}

const CORE_MODULES = [
  { id: "dashboard" as const, label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "reservations" as const, label: "Réservations", icon: CalendarCheck, badge: "NEW" },
  { id: "stocks" as const, label: "Gestion des Stocks", icon: Package, badge: "NEW" },
  { id: "crm" as const, label: "CRM 360°", icon: Users, badge: "NEW" },
  { id: "inbox" as const, label: "Inbox Unifiée", icon: Inbox, badge: "NEW" },
];

const GROWTH_MODULES = [
  { id: "marketing" as const, label: "Marketing Automation", icon: Megaphone, badge: "SOON" },
  { id: "automations" as const, label: "Automatisations Email", icon: Zap, badge: "NEW" },
  { id: "payment-reminders" as const, label: "Relances Paiement", icon: BellRing, badge: "NEW" },
  { id: "analytics" as const, label: "Analytics Business", icon: BarChart3, badge: "NEW" },
  { id: "traffic" as const, label: "Trafic Web", icon: Globe, badge: "NEW" },
  { id: "accounting" as const, label: "Comptabilité", icon: Landmark, badge: "NEW" },
];

const TOOLS_MODULES = [
  { id: "audit" as const, label: "Audit du Site", icon: Search, badge: "AI" },
  { id: "account-health" as const, label: "Santé Comptes", icon: Settings, badge: "NEW" },
];

const LEGACY_MODULES = [
  { id: "activities" as const, label: "Activités", icon: MapPin },
  { id: "articles" as const, label: "Blog", icon: FileText },
  { id: "gallery" as const, label: "Galerie", icon: Image },
  { id: "reviews" as const, label: "Avis", icon: Star },
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "accommodation" as const, label: "Hébergement", icon: Home },
  { id: "insights" as const, label: "Insights", icon: Lightbulb },
  { id: "quotes" as const, label: "Devis & Factures", icon: Receipt },
  { id: "ecosystem" as const, label: "Éco-Système", icon: Leaf },
  { id: "legal" as const, label: "Acceptations Légales", icon: BadgeCheck, badge: "NEW" },
];

export function ControlTowerSidebar({ activeModule, onModuleChange, onOpenCommand }: ControlTowerSidebarProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const { data: consistency } = useConsistencyRuns();
  const consistencyAlertCount = consistency?.unacknowledgedCount ?? 0;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || "");
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url, phone, riding_level, riding_experience_years, dream_destinations, preferred_trip_types, interests, riding_style, travel_companions")
          .eq("user_id", session.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setIsProfileComplete(calculateProfileCompletion(profileData) === 100);
        }
      }
    };
    
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}`.toUpperCase();
    }
    return userEmail.charAt(0).toUpperCase();
  };

  const renderMenuItem = (item: { id: AdminModule; label: string; icon: React.ElementType; badge?: string }) => (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        isActive={activeModule === item.id}
        onClick={() => onModuleChange(item.id)}
        tooltip={item.label}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            item.badge === "NEW" ? "bg-primary/10 text-primary" : 
            item.badge === "SOON" ? "bg-muted text-muted-foreground" : ""
          }`}>
            {item.badge}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b pb-4">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-2 hover:opacity-80 transition-opacity cursor-pointer w-full"
        >
          <img src={logoAnArwen} alt="An Arwen" className="h-10 w-10 rounded-lg object-cover" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden text-left">
            <span className="font-serif font-semibold text-sm">Control Tower</span>
            <span className="text-xs text-muted-foreground">An Arwen</span>
          </div>
        </button>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recherche</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenCommand} tooltip="Recherche (⌘K)">
                  <Search className="h-4 w-4" />
                  <span>Recherche rapide</span>
                  <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded hidden group-data-[collapsible=icon]:hidden">⌘K</kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Modules Principaux</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CORE_MODULES.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Croissance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GROWTH_MODULES.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Outils IA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOLS_MODULES.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LEGACY_MODULES.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t pt-2">
        {/* User Profile Section */}
        <div className="px-2 py-3 mb-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Avatar" />
                ) : null}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {isProfileComplete && (
                <span className="absolute -bottom-0.5 -right-0.5">
                  <BadgeCheck className="h-4 w-4 text-green-600 fill-green-100" />
                </span>
              )}
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
              <span className="text-sm font-medium truncate">
                {profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "Admin"}
              </span>
              {isProfileComplete ? (
                <Badge 
                  variant="secondary" 
                  className="w-fit text-[10px] px-1.5 py-0 gap-1 bg-green-500/10 text-green-700 border-green-500/30"
                >
                  <BadgeCheck className="h-2.5 w-2.5" />
                  Profil vérifié
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              )}
            </div>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/admin/diagnostics")} tooltip="Diagnostics Système">
              <Settings className="h-4 w-4" />
              <span>Diagnostics</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/")} tooltip="Voir le site">
              <ExternalLink className="h-4 w-4" />
              <span>Voir le site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Déconnexion">
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
