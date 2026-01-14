import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Calendar, Users, Euro, Compass, Star, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";

// Import real images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCavalierCote from "@/assets/maroc-cavalier-cote.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

interface Sejour {
  id: string;
  titre: string;
  sousTitre?: string;
  description: string;
  image: string;
  niveau: string;
  duree: string;
  prixFrom: number | null;
  rating: number;
  inclusions: string[];
}

interface Region {
  nom: string;
  sejours: Sejour[];
}

interface Pays {
  nom: string;
  regions: Region[];
}

// Structure des destinations par arborescence : Pays > Région > Séjours
const destinations: Pays[] = [
  {
    nom: "France",
    regions: [
      {
        nom: "Bretagne",
        sejours: [
          {
            id: "bretagne-romantique",
            titre: "Bretagne Romantique",
            sousTitre: "Une escapade entre châteaux et forêts enchantées",
            description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours. Entre landes sauvages et patrimoine historique.",
            image: cavaliersPlageCoucherSoleil,
            niveau: "Tous niveaux",
            duree: "3-5 jours",
            prixFrom: 480,
            rating: 4.9,
            inclusions: ["Hébergement en gîte", "Pension complète", "Guide accompagnateur", "Matériel équestre"],
          },
          {
            id: "terre-mer",
            titre: "De la Terre à la Mer",
            sousTitre: "Une traversée épique de l'intérieur aux rivages",
            description: "Traversée de la Bretagne intérieure jusqu'aux rivages atlantiques. Galops sur les plages et bivouacs sous les étoiles bretonnes.",
            image: bretagnVillageChevaux,
            niveau: "Intermédiaire",
            duree: "6 jours",
            prixFrom: 1190,
            rating: 4.8,
            inclusions: ["Hébergement varié", "Pension complète", "Guide expert", "Transferts inclus"],
          },
        ],
      },
      {
        nom: "Vosges",
        sejours: [
          {
            id: "vosges",
            titre: "Chevauchée des Vosges",
            sousTitre: "Les crêtes et les forêts de sapins",
            description: "Parcourez les crêtes vosgiennes à travers forêts de sapins et chaumes d'altitude. Panoramas exceptionnels sur la plaine d'Alsace.",
            image: korrigansForetChevaux,
            niveau: "Intermédiaire",
            duree: "5 jours",
            prixFrom: 950,
            rating: 4.7,
            inclusions: ["Hébergement en ferme-auberge", "Pension complète", "Guide local", "Matériel fourni"],
          },
        ],
      },
    ],
  },
  {
    nom: "Maroc",
    regions: [
      {
        nom: "Sud Marocain",
        sejours: [
          {
            id: "portes-sahara",
            titre: "Les Portes du Sahara",
            sousTitre: "Chevauchée mythique aux portes du désert",
            description: "Dunes dorées, oasis verdoyantes et nuits sous les étoiles du Sahara. Une immersion totale dans le grand Sud marocain.",
            image: marocDunesCavaliers,
            niveau: "Confirmé",
            duree: "7 jours",
            prixFrom: 1780,
            rating: 5.0,
            inclusions: ["Bivouac & Riad", "Pension complète", "Guide berbère", "Dromadaires de soutien"],
          },
          {
            id: "desert-oasis",
            titre: "Entre Désert et Oasis",
            sousTitre: "Un voyage entre sable et verdure",
            description: "Des palmeraies luxuriantes aux ergs majestueux. L'essence du Maroc authentique entre contrastes et rencontres inoubliables.",
            image: marocDesertNuages,
            niveau: "Confirmé",
            duree: "7 jours",
            prixFrom: 1480,
            rating: 4.9,
            inclusions: ["Hébergement traditionnel", "Pension complète", "Guide francophone", "Chevaux barbes"],
          },
        ],
      },
      {
        nom: "Atlas & Côte",
        sejours: [
          {
            id: "atlas-atlantique",
            titre: "De l'Atlas à l'Atlantique",
            sousTitre: "Des sommets aux vagues d'Essaouira",
            description: "Des sommets enneigés de l'Atlas jusqu'aux vagues d'Essaouira. Une aventure complète à travers tous les paysages marocains.",
            image: marocCanyonCavaliers,
            niveau: "Confirmé",
            duree: "8 jours",
            prixFrom: 1480,
            rating: 4.8,
            inclusions: ["Hébergement varié", "Pension complète", "2 guides", "Galops sur plage"],
          },
        ],
      },
    ],
  },
  {
    nom: "Europe",
    regions: [
      {
        nom: "Écosse",
        sejours: [
          {
            id: "ecosse",
            titre: "Highlands à Cheval",
            sousTitre: "Châteaux mystérieux et lochs brumeux",
            description: "Galopez à travers les Highlands légendaires, entre châteaux mystérieux, lochs brumeux et landes à perte de vue.",
            image: marocEssaouiraBateau,
            niveau: "Confirmé",
            duree: "Sur demande",
            prixFrom: null,
            rating: 4.9,
            inclusions: ["B&B typiques", "Pension complète", "Guide écossais", "Whisky inclus"],
          },
        ],
      },
    ],
  },
  {
    nom: "Asie",
    regions: [
      {
        nom: "Mongolie",
        sejours: [
          {
            id: "mongolie",
            titre: "Steppes de Mongolie",
            sousTitre: "Vivez comme un nomade dans l'immensité",
            description: "Yourtes traditionnelles, troupeaux sauvages et hospitalité mongole. Une expérience unique au cœur de l'Asie centrale.",
            image: marocCavalierCote,
            niveau: "Confirmé",
            duree: "Sur demande",
            prixFrom: null,
            rating: 5.0,
            inclusions: ["Yourtes traditionnelles", "Pension nomade", "Guide mongol", "Chevaux locaux"],
          },
        ],
      },
      {
        nom: "Jordanie",
        sejours: [
          {
            id: "jordanie",
            titre: "Jordanie - Wadi Rum",
            sousTitre: "Chevauchée dans le désert de Lawrence",
            description: "Explorez les paysages lunaires du Wadi Rum, campez sous les étoiles et découvrez Pétra à cheval.",
            image: marocDesertNuages,
            niveau: "Confirmé",
            duree: "Sur demande",
            prixFrom: null,
            rating: 4.9,
            inclusions: ["Camps bédouins", "Pension complète", "Guide local", "Visite Pétra"],
          },
        ],
      },
    ],
  },
];

