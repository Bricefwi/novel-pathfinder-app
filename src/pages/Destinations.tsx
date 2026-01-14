import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Calendar, Users, Euro, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { DestinationCard } from "@/components/destinations/DestinationCard";

// Import real images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCavalierCote from "@/assets/maroc-cavalier-cote.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

// Données des destinations principales (cartes de présentation)
const destinationCards = [
  {
    id: "france-bretagne",
    pays: "France",
    region: "Bretagne",
    titre: "Bretagne Romantique",
    sousTitre: "Une escapade entre châteaux et forêts enchantées",
    description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours. Entre landes sauvages et patrimoine historique.",
    image: cavaliersPlageCoucherSoleil,
    niveau: "Tous niveaux",
    duree: "3-5 jours",
    prixFrom: 450,
    slug: "bretagne-romantique",
    rating: 4.9,
    inclusions: ["Hébergement en gîte", "Pension complète", "Guide accompagnateur", "Matériel équestre"],
  },
  {
    id: "france-terre-mer",
    pays: "France",
    region: "Bretagne",
    titre: "De la Terre à la Mer",
    sousTitre: "Une traversée épique de l'intérieur aux rivages",
    description: "Traversée de la Bretagne intérieure jusqu'aux rivages atlantiques. Galops sur les plages et bivouacs sous les étoiles bretonnes.",
    image: bretagnVillageChevaux,
    niveau: "Intermédiaire",
    duree: "6 jours",
    prixFrom: 1190,
    slug: "terre-mer",
    rating: 4.8,
    inclusions: ["Hébergement varié", "Pension complète", "Guide expert", "Transferts inclus"],
  },
  {
    id: "france-vosges",
    pays: "France",
    region: "Vosges",
    titre: "Chevauchée des Vosges",
    sousTitre: "Les crêtes et les forêts de sapins",
    description: "Parcourez les crêtes vosgiennes à travers forêts de sapins et chaumes d'altitude. Panoramas exceptionnels sur la plaine d'Alsace.",
    image: korrigansForetChevaux,
    niveau: "Intermédiaire",
    duree: "5 jours",
    prixFrom: 950,
    slug: "vosges",
    rating: 4.7,
    inclusions: ["Hébergement en ferme-auberge", "Pension complète", "Guide local", "Matériel fourni"],
  },
  {
    id: "maroc-sahara",
    pays: "Maroc",
    region: "Sud Marocain",
    titre: "Les Portes du Sahara",
    sousTitre: "Chevauchée mythique aux portes du désert",
    description: "Dunes dorées, oasis verdoyantes et nuits sous les étoiles du Sahara. Une immersion totale dans le grand Sud marocain.",
    image: marocDunesCavaliers,
    niveau: "Confirmé",
    duree: "7 jours",
    prixFrom: 1780,
    slug: "portes-sahara",
    rating: 5.0,
    inclusions: ["Bivouac & Riad", "Pension complète", "Guide berbère", "Dromadaires de soutien"],
  },
  {
    id: "maroc-desert-oasis",
    pays: "Maroc",
    region: "Sud Marocain",
    titre: "Entre Désert et Oasis",
    sousTitre: "Un voyage entre sable et verdure",
    description: "Des palmeraies luxuriantes aux ergs majestueux. L'essence du Maroc authentique entre contrastes et rencontres inoubliables.",
    image: marocDesertNuages,
    niveau: "Confirmé",
    duree: "7 jours",
    prixFrom: 1480,
    slug: "desert-oasis",
    rating: 4.9,
    inclusions: ["Hébergement traditionnel", "Pension complète", "Guide francophone", "Chevaux barbes"],
  },
  {
    id: "maroc-atlas-atlantique",
    pays: "Maroc",
    region: "Atlas & Côte",
    titre: "De l'Atlas à l'Atlantique",
    sousTitre: "Des sommets aux vagues d'Essaouira",
    description: "Des sommets enneigés de l'Atlas jusqu'aux vagues d'Essaouira. Une aventure complète à travers tous les paysages marocains.",
    image: marocCanyonCavaliers,
    niveau: "Confirmé",
    duree: "8 jours",
    prixFrom: 1650,
    slug: "atlas-atlantique",
    rating: 4.8,
    inclusions: ["Hébergement varié", "Pension complète", "2 guides", "Galops sur plage"],
  },
  {
    id: "europe-ecosse",
    pays: "Europe",
    region: "Écosse",
    titre: "Highlands à Cheval",
    sousTitre: "Châteaux mystérieux et lochs brumeux",
    description: "Galopez à travers les Highlands légendaires, entre châteaux mystérieux, lochs brumeux et landes à perte de vue.",
    image: marocEssaouiraBateau,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    slug: "ecosse",
    rating: 4.9,
    inclusions: ["B&B typiques", "Pension complète", "Guide écossais", "Whisky inclus"],
  },
  {
    id: "asie-mongolie",
    pays: "Asie",
    region: "Mongolie",
    titre: "Steppes de Mongolie",
    sousTitre: "Vivez comme un nomade dans l'immensité",
    description: "Yourtes traditionnelles, troupeaux sauvages et hospitalité mongole. Une expérience unique au cœur de l'Asie centrale.",
    image: marocCavalierCote,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    slug: "mongolie",
    rating: 5.0,
    inclusions: ["Yourtes traditionnelles", "Pension nomade", "Guide mongol", "Chevaux locaux"],
  },
];

// Grouper par pays pour l'affichage
const groupedCards = destinationCards.reduce((acc, card) => {
  if (!acc[card.pays]) {
    acc[card.pays] = [];
  }
  acc[card.pays].push(card);
  return acc;
}, {} as Record<string, typeof destinationCards>);

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

      {/* Destinations - Cartes horizontales premium */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="space-y-8">
            {destinationCards.map((card) => (
              <DestinationCard
                key={card.id}
                {...card}
              />
            ))}
          </div>
        </div>
      </section>

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