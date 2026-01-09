import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";

const sejours = [
  {
    id: "bretagne-romantique",
    title: "Bretagne Romantique",
    subtitle: "Une escapade entre châteaux et forêts enchantées",
    description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours. Entre landes sauvages et patrimoine historique.",
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
    location: "Bretagne, France",
    duration: "3-5 jours",
    level: "Tous niveaux",
    price: 450,
    rating: 4.9,
    inclusions: ["Hébergement en gîte", "Pension complète", "Guide accompagnateur", "Matériel équestre"],
  },
  {
    id: "chevalier-duguesclin",
    title: "Sur les traces du Chevalier Duguesclin",
    subtitle: "Une aventure historique à cheval",
    description: "Suivez les traces du célèbre chevalier breton à travers châteaux et légendes. Un voyage dans le temps au cœur de la Bretagne médiévale.",
    image: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&q=80",
    location: "Bretagne, France",
    duration: "4-6 jours",
    level: "Intermédiaire",
    price: 580,
    rating: 4.8,
    inclusions: ["Hébergement château", "Demi-pension", "Guide historien", "Visites culturelles"],
  },
  {
    id: "korrigans",
    title: "La Légende des Korrigans",
    subtitle: "Plongez dans l'univers mystique breton",
    description: "Plongez dans l'univers mystique des korrigans bretons à cheval. Forêts enchantées, mégalithes et contes traditionnels.",
    image: korrigansForetChevaux,
    location: "Forêt de Brocéliande",
    duration: "2-3 jours",
    level: "Débutant",
    price: 320,
    rating: 4.9,
    inclusions: ["Hébergement forêt", "Pension complète", "Contes et légendes", "Balade nocturne"],
  },
  {
    id: "maroc-desert",
    title: "Aventure au Maroc",
    subtitle: "Galopez dans les dunes du Sahara",
    description: "Galopez dans les dunes du Sahara et découvrez la magie du désert marocain. Nuits sous les étoiles et hospitalité berbère.",
    image: "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=800&q=80",
    location: "Désert du Sahara, Maroc",
    duration: "7 jours",
    level: "Confirmé",
    price: 1200,
    rating: 5.0,
    inclusions: ["Vol inclus", "Bivouac désert", "Pension complète", "Guide local"],
  },
];

const Sejours = () => {
  return (
    <Layout>
      <SEOHead {...seoConfigs.sejours} />
      {/* Hero Section - Bellevoire style */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm animate-fade-in">
            Nos Séjours
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-in">
            Voyages Équestres
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto animate-fade-in">
            Des expériences uniques alliant passion du cheval et découverte de paysages exceptionnels.
          </p>
        </div>
      </section>

      {/* Séjours Grid - Premium cards */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="space-y-16">
            {sejours.map((sejour, index) => (
              <article 
                key={sejour.id} 
                className={`grid md:grid-cols-2 gap-8 lg:gap-16 items-center ${
                  index % 2 === 1 ? 'md:grid-flow-col-dense' : ''
                }`}
              >
                {/* Image */}
                <div className={`relative overflow-hidden rounded-3xl ${index % 2 === 1 ? 'md:col-start-2' : ''}`}>
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={sejour.image} 
                      alt={sejour.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute top-6 left-6 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-semibold text-foreground">{sejour.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:col-start-1' : ''}`}>
                  <div>
                    <span className="text-primary font-medium tracking-wide uppercase text-sm">
                      {sejour.location}
                    </span>
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mt-2">
                      {sejour.title}
                    </h2>
                    <p className="text-muted-foreground italic mt-2">{sejour.subtitle}</p>
                  </div>
                  
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {sejour.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2 text-foreground bg-muted px-4 py-2 rounded-full">
                      <Clock className="h-4 w-4 text-primary" />
                      {sejour.duration}
                    </span>
                    <span className="flex items-center gap-2 text-foreground bg-muted px-4 py-2 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                      {sejour.level}
                    </span>
                  </div>

                  <ul className="grid grid-cols-2 gap-2">
                    {sejour.inclusions.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <span className="text-sm text-muted-foreground">À partir de</span>
                      <p className="text-3xl font-bold text-primary">{sejour.price}€</p>
                    </div>
                    <Link to="/contact">
                      <Button size="lg" className="group">
                        Réserver
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Un séjour sur mesure ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour créer ensemble votre aventure équestre personnalisée.
          </p>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="group">
              Demander un devis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Sejours;
