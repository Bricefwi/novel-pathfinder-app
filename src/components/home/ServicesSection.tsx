import { Link } from "react-router-dom";
import { ArrowRight, Compass, GraduationCap, Home, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

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
    icon: GraduationCap,
    title: "Cours & Stages",
    description:
      "Perfectionnez votre équitation avec nos cours adaptés à tous les niveaux, du débutant à l'expert.",
    image:
      "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-3-scaled.jpg",
    href: "/destinations?type=cours",
    accent: "from-accent-foreground/80 to-accent-foreground",
  },
  {
    icon: Home,
    title: "Hébergement",
    description:
      "Séjournez dans notre gîte chaleureux au cœur de la ferme, pour une immersion totale dans l'univers équestre.",
    image:
      "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-25-scaled.jpg",
    href: "/hebergement",
    accent: "from-secondary/80 to-secondary",
  },
  {
    icon: Calendar,
    title: "Événements",
    description:
      "Anniversaires, team building, baptêmes... Célébrez vos moments importants dans un cadre unique.",
    image:
      "https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-23-scaled.jpg",
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

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Link
              key={service.title}
              to={service.href}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] block"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${service.image}')` }}
              />

              {/* Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-t ${service.accent} opacity-70 group-hover:opacity-80 transition-opacity`}
              />

              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-card/20 backdrop-blur-sm flex items-center justify-center">
                      <service.icon className="h-5 w-5 text-card" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-card">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-card/90 text-sm mb-3 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Découvrir
                    <ArrowRight className="ml-2 h-4 w-4" />
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
