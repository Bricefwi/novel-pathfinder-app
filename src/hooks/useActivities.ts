import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

export type Activity = Tables<"activities">;
export type ActivitySlot = Tables<"activity_slots">;
export type ActivityType = Database["public"]["Enums"]["activity_type"];

export interface ActivityWithSlots extends Activity {
  slots: ActivitySlot[];
}

// Fetch all active activities (sejours) with their slots
export function useActivities(activityType?: ActivityType) {
  return useQuery({
    queryKey: ["activities", activityType],
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select("*")
        .eq("is_active", true)
        .order("country", { ascending: true })
        .order("region", { ascending: true })
        .order("title", { ascending: true });

      if (activityType) {
        query = query.eq("activity_type", activityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch a single activity by slug with its slots
export function useActivityBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["activity", slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null;

      const { data: activity, error: activityError } = await supabase
        .from("activities")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (activityError) {
        if (activityError.code === "PGRST116") return null; // Not found
        throw activityError;
      }

      // Fetch slots for this activity
      const { data: slots, error: slotsError } = await supabase
        .from("activity_slots")
        .select("*")
        .eq("activity_id", activity.id)
        .eq("is_available", true)
        .gte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true });

      if (slotsError) throw slotsError;

      return {
        ...activity,
        slots: slots || [],
      } as ActivityWithSlots;
    },
  });
}

// Fetch all sejour-type activities grouped by country/region
export function useSejoursGrouped() {
  return useQuery({
    queryKey: ["sejours-grouped"],
    queryFn: async () => {
      const { data: activities, error } = await supabase
        .from("activities")
        .select("*")
        .eq("activity_type", "sejour")
        .eq("is_active", true)
        .order("country", { ascending: true })
        .order("region", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;

      // Fetch all future slots for these activities
      const activityIds = (activities || []).map((a) => a.id);
      
      let slots: ActivitySlot[] = [];
      if (activityIds.length > 0) {
        const { data: slotsData, error: slotsError } = await supabase
          .from("activity_slots")
          .select("*")
          .in("activity_id", activityIds)
          .eq("is_available", true)
          .gte("start_date", new Date().toISOString().split("T")[0])
          .order("start_date", { ascending: true });

        if (slotsError) throw slotsError;
        slots = slotsData || [];
      }

      // Group activities by country > region
      const grouped: Record<string, Record<string, ActivityWithSlots[]>> = {};

      for (const activity of activities || []) {
        const country = activity.country || "Autres";
        const region = activity.region || "Autres";
        const activitySlots = slots.filter((s) => s.activity_id === activity.id);

        if (!grouped[country]) {
          grouped[country] = {};
        }
        if (!grouped[country][region]) {
          grouped[country][region] = [];
        }

        grouped[country][region].push({
          ...activity,
          slots: activitySlots,
        });
      }

      return grouped;
    },
  });
}
