import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import real images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

const voyages = [
  {
    id: "bretagne-printemps-2024",
    title: "Bretagne au printemps",
    date: "Avril 2024",
    location: "Côte d'Émeraude",
    excerpt: "Une semaine magique entre les ajoncs en fleur et les plages désertes de la côte bretonne.",
    image: cavaliersPlageCoucherSoleil,
    featured: true,
  },
  {
    id: "maroc-desert-2024",
    title: "L'appel du désert",
    date: "Février 2024",
    location: "Sahara, Maroc",
    excerpt: "Galops enivrants dans les dunes dorées et nuits étoilées sous les tentes berbères.",
    image: marocDunesCavaliers,
    featured: true,
  },
  {
    id: "foret-broceliande",
    title: "Les mystères de Brocéliande",
    date: "Octobre 2023",
    location: "Forêt de Paimpont",
    excerpt: "Sur les traces de Merlin et des chevaliers de la Table Ronde.",
    image: bretagnVillageChevaux,
    featured: false,
  },
  {
    id: "automne-breton",
    title: "Randonnée au canyon marocain",
    date: "Novembre 2023",
    location: "Atlas, Maroc",
    excerpt: "Exploration des canyons spectaculaires de l'Atlas marocain à cheval.",
    image: marocCanyonCavaliers,
    featured: false,
  },
  {
    id: "essaouira",
    title: "Escale à Essaouira",
    date: "Décembre 2023",
    location: "Essaouira, Maroc",
    excerpt: "Découverte du port de pêche traditionnel et de la médina d'Essaouira.",
    image: marocEssaouiraBateau,
    featured: false,
  },
  {
    id: "plages-emeraude",
    title: "Galops sur la Côte d'Émeraude",
    date: "Été 2023",
    location: "Saint-Malo - Cancale",
    excerpt: "Des galops inoubliables sur les plus belles plages de Bretagne.",
    image: cavaliersPlageCoucherSoleil,
    featured: false,
  },
];

const CarnetVoyage = () => {
  const featuredVoyages = voyages.filter(v => v.featured);
  const otherVoyages = voyages.filter(v => !v.featured);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marocDesertNuages})` }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm">
            Nos Aventures
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            Carnet de Voyage
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto">
            Revivez nos plus belles aventures équestres à travers la Bretagne et au Maroc.
          </p>
        </div>
      </section>

      {/* Featured Stories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <span className="text-primary font-medium tracking-wide uppercase text-sm">
              À la une
            </span>
            <h2 className="font-serif text-4xl font-bold text-foreground mt-2">
              Récits récents
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuredVoyages.map((voyage) => (
              <article 
                key={voyage.id}
                className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer"
              >
                <img 
                  src={voyage.image} 
                  alt={voyage.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="flex items-center gap-4 text-primary-foreground/80 text-sm mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {voyage.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {voyage.location}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-primary-foreground mb-3 group-hover:text-primary transition-colors">
                    {voyage.title}
                  </h3>
                  <p className="text-primary-foreground/90 mb-4">
                    {voyage.excerpt}
                  </p>
                  <div className="flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                    Lire la suite
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-medium tracking-wide uppercase text-sm">
              Archives
            </span>
            <h2 className="font-serif text-4xl font-bold text-foreground mt-4">
              Tous nos souvenirs
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {otherVoyages.map((voyage) => (
              <article 
                key={voyage.id}
                className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={voyage.image} 
                    alt={voyage.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    {voyage.date}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {voyage.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {voyage.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Créez votre propre aventure
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Rejoignez-nous pour vivre des moments inoubliables à cheval.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/destinations">
              <Button size="lg" className="group">
                Voir nos destinations
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

export default CarnetVoyage;
