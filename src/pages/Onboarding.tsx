import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  Mountain, 
  MapPin, 
  Heart, 
  Compass,
  Sparkles
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Profil", icon: User },
  { id: 2, title: "Niveau équestre", icon: Mountain },
  { id: 3, title: "Destinations", icon: MapPin },
  { id: 4, title: "Préférences", icon: Heart },
];

const RIDING_LEVELS = [
  { value: "debutant", label: "Débutant", description: "Peu ou pas d'expérience à cheval" },
  { value: "intermediaire", label: "Intermédiaire", description: "À l'aise aux 3 allures" },
  { value: "confirme", label: "Confirmé", description: "Cavalier autonome en extérieur" },
  { value: "expert", label: "Expert", description: "Cavalier expérimenté, toutes situations" },
];

const RIDING_STYLES = [
  "Randonnée tranquille",
  "Randonnée sportive",
  "Travail en carrière",
  "Balade en forêt",
  "Plage et littoral",
  "Montagne",
  "Désert",
  "Travail de bétail",
];

const DESTINATIONS = [
  "Bretagne",
  "Maroc",
  "Islande",
  "Irlande",
  "Espagne",
  "Portugal",
  "Mongolie",
  "Argentine",
  "Canada",
  "France (autres régions)",
];

const TRIP_TYPES = [
  "Aventure et découverte",
  "Romantique en couple",
  "Voyage en famille",
  "Solo",
  "Entre amis",
  "Séjour détente",
  "Immersion culturelle",
  "Défi sportif",
];

const INTERESTS = [
  "Photographie",
  "Nature et faune sauvage",
  "Gastronomie locale",
  "Histoire et patrimoine",
  "Bien-être et yoga",
  "Camping et bivouac",
  "Rencontres locales",
  "Légendes et mythologie",
];

const DURATIONS = [
  { value: "weekend", label: "Week-end (2-3 jours)" },
  { value: "semaine", label: "1 semaine" },
  { value: "10jours", label: "10 jours" },
  { value: "2semaines", label: "2 semaines ou plus" },
];

