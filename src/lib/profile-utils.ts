// Centralized profile completion calculation
// Used across Header, MonEspace, TravelHubProfile, ControlTowerSidebar

export interface ProfileForCompletion {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  riding_level: string | null;
  riding_experience_years: number | null;
  dream_destinations: string[] | null;
  preferred_trip_types: string[] | null;
  interests: string[] | null;
  riding_style: string[] | null;
  travel_style: string | null;
}

/**
 * Calculate profile completion percentage
 * All 10 fields are required to reach 100%:
 * - first_name, last_name, phone (identity)
 * - riding_level, riding_experience_years, riding_style (rider profile)
 * - dream_destinations, preferred_trip_types, interests, travel_style (preferences)
 */
export const calculateProfileCompletion = (p: ProfileForCompletion | null): number => {
  if (!p) return 0;
  
  const fields = [
    p.first_name,
    p.last_name,
    p.phone,
    p.riding_level,
    p.riding_experience_years,
    (p.dream_destinations?.length ?? 0) > 0,
    (p.preferred_trip_types?.length ?? 0) > 0,
    (p.interests?.length ?? 0) > 0,
    (p.riding_style?.length ?? 0) > 0,
    p.travel_style,
  ];
  
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

export const isProfileComplete = (p: ProfileForCompletion | null): boolean => {
  return calculateProfileCompletion(p) === 100;
};
