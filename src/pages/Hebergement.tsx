import { Layout } from "@/components/layout/Layout";
import { Wifi, Car, Coffee, TreePine, Users, Bed, ArrowRight, Star, Check, Home, Leaf, Heart, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";

// Import real yourte images
import yourteCollage from "@/assets/yourte-collage.png";
import yourteCollage2 from "@/assets/yourte-collage-2.png";
import yourteInterieurLits from "@/assets/yourte-interieur-lits.webp";
import yourteInterieurChambre from "@/assets/yourte-interieur-chambre.webp";
import yourtePorte from "@/assets/yourte-porte.webp";
import yourteExterieurCoucher from "@/assets/yourte-exterieur-coucher.webp";
import yourteJardinHamac from "@/assets/yourte-jardin-hamac.webp";

const AIRBNB_LINK = "https://www.airbnb.fr/rooms/668711561474211213?search_mode=regular_search&adults=1&category_tag=Tag%3A8678&check_in=2026-06-01&check_out=2026-06-06&children=0&infants=0&pets=0&photo_id=1638525923&source_impression_id=p3_1768485127_P3mdjBRYKvw1jVf6&previous_page_section_name=1000&federated_search_id=e910c358-aca4-4c15-85c4-0ebc5a7873c6";

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

// Avis Airbnb
const airbnbReviews = [
  {
    name: "Charles",
    years: "4 ans sur Airbnb",
    date: "août 2025",
    type: "Séjour d'une nuit",
    rating: 5,
    content: "Merci à Arwen et sa famille pour son accueil dans ce lieu atypique."
  },
  {
    name: "Karine Isabelle",
    years: "11 ans sur Airbnb",
    date: "juillet 2025",
    type: "Séjour d'une nuit",
    rating: 5,
    content: "Belle découverte ! La yourte est très belle et Arwen est adorable ! Nous avons fait aussi une balade a cheval avec elle. Tout ses animaux sont adorables. Nous avons passé un excellent séjour"
  },
  {
    name: "Charlotte",
    years: "12 ans sur Airbnb",
    date: "août 2025",
    type: "Séjour d'une nuit",
    rating: 4,
    content: "Nous avons été très bien accueillis dans un cadre insolite! Merci à ce très gentil couple."
  },
  {
    name: "Léo",
    years: "10 ans sur Airbnb",
    date: "août 2025",
    type: "Séjour d'une nuit",
    rating: 5,
    content: "Tout s'est bien passé. Merci à Arwen pour sa dispo et gentillesse endroit idéal pour les enfants :)"
  }
];

const ratingCategories = [
  { label: "Propreté", score: 4.7 },
  { label: "Précision", score: 4.8 },
  { label: "Arrivée", score: 4.9 },
  { label: "Communication", score: 4.9 },
  { label: "Emplacement", score: 4.8 },
  { label: "Qualité-prix", score: 4.8 },
];

const Hebergement = () => {
  return (
    <Layout>
      <SEOHead {...seoConfigs.hebergement} />
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
          <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="group">
              Réserver sur Airbnb
              <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>
      </section>

      {/* Airbnb Badge Section */}
      <section className="py-8 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#FF5A5F]" fill="currentColor">
                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 2.472.91 3.24 0 2.564-2.246 4.277-5.066 4.277-2.021 0-4.034-.89-5.849-2.494-.485-.428-.892-.798-1.228-1.134a.715.715 0 0 0-.296-.206c-.095-.045-.224-.064-.379-.064-.11 0-.199.008-.266.018a.773.773 0 0 0-.298.213c-.289.29-.652.636-1.1 1.04-1.814 1.638-3.835 2.627-5.867 2.627-2.82 0-5.066-1.713-5.066-4.277 0-.768.243-1.649.91-3.24l.145-.353c.986-2.296 5.146-11.005 7.1-14.836l.533-1.025C12.537 1.963 13.992 1 16 1zm0 2c-1.239 0-2.053.539-2.987 2.21l-.523 1.008c-1.926 3.776-6.06 12.43-7.031 14.692l-.345.836c-.427 1.071-.614 1.71-.614 2.177 0 1.289 1.274 2.277 3.066 2.277 1.461 0 3.082-.732 4.622-2.1l.925-.86.33-.3c.273-.24.523-.42.782-.535a2.593 2.593 0 0 1 1.158-.206c.548 0 .989.108 1.361.35.225.147.416.32.584.512l.358.361.84.8c1.539 1.368 3.16 2.1 4.622 2.1 1.792 0 3.066-.988 3.066-2.277 0-.467-.187-1.106-.614-2.177l-.345-.836c-.971-2.262-5.105-10.916-7.031-14.692l-.523-1.008C18.053 3.539 17.239 3 16 3z"/>
              </svg>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Disponible sur Airbnb</span>
                <span className="text-sm text-muted-foreground">Réservez en toute confiance</span>
              </div>
            </a>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-lg font-bold text-foreground">4,81</span>
              <span className="text-muted-foreground">· 134 commentaires</span>
            </div>
          </div>
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
                <span className="text-muted-foreground">Noté 4.81/5 par nos visiteurs</span>
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

      {/* Airbnb Reviews Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Rating Overview */}
              <div className="lg:w-1/3">
                <div className="sticky top-24 space-y-6">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 fill-foreground text-foreground" />
                    <span className="text-5xl font-bold text-foreground">4,81</span>
                  </div>
                  <p className="text-lg text-muted-foreground">134 commentaires sur Airbnb</p>
                  
                  <div className="space-y-4 pt-4">
                    {ratingCategories.map((category, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-foreground w-28">{category.label}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${(category.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground w-8">{category.score}</span>
                      </div>
                    ))}
                  </div>

                  <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer" className="block pt-4">
                    <Button variant="outline" className="w-full group">
                      Voir tous les avis sur Airbnb
                      <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Reviews List */}
              <div className="lg:w-2/3">
                <h2 className="font-serif text-3xl font-bold text-foreground mb-8">
                  Ce que disent nos voyageurs
                </h2>
                <div className="space-y-8">
                  {airbnbReviews.map((review, index) => (
                    <div key={index} className="bg-background p-6 rounded-2xl border border-border">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {review.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{review.name}</h4>
                          <p className="text-sm text-muted-foreground">{review.years}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'fill-foreground text-foreground' : 'fill-muted text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">· {review.date} · {review.type}</span>
                      </div>
                      <p className="text-foreground leading-relaxed">{review.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magazine Editorial Section */}
      <section className="py-24 bg-background">
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
            <blockquote className="my-16 py-8 px-6 md:px-12 border-l-4 border-primary bg-muted/50 rounded-r-2xl">
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
      <section className="py-16 bg-muted/30">
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
                className="flex flex-col items-center text-center p-6 bg-background rounded-2xl border border-border hover:border-primary/30 transition-colors"
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
                <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="w-full sm:w-auto group">
                    Réserver maintenant
                    <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer" className="group">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#FF5A5F] group-hover:scale-110 transition-transform" fill="currentColor">
                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 2.472.91 3.24 0 2.564-2.246 4.277-5.066 4.277-2.021 0-4.034-.89-5.849-2.494-.485-.428-.892-.798-1.228-1.134a.715.715 0 0 0-.296-.206c-.095-.045-.224-.064-.379-.064-.11 0-.199.008-.266.018a.773.773 0 0 0-.298.213c-.289.29-.652.636-1.1 1.04-1.814 1.638-3.835 2.627-5.867 2.627-2.82 0-5.066-1.713-5.066-4.277 0-.768.243-1.649.91-3.24l.145-.353c.986-2.296 5.146-11.005 7.1-14.836l.533-1.025C12.537 1.963 13.992 1 16 1zm0 2c-1.239 0-2.053.539-2.987 2.21l-.523 1.008c-1.926 3.776-6.06 12.43-7.031 14.692l-.345.836c-.427 1.071-.614 1.71-.614 2.177 0 1.289 1.274 2.277 3.066 2.277 1.461 0 3.082-.732 4.622-2.1l.925-.86.33-.3c.273-.24.523-.42.782-.535a2.593 2.593 0 0 1 1.158-.206c.548 0 .989.108 1.361.35.225.147.416.32.584.512l.358.361.84.8c1.539 1.368 3.16 2.1 4.622 2.1 1.792 0 3.066-.988 3.066-2.277 0-.467-.187-1.106-.614-2.177l-.345-.836c-.971-2.262-5.105-10.916-7.031-14.692l-.523-1.008C18.053 3.539 17.239 3 16 3z"/>
              </svg>
            </a>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Une expérience inoubliable vous attend
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Réservez votre séjour dans la yourte directement sur Airbnb pour une expérience en toute confiance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={AIRBNB_LINK} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="group">
                Réserver sur Airbnb
                <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Hebergement;
