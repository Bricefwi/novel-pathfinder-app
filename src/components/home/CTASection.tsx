import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url('https://www.ferme-equestre-an-arwen.com/wp-content/uploads/2022/07/Bretagne-romantique-a-cheval-an-arwen-23-scaled.jpg')`,
        }}
      >
        <div className="absolute inset-0 bg-foreground/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-card leading-tight">
            Prêt à vivre l'aventure équestre ?
          </h2>
          <p className="text-xl text-card/90 leading-relaxed">
            Rejoignez-nous pour une expérience unique au cœur de la Bretagne ou du
            Maroc. Votre prochaine aventure commence ici.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/destinations">
              <Button size="lg" className="min-w-[200px]">
                Explorer nos randonnées
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] bg-card/10 border-card/30 text-card hover:bg-card/20 hover:text-card"
              >
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
