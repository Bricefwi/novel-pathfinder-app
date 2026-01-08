import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function HeroSection() {
  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-25-scaled.jpg')`,
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/30 to-foreground/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-card/20 backdrop-blur-sm border border-card/30">
            <span className="text-sm text-card font-medium">
              ✨ Randonnées équestres en Bretagne & Maroc
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl font-bold text-card leading-tight">
            Quand la sérénité du voyage
            <br />
            <span className="text-primary">rencontre l'aventure</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-card/90 max-w-2xl mx-auto leading-relaxed">
            Vivez des moments uniques au rythme du cheval, entre les légendes bretonnes
            et les dunes marocaines. Une expérience inoubliable vous attend.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/destinations">
              <Button size="lg" className="min-w-[200px] text-base">
                Découvrir nos randonnées
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] text-base bg-card/10 border-card/30 text-card hover:bg-card/20 hover:text-card"
              >
                Demander un devis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-card/80 hover:text-card transition-colors animate-bounce"
        aria-label="Défiler vers le contenu"
      >
        <ChevronDown className="h-8 w-8" />
      </button>
    </section>
  );
}