const TRAVEL_STYLES = [
  { value: "confort", label: "Confort", description: "Hébergements de qualité, transferts organisés" },
  { value: "aventure", label: "Aventure", description: "Bivouac, yourtes, expérience authentique" },
  { value: "mixte", label: "Mixte", description: "Un peu des deux selon les étapes" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    bio: "",
    riding_level: "",
    riding_experience_years: 0,
    riding_style: [] as string[],
    dream_destinations: [] as string[],
    preferred_trip_types: [] as string[],
    preferred_duration: "",
    travel_style: "",
    interests: [] as string[],
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
    
    // Load existing profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        riding_level: profile.riding_level || "",
        riding_experience_years: profile.riding_experience_years || 0,
        riding_style: profile.riding_style || [],
        dream_destinations: profile.dream_destinations || [],
        preferred_trip_types: profile.preferred_trip_types || [],
        preferred_duration: profile.preferred_duration || "",
        travel_style: profile.travel_style || "",
        interests: profile.interests || [],
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

  const handleNext = () => {
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
    if (!userId) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        bio: formData.bio,
        riding_level: formData.riding_level as "debutant" | "intermediaire" | "confirme" | "expert" | null,
        riding_experience_years: formData.riding_experience_years,
        riding_style: formData.riding_style,
        dream_destinations: formData.dream_destinations,
        preferred_trip_types: formData.preferred_trip_types,
        preferred_duration: formData.preferred_duration,
        travel_style: formData.travel_style,
        interests: formData.interests,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Profil complété avec succès !");
      navigate("/mon-espace");
    }
    setLoading(false);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Layout>
      <section className="pt-32 pb-16 min-h-screen">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="text-primary border-primary/30">
                <Sparkles className="w-4 h-4 mr-2" />
                Questionnaire de bienvenue
              </Badge>
              <span className="text-sm text-muted-foreground">
                Étape {currentStep} sur {STEPS.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    step.id === currentStep
                      ? "text-primary"
                      : step.id < currentStep
                      ? "text-primary/60"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.id === currentStep
                        ? "bg-primary text-primary-foreground"
                        : step.id < currentStep
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-serif text-2xl flex items-center gap-3">
                {currentStep === 1 && (
                  <>
                    <User className="h-6 w-6 text-primary" />
                    Parlons de vous
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <Mountain className="h-6 w-6 text-primary" />
                    Votre expérience équestre
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <MapPin className="h-6 w-6 text-primary" />
                    Vos destinations de rêve
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <Heart className="h-6 w-6 text-primary" />
                    Vos préférences de voyage
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Profile */}
              {currentStep === 1 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Prénom *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => updateFormData("first_name", e.target.value)}
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nom *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => updateFormData("last_name", e.target.value)}
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Présentez-vous en quelques mots</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => updateFormData("bio", e.target.value)}
                      placeholder="Ce qui vous passionne, vos motivations pour la randonnée équestre..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Riding Level */}
              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="text-base mb-4 block">Quel est votre niveau équestre ?</Label>
                    <RadioGroup
                      value={formData.riding_level}
                      onValueChange={(value) => updateFormData("riding_level", value)}
                      className="space-y-3"
                    >
                      {RIDING_LEVELS.map((level) => (
                        <div
                          key={level.value}
                          className={`flex items-start space-x-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                            formData.riding_level === level.value
                              ? "border-primary bg-primary/5"
                              : "border-border/50 hover:border-primary/30"
                          }`}
                          onClick={() => updateFormData("riding_level", level.value)}
                        >
                          <RadioGroupItem value={level.value} id={level.value} />
                          <div>
                            <Label htmlFor={level.value} className="font-medium cursor-pointer">
                              {level.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">{level.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="experience">Années d'expérience à cheval</Label>
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      max={50}
                      value={formData.riding_experience_years}
                      onChange={(e) => updateFormData("riding_experience_years", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label className="text-base mb-4 block">
                      Quels styles d'équitation vous attirent ? (plusieurs choix possibles)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {RIDING_STYLES.map((style) => (
                        <Badge
                          key={style}
                          variant={formData.riding_style.includes(style) ? "default" : "outline"}
                          className="cursor-pointer text-sm py-2 px-4"
                          onClick={() => toggleArrayItem("riding_style", style)}
                        >
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Destinations */}
              {currentStep === 3 && (
                <>
                  <div>
                    <Label className="text-base mb-4 block">
                      Quelles destinations vous font rêver ? (plusieurs choix possibles)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {DESTINATIONS.map((dest) => (
                        <div
                          key={dest}
                          className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                            formData.dream_destinations.includes(dest)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/50 hover:border-primary/30"
                          }`}
                          onClick={() => toggleArrayItem("dream_destinations", dest)}
                        >
                          <Compass className="h-6 w-6 mx-auto mb-2" />
                          <span className="text-sm font-medium">{dest}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base mb-4 block">
                      Quels types de séjours vous correspondent ? (plusieurs choix possibles)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {TRIP_TYPES.map((type) => (
                        <Badge
                          key={type}
                          variant={formData.preferred_trip_types.includes(type) ? "default" : "outline"}
                          className="cursor-pointer text-sm py-2 px-4"
                          onClick={() => toggleArrayItem("preferred_trip_types", type)}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Preferences */}
              {currentStep === 4 && (
                <>
                  <div>
                    <Label className="text-base mb-4 block">Durée idéale de séjour</Label>
                    <RadioGroup
                      value={formData.preferred_duration}
                      onValueChange={(value) => updateFormData("preferred_duration", value)}
                      className="grid grid-cols-2 gap-3"
                    >
                      {DURATIONS.map((duration) => (
                        <div
                          key={duration.value}
                          className={`flex items-center space-x-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                            formData.preferred_duration === duration.value
                              ? "border-primary bg-primary/5"
                              : "border-border/50 hover:border-primary/30"
                          }`}
                          onClick={() => updateFormData("preferred_duration", duration.value)}
                        >
                          <RadioGroupItem value={duration.value} id={duration.value} />
                          <Label htmlFor={duration.value} className="cursor-pointer">
                            {duration.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-base mb-4 block">Votre style de voyage</Label>
                    <RadioGroup
                      value={formData.travel_style}
                      onValueChange={(value) => updateFormData("travel_style", value)}
                      className="space-y-3"
                    >
                      {TRAVEL_STYLES.map((style) => (
                        <div
                          key={style.value}
                          className={`flex items-start space-x-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                            formData.travel_style === style.value
                              ? "border-primary bg-primary/5"
                              : "border-border/50 hover:border-primary/30"
                          }`}
                          onClick={() => updateFormData("travel_style", style.value)}
                        >
                          <RadioGroupItem value={style.value} id={style.value} />
                          <div>
                            <Label htmlFor={style.value} className="font-medium cursor-pointer">
                              {style.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">{style.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-base mb-4 block">
                      Vos centres d'intérêt (plusieurs choix possibles)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((interest) => (
                        <Badge
                          key={interest}
                          variant={formData.interests.includes(interest) ? "default" : "outline"}
                          className="cursor-pointer text-sm py-2 px-4"
                          onClick={() => toggleArrayItem("interests", interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext}>
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Enregistrement..." : "Terminer"}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Skip Option */}
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              className="text-muted-foreground"
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