// Composant carte séjour
const SejourCard = ({ sejour, region }: { sejour: Sejour; region: string }) => {
  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Image section */}
        <div className="relative lg:w-2/5 aspect-[4/3] lg:aspect-auto overflow-hidden">
          <img
            src={sejour.image}
            alt={sejour.titre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Rating badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1.5 bg-foreground/80 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-lg">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-sm">{sejour.rating}</span>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col justify-between">
          <div>
            {/* Location label */}
            <p className="text-primary font-medium text-sm tracking-wide uppercase mb-2">
              {region}
            </p>

            {/* Title */}
            <h3 className="font-serif text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {sejour.titre}
            </h3>

            {/* Subtitle */}
            {sejour.sousTitre && (
              <p className="text-muted-foreground italic mb-4">{sejour.sousTitre}</p>
            )}

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-6">
              {sejour.description}
            </p>

            {/* Duration & Level badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground"
              >
                <Clock className="h-4 w-4" />
                {sejour.duree}
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground"
              >
                <Users className="h-4 w-4" />
                {sejour.niveau}
              </Badge>
            </div>

            {/* Inclusions grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6">
              {sejour.inclusions.map((inclusion, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground text-sm">
                    {inclusion}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price and CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <div>
              {sejour.prixFrom ? (
                <>
                  <p className="text-muted-foreground text-sm">À partir de</p>
                  <p className="text-primary text-3xl font-bold">
                    {sejour.prixFrom.toLocaleString("fr-FR")}€
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Sur demande</p>
              )}
            </div>
            <Link to={`/demande-devis?sejour=${encodeURIComponent(sejour.titre)}`}>
              <Button
                size="lg"
                className="group/btn bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                Réserver
                <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Destinations = () => {
  return (
    <Layout>
      <SEOHead {...seoConfigs.destinations} />
      
      {/* Hero - Bellevoire style */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marocCavalierCote})` }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm animate-fade-in">
            Nos destinations
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in drop-shadow-lg">
            Voyages Équestres
          </h1>
          <p className="text-primary-foreground/90 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in drop-shadow">
            De la Bretagne romantique aux dunes du Sahara, choisissez votre prochaine aventure à cheval.
          </p>
        </div>
      </section>

      {/* Info badges */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>France, Maroc, Europe, Asie</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Petits groupes</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <Compass className="h-4 w-4 text-primary" />
              <span>Tous niveaux</span>
            </Badge>
          </div>
        </div>
      </section>

      {/* Destinations par pays - Arborescence hiérarchique */}
      {destinations.map((pays) => (
        <section key={pays.nom} className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            {/* Titre du pays */}
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                {pays.nom}
              </h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
            </div>

            {/* Régions du pays */}
            {pays.regions.map((region) => (
              <div key={region.nom} className="mb-12 last:mb-0">
                {/* Titre de la région */}
                <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground/80 mb-6 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  {region.nom}
                </h3>

                {/* Séjours de la région */}
                <div className="space-y-8">
                  {region.sejours.map((sejour) => (
                    <SejourCard 
                      key={sejour.id} 
                      sejour={sejour} 
                      region={`${region.nom}, ${pays.nom}`} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Section calendrier */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Calendrier des Randonnées 2026
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Consultez toutes les dates disponibles et réservez votre prochaine aventure.
          </p>
          <Link to="/planning">
            <Button size="lg" className="group">
              Voir le calendrier complet
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Légende & Informations */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Petits groupes</h3>
              <p className="text-muted-foreground text-sm">
                Maximum 8 cavaliers pour une expérience privilégiée
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Paiement flexible</h3>
              <p className="text-muted-foreground text-sm">
                Acompte de 20%, paiement en plusieurs fois possible
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Tout compris</h3>
              <p className="text-muted-foreground text-sm">
                Hébergement, repas et encadrement inclus
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Sur mesure - Style épuré */}
      <section className="py-24 bg-[#F5F0EB]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Un séjour sur mesure ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour créer ensemble votre aventure équestre personnalisée.
          </p>
          <Link to="/demande-devis">
            <Button 
              size="lg" 
              variant="outline" 
              className="group border-foreground/30 hover:bg-foreground hover:text-background"
            >
              Demander un devis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;
