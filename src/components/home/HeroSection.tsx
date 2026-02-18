import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

// Import des images authentiques
import heroBanniereLacBretagne from "@/assets/hero-banniere-lac-bretagne.jpg";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";

const heroSlides = [
  {
    image: heroBanniereLacBretagne,
    alt: "Cheval au bord d'un lac en Bretagne avec vue sur un clocher",
  },
  {
    image: cavaliersPlageCoucherSoleil,
    alt: "Cavaliers sur la plage au coucher du soleil en Bretagne",
  },
  {
    image: marocDesertNuages,
    alt: "Désert marocain avec nuages spectaculaires",
  },
  {
    image: marocCanyonCavaliers,
    alt: "Cavaliers dans un canyon au Maroc",
  },
];

export function HeroSection() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const textsToTranslate = useMemo(() => [
    "✨ Randonnées équestres en Bretagne & Maroc",
    "Quand la sérénité du voyage",
    "rencontre l'aventure",
    "Vivez des moments uniques au rythme du cheval en direct avec des guides équestres professionnels entre légendes bretonnes, paysages marocains et d'autres merveilles et cultures du monde.",
    "Une expérience inoubliable vous attend !",
    "Découvrir nos randonnées",
    "Demander un devis",
  ], []);
  useAutoTranslate(textsToTranslate);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image Carousel */}
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url('${slide.image}')`,
          }}
          role="img"
          aria-label={slide.alt}
        >
          {/* Overlay renforcé pour meilleure lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/40 to-foreground/70" />
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-card/20 backdrop-blur-sm text-card hover:bg-card/40 transition-colors"
        aria-label="Image précédente"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-card/20 backdrop-blur-sm text-card hover:bg-card/40 transition-colors"
        aria-label="Image suivante"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-card w-8"
                : "bg-card/50 hover:bg-card/70"
            }`}
            aria-label={`Aller à l'image ${index + 1}`}
          />
        ))}
      </div>

      {/* Content with text shadow for better visibility */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-background/20 backdrop-blur-md border border-background/30 shadow-lg">
            <span className="text-sm text-primary-foreground font-medium drop-shadow-md">
              {t("✨ Randonnées équestres en Bretagne & Maroc")}
            </span>
          </div>

          {/* Title with text shadow */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl font-bold text-primary-foreground leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {t("Quand la sérénité du voyage")}
            <br />
            <span className="text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{t("rencontre l'aventure")}</span>
          </h1>

          {/* Subtitle with shadow */}
          <p className="text-lg md:text-xl text-primary-foreground/95 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            {t("Vivez des moments uniques au rythme du cheval en direct avec des guides équestres professionnels entre légendes bretonnes, paysages marocains et d'autres merveilles et cultures du monde.")}
          </p>
          <p className="text-lg md:text-xl text-primary-foreground font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            {t("Une expérience inoubliable vous attend !")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/destinations">
              <Button size="lg" className="min-w-[200px] text-base">
                {t("Découvrir nos randonnées")}
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] text-base bg-card/10 border-card/30 text-card hover:bg-card/20 hover:text-card"
              >
                {t("Demander un devis")}
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
