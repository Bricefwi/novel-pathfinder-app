import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Wifi, Car, Coffee, TreePine, Users, Bed, ArrowRight, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const amenities = [
  { icon: Wifi, label: "WiFi gratuit" },
  { icon: Car, label: "Parking privé" },
  { icon: Coffee, label: "Petit-déjeuner inclus" },
  { icon: TreePine, label: "Jardin et terrasse" },
  { icon: Users, label: "Accueil familial" },
  { icon: Bed, label: "Literie de qualité" },
];

const rooms = [
  {
    name: "Chambre Morgane",
    description: "Chambre double avec vue sur les paddocks. Décoration authentique bretonne avec touches modernes.",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80",
    capacity: "2 personnes",
    price: 85,
    features: ["Lit double", "Salle de bain privée", "Vue paddocks"],
  },
  {
    name: "Chambre Merlin",
    description: "Suite familiale spacieuse avec coin salon. Idéale pour les familles avec enfants.",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
    capacity: "4 personnes",
    price: 120,
    features: ["Lit double + lits superposés", "Coin salon", "Salle de bain XL"],
  },
  {
    name: "Chambre Viviane",
    description: "Chambre romantique sous les toits avec poutres apparentes et ambiance cosy.",
    image: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80",
    capacity: "2 personnes",
    price: 95,
    features: ["Lit king-size", "Baignoire", "Vue forêt"],
  },
];

const Hebergement = () => {
  return (
    <Layout>
      {/* Hero - Bellevoire style with parallax */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/60" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm">
            Notre Gîte
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            Un havre de paix
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto">
            Séjournez au cœur de la ferme équestre dans notre gîte chaleureux et authentique.
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="text-primary font-medium tracking-wide uppercase text-sm">
                Bienvenue chez nous
              </span>
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-foreground">
                Le charme de la Bretagne
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Notre gîte de charme vous accueille dans un cadre authentique au cœur de la campagne bretonne. 
                Entièrement rénové avec des matériaux nobles, il offre tout le confort moderne 
                tout en préservant le cachet des fermes traditionnelles.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                À quelques pas des écuries, vous pourrez profiter du calme de la nature, 
                observer les chevaux au pré et vous ressourcer loin de l'agitation urbaine.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-muted-foreground">Noté 4.9/5 par nos visiteurs</span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80" 
                  alt="Gîte An Arwen" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-card p-6 rounded-2xl shadow-xl border border-border">
                <p className="text-4xl font-bold text-primary">15+</p>
                <p className="text-muted-foreground">années d'accueil</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {amenities.map((amenity, index) => (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-6 bg-background rounded-2xl border border-border hover:border-primary/30 transition-colors"
              >
                <amenity.icon className="h-8 w-8 text-primary mb-3" />
                <span className="text-foreground font-medium">{amenity.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-medium tracking-wide uppercase text-sm">
              Nos Chambres
            </span>
            <h2 className="font-serif text-4xl font-bold text-foreground mt-4">
              Confort et authenticité
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {rooms.map((room, index) => (
              <article 
                key={index}
                className="group bg-card rounded-3xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={room.image} 
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-foreground">{room.name}</h3>
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {room.capacity}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{room.description}</p>
                  <ul className="space-y-2">
                    {room.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <span className="text-2xl font-bold text-primary">{room.price}€</span>
                      <span className="text-muted-foreground text-sm">/nuit</span>
                    </div>
                    <Link to="/contact">
                      <Button size="sm">Réserver</Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80",
              "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
              "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80",
              "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&q=80",
            ].map((src, index) => (
              <div key={index} className="aspect-square rounded-2xl overflow-hidden group">
                <img 
                  src={src} 
                  alt={`Gîte photo ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Réservez votre séjour
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour vérifier les disponibilités et réserver votre chambre.
          </p>
          <Link to="/contact">
            <Button size="lg" className="group">
              Demander une réservation
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Hebergement;
