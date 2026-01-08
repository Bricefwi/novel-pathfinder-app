import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Wifi, Car, Coffee, TreePine, Users, Bed, ArrowRight, Star, Check, Home, Leaf, Heart, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import real yourte images
import yourteCollage from "@/assets/yourte-collage.png";
import yourteCollage2 from "@/assets/yourte-collage-2.png";
import yourteInterieurLits from "@/assets/yourte-interieur-lits.webp";
import yourteInterieurChambre from "@/assets/yourte-interieur-chambre.webp";
import yourtePorte from "@/assets/yourte-porte.webp";
import yourteExterieurCoucher from "@/assets/yourte-exterieur-coucher.webp";
import yourteJardinHamac from "@/assets/yourte-jardin-hamac.webp";

const amenities = [
  { icon: Wifi, label: "WiFi gratuit" },
  { icon: Car, label: "Parking privé" },
  { icon: Coffee, label: "Petit-déjeuner inclus" },
  { icon: TreePine, label: "Jardin et terrasse" },
  { icon: Users, label: "Accueil familial" },
  { icon: Bed, label: "Literie de qualité" },
];

const features = [
  { icon: Home, label: "Yourte traditionnelle mongole", description: "Authentique et chaleureuse" },
  { icon: Leaf, label: "Cadre naturel préservé", description: "Au cœur de la campagne bretonne" },
  { icon: Heart, label: "Expérience unique", description: "Déconnexion totale garantie" },
];

