import { Link } from "react-router-dom";
import { ArrowRight, Clock, Users, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DestinationCardProps {
  id: string;
  pays: string;
  region: string;
  titre: string;
  sousTitre?: string;
  description: string;
  image: string;
  niveau: string;
  duree: string;
  prixFrom: number | null;
  slug: string;
  inclusions?: string[];
  rating?: number;
}

const defaultInclusions = [
  "Hébergement en gîte",
  "Pension complète",
  "Guide accompagnateur",
  "Matériel équestre",
];

export const DestinationCard = ({
  pays,
  region,
  titre,
  sousTitre,
  description,
  image,
  niveau,
  duree,
  prixFrom,
  slug,
  inclusions = defaultInclusions,
  rating = 4.9,
}: DestinationCardProps) => {
  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Image section */}
        <div className="relative lg:w-2/5 aspect-[4/3] lg:aspect-auto overflow-hidden">
          <img
            src={image}
            alt={titre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Rating badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1.5 bg-foreground/80 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-lg">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-sm">{rating}</span>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col justify-between">
          <div>
            {/* Location label */}
            <p className="text-primary font-medium text-sm tracking-wide uppercase mb-2">
              {region}, {pays}
            </p>

            {/* Title */}
            <h3 className="font-serif text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {titre}
            </h3>

            {/* Subtitle */}
            {sousTitre && (
              <p className="text-muted-foreground italic mb-4">{sousTitre}</p>
            )}

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-6">
              {description}
            </p>

            {/* Duration & Level badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground"
              >
                <Clock className="h-4 w-4" />
                {duree}
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground"
              >
                <Users className="h-4 w-4" />
                {niveau}
              </Badge>
            </div>

            {/* Inclusions grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6">
              {inclusions.map((inclusion, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground text-sm">
                    {inclusion}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price and CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <div>
              {prixFrom ? (
                <>
                  <p className="text-muted-foreground text-sm">À partir de</p>
                  <p className="text-primary text-3xl font-bold">
                    {prixFrom.toLocaleString("fr-FR")}€
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Sur demande</p>
              )}
            </div>
            <Link to={`/demande-devis?sejour=${encodeURIComponent(titre)}`}>
              <Button
                size="lg"
                className="group/btn bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                Réserver
                <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
