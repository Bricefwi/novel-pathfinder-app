import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerProfileCompleteConfetti } from "@/lib/confetti";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  Mountain, 
  Heart, 
  Camera,
  Loader2,
  Sparkles,
  MapPin,
  Calendar,
  Shield,
  Backpack
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Identité", icon: User, description: "Faisons connaissance" },
  { id: 2, title: "Coordonnées", icon: MapPin, description: "Votre adresse" },
  { id: 3, title: "Cavalier", icon: Mountain, description: "Votre profil équestre" },
  { id: 4, title: "Équipement", icon: Backpack, description: "Vos équipements" },
  { id: 5, title: "Rêves", icon: Heart, description: "Vos envies de voyage" },
];

const RIDING_LEVELS = [
  { value: "debutant", label: "Débutant", description: "Peu ou pas d'expérience", emoji: "🌱" },
  { value: "intermediaire", label: "Intermédiaire", description: "Pas et trot maîtrisés", emoji: "🌿" },
  { value: "confirme", label: "Confirmé", description: "Autonome aux trois allures", emoji: "🌳" },
  { value: "expert", label: "Expert", description: "Cavalier très expérimenté", emoji: "⭐" },
];

const RIDING_STYLES = [
  { value: "randonnee", label: "Randonnée", emoji: "🏔️" },
  { value: "dressage", label: "Dressage", emoji: "🎩" },
  { value: "saut", label: "Saut d'obstacles", emoji: "🏇" },
  { value: "western", label: "Western", emoji: "🤠" },
  { value: "endurance", label: "Endurance", emoji: "🏃" },
  { value: "ethologique", label: "Éthologique", emoji: "🐴" },
];

