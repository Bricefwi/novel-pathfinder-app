import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Award, 
  Mail, 
  Phone, 
  MapPin,
  Heart,
  Mountain,
  Compass,
  Star,
  Shield,
  ChevronRight,
  Sparkles,
  Edit
} from "lucide-react";
import { calculateProfileCompletion, type ProfileForCompletion } from "@/lib/profile-utils";

interface Profile extends ProfileForCompletion {
  id: string;
  avatar_url: string | null;
  bio: string | null;
  preferred_duration: string | null;
  onboarding_completed: boolean | null;
}

interface TravelHubProfileProps {
  profile: Profile | null;
  userEmail: string;
  loading: boolean;
}

export const TravelHubProfile = ({ profile, userEmail, loading }: TravelHubProfileProps) => {
  const navigate = useNavigate();

  const getRidingLevelLabel = (level: string | null) => {
    const labels: Record<string, string> = {
      debutant: "Débutant",
      intermediaire: "Intermédiaire",
      confirme: "Confirmé",
      expert: "Expert",
    };
    return level ? labels[level] || level : "Non renseigné";
  };

  const getRidingLevelIcon = (level: string | null) => {
    switch (level) {
      case 'debutant':
        return '🐴';
      case 'intermediaire':
        return '🏇';
      case 'confirme':
        return '🎠';
      case 'expert':
        return '🏆';
      default:
        return '❓';
    }
  };

  const profileCompletion = calculateProfileCompletion(profile);
  const isVerified = profileCompletion === 100;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                {profile?.first_name?.[0] || profile?.last_name?.[0] || 'U'}
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-serif font-bold">
                  {profile?.first_name || ''} {profile?.last_name || 'Cavalier Anonyme'}
                </h2>
                {isVerified && (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/30 w-fit mx-auto md:mx-0">
                    <Shield className="h-3 w-3 mr-1" />
                    Cavalier Vérifié
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-3">{userEmail}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-lg">{getRidingLevelIcon(profile?.riding_level)}</span>
                  {getRidingLevelLabel(profile?.riding_level)}
                </span>
                {profile?.riding_experience_years && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Mountain className="h-4 w-4" />
                    {profile.riding_experience_years} ans d'expérience
                  </span>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Button variant="outline" onClick={() => navigate("/onboarding")}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </div>

        {/* Profile Completion */}
        {!isVerified && (
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profil complété</span>
              <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Complétez votre profil à 100% pour obtenir le badge "Cavalier Vérifié"
            </p>
          </CardContent>
        )}
      </Card>

      {/* Profile Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Riding Level Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Niveau Équestre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {['debutant', 'intermediaire', 'confirme', 'expert'].map((level) => (
                <div
                  key={level}
                  className={`text-center p-3 rounded-xl transition-colors ${
                    profile?.riding_level === level
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50 border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl block mb-1">{getRidingLevelIcon(level)}</span>
                  <span className="text-xs">
                    {getRidingLevelLabel(level)}
                  </span>
                </div>
              ))}
            </div>
            {profile?.riding_experience_years && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                {profile.riding_experience_years} années d'expérience
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Coordonnées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <span>{userEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <span>{profile?.phone || 'Non renseigné'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dream Destinations */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Destinations Rêvées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.dream_destinations?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.dream_destinations.map((dest) => (
                  <Badge key={dest} variant="secondary" className="px-3 py-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {dest}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyPreference 
                text="Ajoutez vos destinations rêvées"
                onEdit={() => navigate("/onboarding")}
              />
            )}
          </CardContent>
        </Card>

        {/* Trip Preferences */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Types de Séjours Préférés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.preferred_trip_types?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.preferred_trip_types.map((type) => (
                  <Badge key={type} variant="outline" className="px-3 py-1">
                    {type}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyPreference 
                text="Définissez vos préférences de voyage"
                onEdit={() => navigate("/onboarding")}
              />
            )}
          </CardContent>
        </Card>

        {/* Riding Style */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Mountain className="h-5 w-5 text-primary" />
              Style d'Équitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.riding_style?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.riding_style.map((style) => (
                  <Badge key={style} variant="outline" className="px-3 py-1">
                    {style}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyPreference 
                text="Indiquez votre style d'équitation"
                onEdit={() => navigate("/onboarding")}
              />
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Centres d'Intérêt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.interests?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="px-3 py-1">
                    {interest}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyPreference 
                text="Partagez vos centres d'intérêt"
                onEdit={() => navigate("/onboarding")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              À Propos de Moi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Complétez votre profil</h3>
              <p className="text-sm text-muted-foreground">
                Plus votre profil est complet, meilleures seront nos recommandations
              </p>
            </div>
            <Button onClick={() => navigate("/onboarding")}>
              Modifier mes préférences
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Empty Preference Component
const EmptyPreference = ({ text, onEdit }: { text: string; onEdit: () => void }) => (
  <div className="text-center py-4">
    <p className="text-sm text-muted-foreground mb-2">{text}</p>
    <Button variant="ghost" size="sm" onClick={onEdit}>
      Ajouter
    </Button>
  </div>
);

export default TravelHubProfile;
