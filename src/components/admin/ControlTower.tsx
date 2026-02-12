import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CommandPalette } from "./CommandPalette";
import { ControlTowerSidebar } from "./ControlTowerSidebar";
import { ControlTowerContent } from "./ControlTowerContent";
import { AdminChatAssistant } from "./AdminChatAssistant";

export type AdminModule = 
  | "dashboard"
  | "stocks"
  | "crm"
  | "inbox"
  | "marketing"
  | "automations"
  | "analytics"
  | "traffic"
  | "audit"
  | "activities"
  | "articles"
  | "gallery"
  | "reviews"
  | "chat"
  | "accommodation"
  | "insights"
  | "quotes"
  | "ecosystem"
  | "legal";

export function ControlTower() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeModule, setActiveModule] = useState<AdminModule>("dashboard");
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <ControlTowerSidebar 
          activeModule={activeModule} 
          onModuleChange={setActiveModule}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="hidden sm:inline">Recherche rapide...</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <ControlTowerContent activeModule={activeModule} onModuleChange={setActiveModule} />
          </main>
        </SidebarInset>
      </div>
      <CommandPalette 
        open={commandOpen} 
        onOpenChange={setCommandOpen}
        onNavigate={(module) => {
          setActiveModule(module);
          setCommandOpen(false);
        }}
      />
      <AdminChatAssistant />
    </SidebarProvider>
  );
}