const DESTINATIONS = [
  { name: "Bretagne", emoji: "🌊" },
  { name: "Maroc", emoji: "🏜️" },
  { name: "Mongolie", emoji: "🏔️" },
  { name: "Irlande", emoji: "☘️" },
  { name: "Islande", emoji: "❄️" },
  { name: "Espagne", emoji: "🌞" },
  { name: "Portugal", emoji: "🏄" },
  { name: "Jordanie", emoji: "🏛️" },
  { name: "Argentine", emoji: "🦙" },
  { name: "Écosse", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
];

const TRIP_TYPES = [
  { value: "bivouac", label: "Bivouac sauvage", emoji: "🏕️" },
  { value: "confort", label: "Hôtel confort", emoji: "🏨" },
  { value: "sportive", label: "Rando sportive", emoji: "🏇" },
  { value: "culture", label: "Culture & Cheval", emoji: "🏛️" },
  { value: "famille", label: "En famille", emoji: "👨‍👩‍👧‍👦" },
  { value: "photo", label: "Photo & Nature", emoji: "📸" },
];

const INTERESTS = [
  { value: "nature", label: "Nature", emoji: "🌿" },
  { value: "photographie", label: "Photographie", emoji: "📷" },
  { value: "gastronomie", label: "Gastronomie", emoji: "🍽️" },
  { value: "histoire", label: "Histoire", emoji: "📜" },
  { value: "meditation", label: "Méditation", emoji: "🧘" },
  { value: "aventure", label: "Aventure", emoji: "🧗" },
  { value: "animaux", label: "Animaux", emoji: "🐕" },
  { value: "bien-etre", label: "Bien-être", emoji: "💆" },
];

const TRAVEL_COMPANIONS = [
  { value: "solo", label: "Seul(e)", emoji: "🚶" },
  { value: "couple", label: "En couple", emoji: "💑" },
  { value: "famille", label: "En famille", emoji: "👨‍👩‍👧" },
  { value: "amis", label: "Entre amis", emoji: "👥" },
];

const PREFERRED_PERIODS = [
  { value: "printemps", label: "Printemps", emoji: "🌸" },
  { value: "ete", label: "Été", emoji: "☀️" },
  { value: "automne", label: "Automne", emoji: "🍂" },
  { value: "hiver", label: "Hiver", emoji: "❄️" },
  { value: "vacances_scolaires", label: "Vacances scolaires", emoji: "📚" },
  { value: "hors_vacances", label: "Hors vacances", emoji: "🗓️" },
];

const BUDGET_LABELS: Record<number, string> = {
  500: "500€ - Week-end",
  1000: "1 000€ - Semaine courte",
  1500: "1 500€ - Semaine complète",
  2000: "2 000€ - Séjour premium",
  3000: "3 000€+ - Expédition",
};

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  birth_date: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  riding_level: string;
  riding_experience_years: number;
  riding_style: string[];
  height_cm: number;
  weight_kg: number;
  past_experiences: string;
  health_info: string;
  has_own_equipment: boolean;
  equipment_details: string;
  dream_destinations: string[];
  preferred_trip_types: string[];
  interests: string[];
  travel_companions: string;
  preferred_periods: string[];
  budget_range: string;
  travel_dreams: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOAuthImported, setIsOAuthImported] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
    birth_date: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "France",
    riding_level: "",
    riding_experience_years: 0,
    riding_style: [],
    height_cm: 170,
    weight_kg: 70,
    past_experiences: "",
    health_info: "",
    has_own_equipment: false,
    equipment_details: "",
    dream_destinations: [],
    preferred_trip_types: [],
    interests: [],
    travel_companions: "",
    preferred_periods: [],
    budget_range: "1500",
    travel_dreams: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);

    const provider = session.user.app_metadata?.provider;
    const isOAuth = provider && provider !== 'email';

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profile) {
      if (profile.onboarding_completed) {
        setIsEditMode(true);
      }
      
      const hasOAuthData = !!(isOAuth && (profile.avatar_url || profile.first_name));
      setIsOAuthImported(hasOAuthData);

      // Type-safe profile field access
      const profileData = profile as Record<string, unknown>;
      
      setFormData({
        first_name: (profileData.first_name as string) || session.user.user_metadata?.first_name || "",
        last_name: (profileData.last_name as string) || session.user.user_metadata?.last_name || "",
        phone: (profileData.phone as string) || "",
        avatar_url: (profileData.avatar_url as string) || session.user.user_metadata?.avatar_url || "",
        birth_date: (profileData.birth_date as string) || "",
        address_line1: (profileData.address_line1 as string) || "",
        address_line2: (profileData.address_line2 as string) || "",
        city: (profileData.city as string) || "",
        postal_code: (profileData.postal_code as string) || "",
        country: (profileData.country as string) || "France",
        riding_level: (profileData.riding_level as string) || "",
        riding_experience_years: (profileData.riding_experience_years as number) || 0,
        riding_style: (profileData.riding_style as string[]) || [],
        height_cm: (profileData.height_cm as number) || 170,
        weight_kg: (profileData.weight_kg as number) || 70,
        past_experiences: (profileData.past_experiences as string) || "",
        health_info: (profileData.health_info as string) || "",
        has_own_equipment: (profileData.has_own_equipment as boolean) || false,
        equipment_details: (profileData.equipment_details as string) || "",
        dream_destinations: (profileData.dream_destinations as string[]) || [],
        preferred_trip_types: (profileData.preferred_trip_types as string[]) || [],
        interests: (profileData.interests as string[]) || [],
        travel_companions: (profileData.travel_companions as string) || "",
        preferred_periods: (profileData.preferred_periods as string[]) || [],
        budget_range: (profileData.budget_range as string) || "1500",
        travel_dreams: (profileData.travel_dreams as string) || "",
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof FormData, item: string) => {
    setFormData((prev) => {
      const array = prev[field] as string[];
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter((i) => i !== item) };
      }
      return { ...prev, [field]: [...array, item] };
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userId) {
      toast.error("Veuillez vous reconnecter pour uploader une photo");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image (JPG, PNG, etc.)");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const fileName = `${userId}/avatar-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      updateFormData("avatar_url", publicUrl);
      toast.success("Photo ajoutée avec succès !");
    } catch (error: unknown) {
      console.error("Avatar upload error:", error);
      toast.error("Erreur lors de l'upload. Réessayez.");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    // Validation par étape
    if (currentStep === 1) {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        toast.error("Veuillez renseigner votre nom et prénom");
        return;
      }
      if (!formData.phone.trim()) {
        toast.error("Veuillez renseigner votre numéro de téléphone");
        return;
      }
    }
    if (currentStep === 3) {
      if (!formData.riding_level) {
        toast.error("Veuillez sélectionner votre niveau équestre");
        return;
      }
      if (formData.riding_style.length === 0) {
        toast.error("Veuillez sélectionner au moins un style d'équitation");
        return;
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validation finale
    if (formData.dream_destinations.length === 0) {
      toast.error("Veuillez sélectionner au moins une destination rêvée");
      return;
    }
    if (formData.preferred_trip_types.length === 0) {
      toast.error("Veuillez sélectionner au moins un type de voyage");
      return;
    }
    if (formData.interests.length === 0) {
      toast.error("Veuillez sélectionner au moins un centre d'intérêt");
      return;
    }
    if (!formData.travel_companions) {
      toast.error("Veuillez sélectionner avec qui vous voyagez");
      return;
    }

    if (!userId) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      navigate("/auth");
      return;
    }
    
    setLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
        birth_date: formData.birth_date || null,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
        riding_level: formData.riding_level as "debutant" | "intermediaire" | "confirme" | "expert" | null,
        riding_experience_years: formData.riding_experience_years,
        riding_style: formData.riding_style,
        height_cm: formData.height_cm,
        weight_kg: formData.weight_kg,
        past_experiences: formData.past_experiences,
        health_info: formData.health_info,
        has_own_equipment: formData.has_own_equipment,
        equipment_details: formData.equipment_details,
        dream_destinations: formData.dream_destinations,
        preferred_trip_types: formData.preferred_trip_types,
        interests: formData.interests,
        travel_companions: formData.travel_companions,
        preferred_periods: formData.preferred_periods,
        budget_range: formData.budget_range,
        travel_dreams: formData.travel_dreams,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId)
        .select();

      if (error) {
        console.error("Profile update error:", error);
        toast.error("Erreur lors de la sauvegarde: " + error.message);
      } else if (!data || data.length === 0) {
        toast.error("Profil introuvable. Veuillez vous reconnecter.");
        navigate("/auth");
      } else {
        if (!isEditMode) {
          triggerProfileCompleteConfetti();
        }
        toast.success(isEditMode ? "Profil mis à jour ! ✅" : "Bienvenue dans la tribu An Arwen ! 🐴");
        navigate("/mon-espace");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    return `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase() || "?";
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Layout>
      <section className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4 gap-2">
              <Sparkles className="w-4 h-4" />
              {isEditMode ? "Modifier mon profil" : "Questionnaire de bienvenue"}
            </Badge>
            <h1 className="font-serif text-3xl font-bold mb-2">
              {isEditMode ? "Mettez à jour vos préférences" : "Préparez votre aventure"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Modifiez vos informations et préférences"
                : "Quelques questions pour personnaliser votre expérience"}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Étape {currentStep} sur {STEPS.length}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between mt-6 overflow-x-auto pb-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 min-w-[60px] ${
                    step.id === currentStep ? "text-primary" : step.id < currentStep ? "text-primary/60" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      step.id === currentStep
                        ? "bg-primary text-primary-foreground scale-110"
                        : step.id < currentStep
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {step.id < currentStep ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <p className="text-xs font-medium text-center hidden sm:block">{step.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-3">
                {STEPS[currentStep - 1] && (
                  <>
                    {(() => {
                      const StepIcon = STEPS[currentStep - 1].icon;
                      return <StepIcon className="h-5 w-5 text-primary" />;
                    })()}
                    {STEPS[currentStep - 1].description}
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Vos informations personnelles de base"}
                {currentStep === 2 && "Pour vous envoyer vos documents de voyage"}
                {currentStep === 3 && "Pour vous proposer des séjours adaptés"}
                {currentStep === 4 && "Pour préparer au mieux votre randonnée"}
                {currentStep === 5 && "Partagez vos rêves d'évasion"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Step 1: Identity */}
              {currentStep === 1 && (
                <>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                      <Avatar className="h-24 w-24 border-4 border-primary/20">
                        {formData.avatar_url && <AvatarImage src={formData.avatar_url} alt="Avatar" />}
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploading ? <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" /> : <Camera className="h-6 w-6 text-primary-foreground" />}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </div>
                    {isOAuthImported && formData.avatar_url ? (
                      <Badge variant="secondary" className="gap-1.5"><Check className="h-3 w-3" />Importé de Google</Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">Cliquez pour ajouter une photo</p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Prénom *</Label>
                      <Input id="first_name" value={formData.first_name} onChange={(e) => updateFormData("first_name", e.target.value)} placeholder="Jean" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nom *</Label>
                      <Input id="last_name" value={formData.last_name} onChange={(e) => updateFormData("last_name", e.target.value)} placeholder="Dupont" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input id="phone" type="tel" value={formData.phone} onChange={(e) => updateFormData("phone", e.target.value)} placeholder="06 12 34 56 78" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Date de naissance</Label>
                      <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => updateFormData("birth_date", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Address */}
              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Adresse</Label>
                    <Input id="address_line1" value={formData.address_line1} onChange={(e) => updateFormData("address_line1", e.target.value)} placeholder="123 rue de la Ferme" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Complément d'adresse</Label>
                    <Input id="address_line2" value={formData.address_line2} onChange={(e) => updateFormData("address_line2", e.target.value)} placeholder="Appartement, étage..." />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Code postal</Label>
                      <Input id="postal_code" value={formData.postal_code} onChange={(e) => updateFormData("postal_code", e.target.value)} placeholder="35000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" value={formData.city} onChange={(e) => updateFormData("city", e.target.value)} placeholder="Rennes" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input id="country" value={formData.country} onChange={(e) => updateFormData("country", e.target.value)} placeholder="France" />
                  </div>
                </>
              )}

              {/* Step 3: Rider Profile */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-4">
                    <Label className="text-base">Votre niveau équestre *</Label>
                    <RadioGroup value={formData.riding_level} onValueChange={(value) => updateFormData("riding_level", value)} className="grid sm:grid-cols-2 gap-3">
                      {RIDING_LEVELS.map((level) => (
                        <div
                          key={level.value}
                          className={`relative flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.riding_level === level.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                          onClick={() => updateFormData("riding_level", level.value)}
                        >
                          <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                          <div className="ml-3 flex-1">
                            <Label htmlFor={level.value} className="font-medium cursor-pointer flex items-center gap-2">
                              <span className="text-lg">{level.emoji}</span>{level.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Années d'expérience</Label>
                      <span className="text-sm font-medium text-primary">{formData.riding_experience_years} {formData.riding_experience_years > 1 ? "ans" : "an"}</span>
                    </div>
                    <Slider value={[formData.riding_experience_years]} onValueChange={([value]) => updateFormData("riding_experience_years", value)} min={0} max={30} step={1} className="py-4" />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Styles d'équitation pratiqués *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RIDING_STYLES.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.riding_style.includes(style.value) ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => toggleArrayItem("riding_style", style.value)}
                        >
                          <span className="text-xl block mb-1">{style.emoji}</span>
                          <span className="text-xs font-medium">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="past_experiences">Expériences équestres passées</Label>
                    <Textarea
                      id="past_experiences"
                      value={formData.past_experiences}
                      onChange={(e) => updateFormData("past_experiences", e.target.value)}
                      placeholder="Randonnées déjà réalisées, pays visités à cheval, chevaux montés..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Step 4: Equipment & Health */}
              {currentStep === 4 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Taille (cm)</Label>
                      <Input type="number" value={formData.height_cm} onChange={(e) => updateFormData("height_cm", parseInt(e.target.value) || 170)} min={100} max={220} />
                    </div>
                    <div className="space-y-2">
                      <Label>Poids (kg)</Label>
                      <Input type="number" value={formData.weight_kg} onChange={(e) => updateFormData("weight_kg", parseInt(e.target.value) || 70)} min={30} max={150} />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_equipment"
                      checked={formData.has_own_equipment}
                      onCheckedChange={(checked) => updateFormData("has_own_equipment", !!checked)}
                    />
                    <Label htmlFor="has_equipment" className="cursor-pointer">Je possède mon propre équipement (bombe, selle, etc.)</Label>
                  </div>

                  {formData.has_own_equipment && (
                    <div className="space-y-2">
                      <Label htmlFor="equipment_details">Détails de votre équipement</Label>
                      <Textarea
                        id="equipment_details"
                        value={formData.equipment_details}
                        onChange={(e) => updateFormData("equipment_details", e.target.value)}
                        placeholder="Bombe taille S, selle western, etc."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="space-y-2 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Informations médicales importantes</Label>
                    </div>
                    <Textarea
                      id="health_info"
                      value={formData.health_info}
                      onChange={(e) => updateFormData("health_info", e.target.value)}
                      placeholder="Allergies, conditions médicales, traitements en cours... Ces informations restent confidentielles."
                      rows={3}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Ces informations sont importantes pour votre sécurité.</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Périodes de disponibilité préférées</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PREFERRED_PERIODS.map((period) => (
                        <button
                          key={period.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.preferred_periods.includes(period.value) ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => toggleArrayItem("preferred_periods", period.value)}
                        >
                          <span className="text-xl block mb-1">{period.emoji}</span>
                          <span className="text-xs font-medium">{period.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 5: Dreams */}
              {currentStep === 5 && (
                <>
                  <div className="space-y-4">
                    <Label className="text-base">Destinations qui vous font rêver *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {DESTINATIONS.map((dest) => (
                        <button
                          key={dest.name}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.dream_destinations.includes(dest.name) ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => toggleArrayItem("dream_destinations", dest.name)}
                        >
                          <span className="text-xl block mb-1">{dest.emoji}</span>
                          <span className="text-xs font-medium">{dest.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Type de séjour préféré *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRIP_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.preferred_trip_types.includes(type.value) ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => toggleArrayItem("preferred_trip_types", type.value)}
                        >
                          <span className="text-xl block mb-1">{type.emoji}</span>
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Vos centres d'intérêt *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {INTERESTS.map((interest) => (
                        <button
                          key={interest.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.interests.includes(interest.value) ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => toggleArrayItem("interests", interest.value)}
                        >
                          <span className="text-xl block mb-1">{interest.emoji}</span>
                          <span className="text-xs font-medium">{interest.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Avec qui voyagez-vous habituellement ? *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TRAVEL_COMPANIONS.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${formData.travel_companions === style.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                          onClick={() => updateFormData("travel_companions", style.value)}
                        >
                          <span className="text-xl block mb-1">{style.emoji}</span>
                          <span className="text-xs font-medium">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Budget estimé</Label>
                      <span className="text-sm font-medium text-primary">
                        {BUDGET_LABELS[parseInt(formData.budget_range)] || `${formData.budget_range}€`}
                      </span>
                    </div>
                    <Slider
                      value={[parseInt(formData.budget_range)]}
                      onValueChange={([value]) => updateFormData("budget_range", value.toString())}
                      min={500}
                      max={3000}
                      step={500}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>500€</span>
                      <span>3 000€+</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="travel_dreams">Décrivez vos rêves de voyages à cheval</Label>
                    <Textarea
                      id="travel_dreams"
                      value={formData.travel_dreams}
                      onChange={(e) => updateFormData("travel_dreams", e.target.value)}
                      placeholder="Galoper au coucher du soleil sur une plage marocaine, traverser les steppes mongoles, découvrir la forêt de Brocéliande..."
                      rows={4}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 gap-4">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="flex-1 sm:flex-none">
              <ChevronLeft className="h-4 w-4 mr-2" />Retour
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} className="flex-1 sm:flex-none">
                Suivant<ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Terminer
              </Button>
            )}
          </div>

          {/* Skip */}
          <div className="text-center mt-4">
            <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => navigate("/mon-espace")}>
              Compléter plus tard
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Onboarding;
