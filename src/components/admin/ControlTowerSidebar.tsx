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
import {
  LayoutDashboard,
  Package,
  Users,
  Inbox,
  Megaphone,
  BarChart3,
  Globe,
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminModule } from "./ControlTower";
import logoAnArwen from "@/assets/logo-an-arwen.png";

interface ControlTowerSidebarProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  onOpenCommand: () => void;
}

const CORE_MODULES = [
  { id: "dashboard" as const, label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "stocks" as const, label: "Gestion des Stocks", icon: Package, badge: "NEW" },
  { id: "crm" as const, label: "CRM 360°", icon: Users, badge: "NEW" },
  { id: "inbox" as const, label: "Inbox Unifiée", icon: Inbox, badge: "NEW" },
];

const GROWTH_MODULES = [
  { id: "marketing" as const, label: "Marketing Automation", icon: Megaphone, badge: "SOON" },
  { id: "analytics" as const, label: "Analytics Business", icon: BarChart3, badge: "NEW" },
  { id: "traffic" as const, label: "Trafic Web", icon: Globe, badge: "NEW" },
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
];

export function ControlTowerSidebar({ activeModule, onModuleChange, onOpenCommand }: ControlTowerSidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
        <div className="flex items-center gap-3 px-2">
          <img src={logoAnArwen} alt="An Arwen" className="h-10 w-10 rounded-lg object-cover" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-serif font-semibold text-sm">Control Tower</span>
            <span className="text-xs text-muted-foreground">An Arwen</span>
          </div>
        </div>
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
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LEGACY_MODULES.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t pt-2">
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