const Hebergement = () => {
  return (
    <Layout>
      {/* Hero - Reduced size with lighter overlay */}
      <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${yourteCollage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/25 to-foreground/40" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm">
            Hébergement Insolite
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            La Yourte An Arwen
          </h1>
          <p className="text-primary-foreground/90 text-xl max-w-2xl mx-auto mb-8">
            Vivez une expérience unique au cœur de la Bretagne dans notre yourte traditionnelle mongole.
          </p>
          <Link to="/contact">
            <Button size="lg" className="group">
              Réserver votre séjour
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Introduction with main interior photo */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="text-primary font-medium tracking-wide uppercase text-sm">
                Un lieu d'exception
              </span>
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-foreground">
                Le charme de la Mongolie en Bretagne
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Notre yourte traditionnelle vous transporte dans un univers unique, mêlant l'authenticité 
                des traditions nomades mongoles au confort moderne. Décorée avec soin, elle offre un espace 
                chaleureux et dépaysant pour votre séjour.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Implantée au cœur de notre propriété, à quelques pas des chevaux, la yourte vous permet 
                de vous reconnecter à la nature tout en profitant d'un hébergement confortable et original.
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
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={yourteInterieurChambre} 
                  alt="Intérieur de la yourte An Arwen - espace de vie" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-card p-6 rounded-2xl shadow-xl border border-border">
                <p className="text-4xl font-bold text-primary">80€</p>
                <p className="text-muted-foreground">par nuit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-8 bg-background rounded-2xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">{feature.label}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-medium tracking-wide uppercase text-sm">
              Galerie Photos
            </span>
            <h2 className="font-serif text-4xl font-bold text-foreground mt-4">
              Découvrez notre yourte
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden group">
              <img 
                src={yourteInterieurLits} 
                alt="Yourte - espace couchage"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden group">
              <img 
                src={yourteExterieurCoucher} 
                alt="Extérieur yourte au coucher du soleil"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden group">
              <img 
                src={yourtePorte} 
                alt="Porte de la yourte"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden group">
              <img 
                src={yourteJardinHamac} 
                alt="Jardin avec hamac"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Magazine Editorial Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <article className="max-w-4xl mx-auto">
            {/* Article Header */}
            <header className="text-center mb-16">
              <span className="text-primary font-medium tracking-widest uppercase text-sm">
                Récit de voyage
              </span>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mt-4 leading-tight">
                L'Esprit des Steppes en Terre Bretonne
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground mt-6 italic">
                Une Nuit Magique à An Arwen
              </p>
            </header>

            {/* Lead Paragraph */}
            <div className="mb-12">
              <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium text-center max-w-3xl mx-auto">
                À la croisée d'une histoire millénaire et de la douceur de vivre bretonne, la yourte s'impose comme l'ultime refuge pour ceux qui cherchent à reconnecter leur âme avec la nature. Entre bois sculpté, tissus chatoyants et ciel étoilé, découvrez à la Ferme Équestre An Arwen un habitat qui ne ressemble à aucun autre.
              </p>
            </div>

            {/* Section 1 */}
            <div className="mb-16">
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                <span className="w-12 h-[2px] bg-primary"></span>
                Une architecture du ciel et de la terre
              </h3>
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  Le premier contact est visuel, presque magnétique. La yourte n'est pas une simple tente ; c'est un <strong className="text-foreground">microcosme</strong>. Sa forme circulaire, héritée des nomades d'Asie Centrale, offre une prise infinie à la sérénité.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  En pénétrant à l'intérieur, l'œil est immédiatement attiré par le <strong className="text-foreground">Toono</strong>, cette ouverture circulaire au sommet du dôme. Véritable œil tourné vers le cosmos, il baigne l'espace d'une lumière zénithale le jour et devient une fenêtre privée sur la Voie Lactée une fois la nuit tombée.
                </p>
              </div>
            </div>

            {/* Section 2 with image */}
            <div className="mb-16">
              <div className="grid lg:grid-cols-5 gap-8 items-center">
                <div className="lg:col-span-3">
                  <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-12 h-[2px] bg-primary"></span>
                    Le luxe de la lenteur et de l'authentique
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    Oubliez les standards aseptisés. Ici, vos sens sont en éveil : l'odeur du bois naturel se mêle à la douceur des meubles traditionnels peints de motifs solaires.
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Que ce soit au coucher du soleil, quand la lumière embrase les collines de La Chapelle du Lou du Lac, ou au petit matin, au rythme des chevaux, la yourte offre une isolation sensorielle unique. C'est un habitat qui respire et qui vous enveloppe dans une douceur protectrice.
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                    <img 
                      src={yourteInterieurChambre} 
                      alt="Intérieur chaleureux de la yourte"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quote */}
            <blockquote className="my-16 py-8 px-6 md:px-12 border-l-4 border-primary bg-background/50 rounded-r-2xl">
              <p className="font-serif text-xl md:text-2xl text-foreground italic leading-relaxed">
                "Dormir dans une yourte, c'est accepter de perdre ses angles droits pour retrouver son équilibre intérieur."
              </p>
            </blockquote>

            {/* CTA Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 md:p-12 text-center">
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
                Prêt pour votre épopée nomade ?
              </h3>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Ne vous contentez pas de dormir ailleurs, habitez un rêve. Que vous soyez en quête d'une retraite romantique ou d'une aventure familiale hors des sentiers battus, la Ferme Équestre An Arwen vous attend pour une parenthèse hors du temps.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-8 mb-8 text-sm md:text-base">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>5 Le Bignon, 35360 La Chapelle du Lou du Lac</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>02 99 06 68 68</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>contact@ferme-equestre-an-arwen.com</span>
                </div>
              </div>

              <p className="text-primary font-medium italic">
                Le dépaysement n'a jamais été aussi proche.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Équipements & Services
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {amenities.map((amenity, index) => (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-6 bg-muted/30 rounded-2xl border border-border hover:border-primary/30 transition-colors"
              >
                <amenity.icon className="h-8 w-8 text-primary mb-3" />
                <span className="text-foreground font-medium">{amenity.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="aspect-[3/2] rounded-2xl overflow-hidden shadow-xl max-w-md mx-auto lg:max-w-none">
                <img 
                  src={yourteCollage2} 
                  alt="Collage photos de la Yourte An Arwen" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <span className="text-primary font-medium tracking-wide uppercase text-sm">
                Informations Pratiques
              </span>
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-foreground">
                Votre séjour
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Capacité : 4 personnes</p>
                    <p className="text-muted-foreground text-sm">1 lit double + 2 lits simples</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Arrivée : 16h00 / Départ : 11h00</p>
                    <p className="text-muted-foreground text-sm">Horaires flexibles sur demande</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Petit-déjeuner inclus</p>
                    <p className="text-muted-foreground text-sm">Produits locaux et faits maison</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Animaux bienvenus</p>
                    <p className="text-muted-foreground text-sm">Sous réserve de validation</p>
                  </div>
                </div>
              </div>
              <div className="pt-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-primary">80€</span>
                  <span className="text-muted-foreground">/nuit</span>
                </div>
                <Link to="/contact">
                  <Button size="lg" className="w-full sm:w-auto group">
                    Réserver maintenant
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Une expérience inoubliable vous attend
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour vérifier les disponibilités et réserver votre nuit dans la yourte.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/planning">
              <Button variant="outline" size="lg">
                Voir les disponibilités
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" className="group">
                Demander une réservation
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Hebergement;
