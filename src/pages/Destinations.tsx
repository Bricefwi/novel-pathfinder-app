import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const destinations = [
  {
    id: "bretagne-romantique",
    title: "Bretagne Romantique",
    description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours.",
    image: "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-25-scaled.jpg",
    location: "Bretagne, France",
    duration: "3-5 jours",
    level: "Tous niveaux",
    price: "À partir de 450€",
  },
  {
    id: "chevalier-duguesclin",
    title: "Sur les traces du Chevalier Duguesclin",
    description: "Suivez les traces du célèbre chevalier breton à travers châteaux et légendes.",
    image: "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-6-scaled.jpg",
    location: "Bretagne, France",
    duration: "4-6 jours",
    level: "Intermédiaire",
    price: "À partir de 580€",
  },
  {
    id: "korrigans",
    title: "La Légende des Korrigans",
    description: "Plongez dans l'univers mystique des korrigans bretons à cheval.",
    image: "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-3-scaled.jpg",
    location: "Bretagne, France",
    duration: "2-3 jours",
    level: "Débutant",
    price: "À partir de 320€",
  },
  {
    id: "maroc-desert",
    title: "Séjour au Maroc",
    description: "Galopez dans les dunes du Sahara et découvrez la magie du désert marocain.",
    image: "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-23-scaled.jpg",
    location: "Maroc",
    duration: "7 jours",
    level: "Confirmé",
    price: "À partir de 1200€",
  },
];

const Destinations = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary font-medium mb-4">Nos destinations</span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
            Randonnées équestres d'exception
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            De la Bretagne romantique aux dunes du Maroc, découvrez nos itinéraires uniques.
          </p>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {destinations.map((dest) => (
              <div key={dest.id} className="group bg-card rounded-3xl overflow-hidden border border-border/50 hover:shadow-xl transition-all">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={dest.image} alt={dest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="font-serif text-2xl font-bold text-foreground">{dest.title}</h3>
                  <p className="text-muted-foreground">{dest.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-primary" />{dest.location}</span>
                    <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-primary" />{dest.duration}</span>
                    <span className="flex items-center"><Users className="h-4 w-4 mr-1 text-primary" />{dest.level}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-lg font-semibold text-primary">{dest.price}</span>
                    <Link to="/contact">
                      <Button>Réserver <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;
