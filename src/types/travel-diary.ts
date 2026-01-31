/**
 * Types centralisés pour le Carnet de Voyage
 * Utilisés par : TravelDiaryEditor.tsx, TravelHubDocuments.tsx, ActivityWizard.tsx
 */

// Interface pour le carnet de voyage enrichi (nouvelle structure)
export interface TravelDiaryData {
  editorial: {
    title: string;
    content: string;
    organizer_word: string;
  };
  daily_itinerary: {
    day_number: number;
    title: string;
    description: string;
    accommodation: string;
    meals: string;
  }[];
  packing_list: {
    category: string;
    items: string[];
  }[];
  practical_info: {
    meeting_point: string;
    flights_info: string;
    required_documents: string;
  };
}

// Ancienne interface pour compatibilité avec données existantes
export interface LegacyTravelDiary {
  pourquoi_sejour?: string;
  itineraire?: string;
  hebergements?: string;
  equipement?: string;
  infos_pratiques?: string;
  contacts?: string;
}

// Structure par défaut pour initialiser un nouveau carnet
export const DEFAULT_TRAVEL_DIARY: TravelDiaryData = {
  editorial: {
    title: "",
    content: "",
    organizer_word: "",
  },
  daily_itinerary: [],
  packing_list: [
    { category: "Tête", items: [] },
    { category: "Buste", items: [] },
    { category: "Jambes", items: [] },
    { category: "Pieds & Mains", items: [] },
    { category: "Pharmacie / Hygiène", items: [] },
    { category: "Matériel à Cheval", items: [] },
  ],
  practical_info: {
    meeting_point: "",
    flights_info: "",
    required_documents: "",
  },
};

// Helper pour vérifier si c'est le nouveau format
export const isNewDiaryFormat = (diary: TravelDiaryData | LegacyTravelDiary): diary is TravelDiaryData => {
  return 'editorial' in diary;
};

// Helper pour vérifier si un carnet a du contenu
export const hasDiaryContent = (diary: TravelDiaryData | LegacyTravelDiary | null): boolean => {
  if (!diary) return false;
  
  if (isNewDiaryFormat(diary)) {
    return !!(
      diary.editorial?.title || 
      diary.daily_itinerary?.length > 0 || 
      diary.packing_list?.some(p => p.items.length > 0)
    );
  }
  
  // Legacy format
  return !!(diary.pourquoi_sejour || diary.itineraire || diary.hebergements);
};
