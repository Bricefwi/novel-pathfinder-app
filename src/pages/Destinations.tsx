import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Calendar, Users, Euro, Mountain, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    description: "Entre landes et océan, découvrez la magie de la Bretagne à cheval. Plages sauvages, forêts enchantées et légendes de Brocéliande.",
    image: cavaliersPlageCoucherSoleil,
    niveau: "Tous niveaux",
    duree: "2 à 6 jours",
    prixFrom: 480,
    slug: "bretagne-romantique",
  },
  {
    id: "france-bretagne-terre-mer",
    pays: "France",
    region: "Bretagne",
    titre: "De la Terre à la Mer",
    description: "Une traversée épique de la Bretagne intérieure jusqu'aux rivages atlantiques. Galops sur les plages et bivouacs sous les étoiles.",
    image: bretagnVillageChevaux,
    niveau: "Intermédiaire",
    duree: "6 jours",
    prixFrom: 1190,
    slug: "terre-mer",
  },
  {
    id: "france-vosges",
    pays: "France",
    region: "Vosges",
    titre: "Chevauchée des Vosges",
    description: "Parcourez les crêtes vosgiennes à travers forêts de sapins et chaumes d'altitude. Panoramas exceptionnels garantis.",
    image: korrigansForetChevaux,
    niveau: "Intermédiaire",
    duree: "5 jours",
    prixFrom: 950,
    slug: "vosges",
  },
  {
    id: "maroc-sahara",
    pays: "Maroc",
    region: "Sud Marocain",
    titre: "Les Portes du Sahara",
    description: "Chevauchée mythique aux portes du désert. Dunes dorées, oasis verdoyantes et nuits sous les étoiles du Sahara.",
    image: marocDunesCavaliers,
    niveau: "Confirmé",
    duree: "7 jours",
    prixFrom: 1780,
    slug: "portes-sahara",
  },
  {
    id: "maroc-desert-oasis",
    pays: "Maroc",
    region: "Sud Marocain",
    titre: "Entre Désert et Oasis",
    description: "Un voyage entre sable et verdure, des palmeraies luxuriantes aux ergs majestueux. L'essence du Maroc authentique.",
    image: marocDesertNuages,
    niveau: "Confirmé",
    duree: "7 jours",
    prixFrom: 1480,
    slug: "desert-oasis",
  },
  {
    id: "maroc-atlas-atlantique",
    pays: "Maroc",
    region: "Atlas & Côte",
    titre: "De l'Atlas à l'Atlantique",
    description: "Des sommets enneigés de l'Atlas jusqu'aux vagues d'Essaouira. Une aventure complète à travers les paysages marocains.",
    image: marocCanyonCavaliers,
    niveau: "Confirmé",
    duree: "7 jours",
    prixFrom: 1480,
    slug: "atlas-atlantique",
  },
  {
    id: "europe-ecosse",
    pays: "Europe",
    region: "Écosse",
    titre: "Highlands à Cheval",
    description: "Galopez à travers les Highlands légendaires, châteaux mystérieux et lochs brumeux. L'aventure écossaise ultime.",
    image: korrigansForetChevaux,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    slug: "ecosse",
  },
  {
    id: "asie-mongolie",
    pays: "Asie",
    region: "Mongolie",
    titre: "Steppes de Mongolie",
    description: "Vivez comme un nomade dans l'immensité des steppes. Yourtes traditionnelles, troupeaux sauvages et hospitalité mongole.",
    image: marocCavalierCote,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    slug: "mongolie",
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

      {/* Destinations par pays */}
      {Object.entries(groupedCards).map(([pays, cards]) => (
        <section key={pays} className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mountain className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                {pays}
              </h2>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cards.map((card) => (
                <Card 
                  key={card.id}
                  className="group overflow-hidden border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={card.image} 
                      alt={card.titre}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {card.region}
                      </Badge>
                      <h3 className="font-serif text-lg font-bold text-primary-foreground drop-shadow-lg">
                        {card.titre}
                      </h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {card.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {card.niveau}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {card.duree}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {card.prixFrom ? (
                          <p className="text-foreground font-bold">
                            À partir de <span className="text-primary">{card.prixFrom.toLocaleString("fr-FR")} €</span>
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm">Sur demande</p>
                        )}
                      </div>
                      <Link to={`/destinations/${card.slug}`}>
                        <Button size="sm" variant="ghost" className="group/btn">
                          Découvrir
                          <ArrowRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

      {/* CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Prêt pour l'aventure ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Demandez un devis personnalisé ou réservez directement en ligne.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/demande-devis">
              <Button size="lg" className="group">
                Réserver maintenant
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;