import { Heart, Mountain, Users, Shield, Star, Leaf } from "lucide-react";

const features = [
  {
    icon: Heart,
    title: "Passion & Expertise",
    description:
      "Depuis plus de 10 ans d'expérience dans l'organisation de randonnées équestres, avec une équipe passionnée.",
  },
  {
    icon: Mountain,
    title: "Destinations Uniques",
    description:
      "Des itinéraires exclusifs en Bretagne et au Maroc, loin des sentiers battus.",
  },
  {
    icon: Users,
    title: "Petits Groupes",
    description:
      "Maximum 8 cavaliers pour une expérience personnalisée et des moments privilégiés.",
  },
  {
    icon: Shield,
    title: "Sécurité",
    description:
      "Chevaux parfaitement adaptés et encadrement professionnel pour tous niveaux.",
  },
  {
    icon: Star,
    title: "Qualité Premium",
    description:
      "Hébergement confortable, cuisine locale et attention aux détails.",
  },
  {
    icon: Leaf,
    title: "Éco-responsable",
    description:
      "Une approche respectueuse de la nature et des traditions locales.",
  },
];

export function WhyUsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-primary font-medium mb-4">
            Pourquoi nous choisir
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            L'excellence au service de votre aventure
          </h2>
          <p className="text-muted-foreground text-lg">
            Depuis plus de 10 ans, nous créons des expériences équestres uniques qui
            allient passion, authenticité et respect de la nature.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Content */}
              <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover decoration */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
