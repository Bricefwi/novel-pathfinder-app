import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const destinations = [
  {
    id: "bretagne-romantique",
    title: "Bretagne Romantique",
    description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours.",
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
    location: "Bretagne, France",
    duration: "3-5 jours",
    level: "Tous niveaux",
    price: "À partir de 450€",
    rating: 4.9,
  },
  {
    id: "chevalier-duguesclin",
    title: "Sur les traces du Chevalier Duguesclin",
    description: "Suivez les traces du célèbre chevalier breton à travers châteaux et légendes.",
    image: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&q=80",
    location: "Bretagne, France",
    duration: "4-6 jours",
    level: "Intermédiaire",
    price: "À partir de 580€",
    rating: 4.8,
  },
  {
    id: "korrigans",
    title: "La Légende des Korrigans",
    description: "Plongez dans l'univers mystique des korrigans bretons à cheval.",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
    location: "Bretagne, France",
    duration: "2-3 jours",
    level: "Débutant",
    price: "À partir de 320€",
    rating: 4.9,
  },
  {
    id: "maroc-desert",
    title: "Séjour au Maroc",
    description: "Galopez dans les dunes du Sahara et découvrez la magie du désert marocain.",
    image: "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=800&q=80",
    location: "Maroc",
    duration: "7 jours",
    level: "Confirmé",
    price: "À partir de 1200€",
    rating: 5.0,
  },
];

const Destinations = () => {
  return (
    <Layout>
      {/* Hero - Bellevoire style */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm animate-fade-in">
            Nos destinations
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-in">
            Randonnées équestres d'exception
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto animate-fade-in">
            De la Bretagne romantique aux dunes du Maroc, découvrez nos itinéraires uniques.
          </p>
        </div>
      </section>

      {/* Destinations Grid - Premium cards */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {destinations.map((dest) => (
              <article 
                key={dest.id} 
                className="group bg-card rounded-3xl overflow-hidden border border-border/50 hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img 
                    src={dest.image} 
                    alt={dest.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-semibold text-foreground text-sm">{dest.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <h3 className="font-serif text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {dest.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{dest.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground bg-muted px-3 py-1.5 rounded-full">
                      <MapPin className="h-4 w-4 text-primary" />
                      {dest.location}
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground bg-muted px-3 py-1.5 rounded-full">
                      <Clock className="h-4 w-4 text-primary" />
                      {dest.duration}
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground bg-muted px-3 py-1.5 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                      {dest.level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-xl font-bold text-primary">{dest.price}</span>
                    <Link to="/contact">
                      <Button className="group/btn">
                        Réserver 
                        <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Vous ne trouvez pas votre bonheur ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour organiser une randonnée sur mesure adaptée à vos envies.
          </p>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="group">
              Demander un devis personnalisé
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;
