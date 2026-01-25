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
  Info,
  Sparkles
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Identité", icon: User, description: "Faisons connaissance" },
  { id: 2, title: "Cavalier", icon: Mountain, description: "Votre profil équestre" },
  { id: 3, title: "Rêves", icon: Heart, description: "Vos envies de voyage" },
];

const RIDING_LEVELS = [
  { 
    value: "debutant", 
    label: "Débutant", 
    description: "Peu ou pas d'expérience. Parfait pour découvrir l'équitation !",
    emoji: "🌱"
  },
  { 
    value: "intermediaire", 
    label: "Intermédiaire", 
    description: "À l'aise au pas et au trot, quelques galops en sécurité.",
    emoji: "🌿"
  },
  { 
    value: "confirme", 
    label: "Confirmé", 
    description: "Autonome aux trois allures, expérience de randonnée.",
    emoji: "🌳"
  },
  { 
    value: "expert", 
    label: "Expert", 
    description: "Cavalier très expérimenté, capable de gérer toutes situations.",
    emoji: "⭐"
  },
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

const TRAVEL_STYLES = [
  { value: "solo", label: "Solo", emoji: "🚶" },
  { value: "couple", label: "En couple", emoji: "💑" },
  { value: "famille", label: "En famille", emoji: "👨‍👩‍👧" },
  { value: "groupe", label: "En groupe", emoji: "👥" },
];

const BUDGET_LABELS: Record<number, string> = {
  500: "500€ - Week-end",
  1000: "1 000€ - Semaine courte",
  1500: "1 500€ - Semaine complète",
  2000: "2 000€ - Séjour premium",
  3000: "3 000€+ - Expédition",
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOAuthImported, setIsOAuthImported] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
    riding_level: "",
    riding_experience_years: 0,
    riding_style: [] as string[],
    height_cm: 170,
    weight_kg: 70,
    dream_destinations: [] as string[],
    preferred_trip_types: [] as string[],
    interests: [] as string[],
    travel_style: "",
    budget_range: "1500",
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

    // Check if user signed in via OAuth (Google, Facebook, etc.)
    const provider = session.user.app_metadata?.provider;
    const isOAuth = provider && provider !== 'email';

    // Load existing profile data (populated by trigger for OAuth users)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profile) {
      // If already completed, user is in edit mode (came from /mon-espace)
      if (profile.onboarding_completed) {
        setIsEditMode(true);
      }
      
      // Check if data was imported from OAuth
      const hasOAuthData = !!(isOAuth && (profile.avatar_url || profile.first_name));
      setIsOAuthImported(hasOAuthData);
      
      setFormData({
        first_name: profile.first_name || session.user.user_metadata?.first_name || "",
        last_name: profile.last_name || session.user.user_metadata?.last_name || "",
        phone: profile.phone || "",
        avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url || "",
        riding_level: profile.riding_level || "",
        riding_experience_years: profile.riding_experience_years || 0,
        riding_style: profile.riding_style || [],
        height_cm: profile.height_cm || 170,
        weight_kg: profile.weight_kg || 70,
        dream_destinations: profile.dream_destinations || [],
        preferred_trip_types: profile.preferred_trip_types || [],
        interests: profile.interests || [],
        travel_style: profile.travel_style || "",
        budget_range: profile.budget_range || "1500",
      });
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData((prev) => {
      const array = prev[field as keyof typeof prev] as string[];
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter((i) => i !== item) };
      }
      return { ...prev, [field]: [...array, item] };
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check user authentication first
    if (!userId) {
      toast.error("Veuillez vous reconnecter pour uploader une photo");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image (JPG, PNG, etc.)");
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const fileName = `${userId}/avatar-${timestamp}.${fileExt}`;

      console.log("Uploading avatar to:", fileName);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      console.log("Public URL:", publicUrl);

      updateFormData("avatar_url", publicUrl);
      toast.success("Photo ajoutée avec succès !");
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      if (error.message?.includes("security")) {
        toast.error("Erreur de permission. Veuillez vous reconnecter.");
      } else if (error.message?.includes("size")) {
        toast.error("Fichier trop volumineux. Maximum 2 Mo.");
      } else {
        toast.error("Erreur lors de l'upload. Réessayez.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    // Validate current step
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
    if (currentStep === 2) {
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
    console.log("handleSubmit called, userId:", userId);
    
    // Final validation
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
    if (!formData.travel_style) {
      toast.error("Veuillez sélectionner votre style de voyage");
      return;
    }

    if (!userId) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      navigate("/auth");
      return;
    }
    
    setLoading(true);

    try {
      console.log("Updating profile for user:", userId);
      console.log("Form data:", formData);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          riding_level: formData.riding_level as "debutant" | "intermediaire" | "confirme" | "expert" | null,
          riding_experience_years: formData.riding_experience_years,
          riding_style: formData.riding_style,
          height_cm: formData.height_cm,
          weight_kg: formData.weight_kg,
          dream_destinations: formData.dream_destinations,
          preferred_trip_types: formData.preferred_trip_types,
          interests: formData.interests,
          travel_style: formData.travel_style,
          budget_range: formData.budget_range,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select();

      console.log("Update result:", { data, error });

      if (error) {
        console.error("Profile update error:", error);
        toast.error("Erreur lors de la sauvegarde: " + error.message);
      } else if (!data || data.length === 0) {
        console.error("No profile updated - profile may not exist");
        toast.error("Profil introuvable. Veuillez vous reconnecter.");
        navigate("/auth");
      } else {
        // Trigger confetti for first-time profile completion
        if (!isEditMode) {
          triggerProfileCompleteConfetti();
        }
        toast.success(isEditMode ? "Profil mis à jour avec succès ! ✅" : "Bienvenue dans la tribu An Arwen ! 🐴");
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
                ? "Modifiez vos informations et préférences de voyage"
                : "Quelques questions pour personnaliser votre expérience"}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Étape {currentStep} sur {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between mt-6">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 flex-1 ${
                    step.id === currentStep
                      ? "text-primary"
                      : step.id < currentStep
                      ? "text-primary/60"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step.id === currentStep
                        ? "bg-primary text-primary-foreground scale-110"
                        : step.id < currentStep
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-3">
                {currentStep === 1 && <User className="h-5 w-5 text-primary" />}
                {currentStep === 2 && <Mountain className="h-5 w-5 text-primary" />}
                {currentStep === 3 && <Heart className="h-5 w-5 text-primary" />}
                {currentStep === 1 && "Faisons connaissance"}
                {currentStep === 2 && "Votre profil cavalier"}
                {currentStep === 3 && "Vos rêves d'évasion"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Ces informations nous permettent de personnaliser votre expérience"}
                {currentStep === 2 && "Pour vous proposer des séjours adaptés à votre niveau"}
                {currentStep === 3 && "Aidez-nous à comprendre ce qui vous fait vibrer"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Identity & Avatar */}
              {currentStep === 1 && (
                <>
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center space-y-4">
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Avatar className="h-24 w-24 border-4 border-primary/20">
                        {formData.avatar_url ? (
                          <AvatarImage src={formData.avatar_url} alt="Avatar" />
                        ) : null}
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploading ? (
                          <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-primary-foreground" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    {isOAuthImported && formData.avatar_url ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Check className="h-3 w-3" />
                        Importé de Google
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour ajouter une photo (optionnel)
                      </p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Prénom *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => updateFormData("first_name", e.target.value)}
                        placeholder="Jean"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nom *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => updateFormData("last_name", e.target.value)}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Rider Profile */}
              {currentStep === 2 && (
                <>
                  <div className="space-y-4">
                    <Label className="text-base">Votre niveau équestre *</Label>
                    <RadioGroup
                      value={formData.riding_level}
                      onValueChange={(value) => updateFormData("riding_level", value)}
                      className="grid sm:grid-cols-2 gap-3"
                    >
                      {RIDING_LEVELS.map((level) => (
                        <div
                          key={level.value}
                          className={`relative flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            formData.riding_level === level.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => updateFormData("riding_level", level.value)}
                        >
                          <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                          <div className="ml-3 flex-1">
                            <Label htmlFor={level.value} className="font-medium cursor-pointer flex items-center gap-2">
                              <span className="text-lg">{level.emoji}</span>
                              {level.label}
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
                      <span className="text-sm font-medium text-primary">
                        {formData.riding_experience_years} an{formData.riding_experience_years > 1 ? "s" : ""}
                      </span>
                    </div>
                    <Slider
                      value={[formData.riding_experience_years]}
                      onValueChange={([value]) => updateFormData("riding_experience_years", value)}
                      min={0}
                      max={30}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Débutant</span>
                      <span>30+ ans</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Votre style d'équitation *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RIDING_STYLES.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.riding_style.includes(style.value)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => toggleArrayItem("riding_style", style.value)}
                        >
                          <span className="text-xl block mb-1">{style.emoji}</span>
                          <span className="text-xs font-medium">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Pour le bien-être de votre monture et votre sécurité, nous avons besoin de ces informations.
                        Elles restent strictement confidentielles.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="height">Taille (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          min={100}
                          max={220}
                          value={formData.height_cm}
                          onChange={(e) => updateFormData("height_cm", parseInt(e.target.value) || 170)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weight">Poids (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          min={30}
                          max={150}
                          value={formData.weight_kg}
                          onChange={(e) => updateFormData("weight_kg", parseInt(e.target.value) || 70)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Dreams & Preferences */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-4">
                    <Label className="text-base">Quelles destinations vous font rêver ? *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {DESTINATIONS.map((dest) => (
                        <button
                          key={dest.name}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.dream_destinations.includes(dest.name)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => toggleArrayItem("dream_destinations", dest.name)}
                        >
                          <span className="text-2xl block mb-1">{dest.emoji}</span>
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
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.preferred_trip_types.includes(type.value)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
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
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.interests.includes(interest.value)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => toggleArrayItem("interests", interest.value)}
                        >
                          <span className="text-xl block mb-1">{interest.emoji}</span>
                          <span className="text-xs font-medium">{interest.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Votre style de voyage *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TRAVEL_STYLES.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            formData.travel_style === style.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => updateFormData("travel_style", style.value)}
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} className="flex-1 sm:flex-none">
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Terminer
              </Button>
            )}
          </div>

          {/* Skip */}
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              className="text-muted-foreground text-sm"
              onClick={() => navigate("/mon-espace")}
            >
              Compléter plus tard
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Onboarding;
