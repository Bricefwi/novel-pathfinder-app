import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const voyages = [
  {
    id: "bretagne-printemps-2024",
    title: "Bretagne au printemps",
    date: "Avril 2024",
    location: "Côte d'Émeraude",
    excerpt: "Une semaine magique entre les ajoncs en fleur et les plages désertes de la côte bretonne.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    featured: true,
  },
  {
    id: "maroc-desert-2024",
    title: "L'appel du désert",
    date: "Février 2024",
    location: "Sahara, Maroc",
    excerpt: "Galops enivrants dans les dunes dorées et nuits étoilées sous les tentes berbères.",
    image: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80",
    featured: true,
  },
  {
    id: "foret-broceliande",
    title: "Les mystères de Brocéliande",
    date: "Octobre 2023",
    location: "Forêt de Paimpont",
    excerpt: "Sur les traces de Merlin et des chevaliers de la Table Ronde.",
    image: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=800&q=80",
    featured: false,
  },
  {
    id: "automne-breton",
    title: "Couleurs d'automne",
    date: "Novembre 2023",
    location: "Monts d'Arrée",
    excerpt: "Randonnée au cœur des landes bretonnes parées de leurs plus belles couleurs.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    featured: false,
  },
  {
    id: "noel-ferme",
    title: "Noël à la ferme",
    date: "Décembre 2023",
    location: "Ferme An Arwen",
    excerpt: "Moments de partage et de fête avec nos pensionnaires à quatre pattes.",
    image: "https://images.unsplash.com/photo-1482164565953-04b62dcac1cd?w=800&q=80",
    featured: false,
  },
  {
    id: "plages-emeraude",
    title: "Galops sur la Côte d'Émeraude",
    date: "Été 2023",
    location: "Saint-Malo - Cancale",
    excerpt: "Des galops inoubliables sur les plus belles plages de Bretagne.",
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
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
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=1920&q=80')" }}
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
            Revivez nos plus belles aventures équestres à travers la Bretagne et au-delà.
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
