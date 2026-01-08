import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
    alt: "Randonnée sur la plage en Bretagne",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=600&q=80",
    alt: "Cavaliers en forêt",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80",
    alt: "Chevaux au galop",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=600&q=80",
    alt: "Coucher de soleil équestre",
    span: "col-span-1 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    alt: "Paysage breton",
    span: "col-span-1 row-span-1",
  },
  {
    src: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80",
    alt: "Randonnée en groupe",
    span: "col-span-1 row-span-1",
  },
];

export function GalleryPreviewSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block text-primary font-medium mb-4">
              Notre galerie
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Moments capturés
            </h2>
          </div>
          <Link to="/galerie">
            <Button variant="outline" size="lg">
              Voir toute la galerie
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className={`${image.span} group relative overflow-hidden rounded-2xl cursor-pointer`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-card text-sm font-medium">{image.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
