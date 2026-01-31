import { Link } from "react-router-dom";
import { ArrowRight, Compass, Home, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import yourteInterieur from "@/assets/yourte-interieur.jpg";
import bretagneVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";

const services = [
  {
    icon: Compass,
    title: "Randonnées",
    description:
      "Explorez la Bretagne romantique ou les dunes du Maroc lors de randonnées inoubliables de 2 à 7 jours.",
    image: cavaliersPlageCoucherSoleil,
    href: "/destinations",
    accent: "from-primary/80 to-primary",
  },
  {
    icon: Home,
    title: "Hébergement",
    description:
      "Séjournez dans notre yourte traditionnelle au cœur de la ferme, pour une immersion totale dans l'univers équestre.",
    image: yourteInterieur,
    href: "/hebergement",
    accent: "from-secondary/80 to-secondary",
  },
  {
    icon: Calendar,
    title: "Événements",
    description:
      "Anniversaires, team building, baptêmes... Célébrez vos moments importants dans un cadre unique.",
    image: bretagneVillageChevaux,
    href: "/contact",
    accent: "from-chart-1/80 to-chart-1",
  },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-primary font-medium mb-4">
            Nos services
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Une expérience équestre complète
          </h2>
          <p className="text-muted-foreground text-lg">
            Que vous rêviez d'aventure, d'apprentissage ou de détente, nous avons
            l'expérience parfaite pour vous.
          </p>
        </div>

        {/* Services Grid - Responsive avec transition md */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service, index) => (
            <Link
              key={service.title}
              to={service.href}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] md:aspect-[4/5] block"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Image with lazy loading */}
              <img 
                src={service.image}
                alt={service.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* Overlay - gradient sombre uniquement */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent group-hover:from-foreground/90 transition-all" />

              {/* Content */}
              <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-card/20 backdrop-blur-sm flex items-center justify-center">
                      <service.icon className="h-4 w-4 sm:h-5 sm:w-5 text-card" />
                    </div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-card">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-card/90 text-xs sm:text-sm mb-2 sm:mb-3 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs sm:text-sm"
                  >
                    Découvrir
                    <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
