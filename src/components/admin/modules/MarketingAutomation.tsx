import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Wand2, Mail, Megaphone, Users, Filter, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { NewsletterEditor } from "./marketing/NewsletterEditor";
import { NewsletterSegmentation } from "./marketing/NewsletterSegmentation";
import { NewsletterSend } from "./marketing/NewsletterSend";

export interface SegmentFilters {
  ridingLevels: string[];
  tripTypes: string[];
  dreamDestinations: string[];
  specificEmails: string[];
}

export function MarketingAutomation() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SegmentFilters>({
    ridingLevels: [],
    tripTypes: [],
    dreamDestinations: [],
    specificEmails: [],
  });
  const [estimatedAudience, setEstimatedAudience] = useState<number | null>(null);

  const hasActiveFilters = filters.ridingLevels.length > 0 || filters.tripTypes.length > 0 || 
    filters.dreamDestinations.length > 0 || filters.specificEmails.length > 0;

  // Estimate audience count
  useEffect(() => {
    const estimate = async () => {
      if (filters.specificEmails.length > 0) {
        setEstimatedAudience(filters.specificEmails.length);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, riding_level, preferred_trip_types, dream_destinations")
        .eq("newsletter_subscribed", true);

      const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .eq("is_active", true);

      if (!hasActiveFilters) {
        const profileCount = profiles?.length || 0;
        const subCount = subscribers?.length || 0;
        setEstimatedAudience(profileCount + subCount);
        return;
      }

      const filtered = (profiles || []).filter(p => {
        if (filters.ridingLevels.length > 0 && (!p.riding_level || !filters.ridingLevels.includes(p.riding_level))) return false;
        if (filters.tripTypes.length > 0) {
          const userTypes = (p.preferred_trip_types || []) as string[];
          if (!filters.tripTypes.some(t => userTypes.includes(t))) return false;
        }
        if (filters.dreamDestinations.length > 0) {
          const userDests = ((p.dream_destinations || []) as string[]).map(d => d.toLowerCase());
          if (!filters.dreamDestinations.some(d => userDests.some(ud => ud.includes(d.toLowerCase())))) return false;
        }
        return true;
      });
      setEstimatedAudience(filtered.length + (subscribers?.length || 0));
    };
    estimate();
  }, [filters, hasActiveFilters]);

  const handleSend = async (isTest: boolean) => {
    if (!subject || !content) { toast.error("Remplissez le sujet et le contenu"); return; }
    if (isTest && !testEmail) { toast.error("Entrez un email de test"); return; }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: {
          subject,
          content: content.replace(/\n/g, "<br>"),
          testEmail: isTest ? testEmail : undefined,
          filters: !isTest && hasActiveFilters ? filters : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const msg = isTest
        ? "✅ Email de test envoyé !"
        : `🚀 Campagne envoyée ! ${data.sent}/${data.total} emails livrés`;
      toast.success(msg);
    } catch (err: unknown) {
      toast.error("Erreur : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Marketing Intelligence
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Créez, ciblez et envoyez vos newsletters avec l'aide de l'IA
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Column 1: Editor + AI */}
        <div className="lg:col-span-2">
          <NewsletterEditor
            subject={subject}
            setSubject={setSubject}
            content={content}
            setContent={setContent}
          />
        </div>

        {/* Column 2: Segmentation + Send */}
        <div className="space-y-6">
          <NewsletterSegmentation
            filters={filters}
            setFilters={setFilters}
            estimatedAudience={estimatedAudience}
          />

          <NewsletterSend
            testEmail={testEmail}
            setTestEmail={setTestEmail}
            isLoading={isLoading}
            hasActiveFilters={hasActiveFilters}
            estimatedAudience={estimatedAudience}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
