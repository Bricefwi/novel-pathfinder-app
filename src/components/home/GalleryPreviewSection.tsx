import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import galerieBretagneEglise from "@/assets/galerie-bretagne-eglise.jpg";
import galerieMarocDunes from "@/assets/galerie-maroc-dunes.jpg";
import galerieBretagnePanorama from "@/assets/galerie-bretagne-panorama.jpg";
import galerieMarocCoucherSoleil from "@/assets/galerie-maroc-coucher-soleil.jpg";
import galerieMarocPlage from "@/assets/galerie-maroc-plage.jpg";
import galerieMarocDesert from "@/assets/galerie-maroc-desert.jpg";

const galleryImages = [
  {
    src: galerieMarocCoucherSoleil,
    alt: "Cavaliers au coucher de soleil sur la plage au Maroc",
    span: "col-span-2 row-span-2",
  },
  {
    src: galerieBretagneEglise,
    alt: "Randonnée équestre près d'une église en Bretagne",
    span: "col-span-1 row-span-1",
  },
  {
    src: galerieMarocDunes,
    alt: "Cavaliers dans les dunes du désert marocain",
    span: "col-span-1 row-span-1",
  },
  {
    src: galerieMarocPlage,
    alt: "Randonnée à cheval sur la plage marocaine",
    span: "col-span-1 row-span-2",
  },
  {
    src: galerieBretagnePanorama,
    alt: "Chevaux admirant le panorama breton",
    span: "col-span-1 row-span-1",
  },
  {
    src: galerieMarocDesert,
    alt: "Cavaliers traversant le désert marocain",
    span: "col-span-1 row-span-1",
  },
];

export function GalleryPreviewSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  
  const goToPrevious = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? galleryImages.length - 1 : lightboxIndex - 1);
    }
  };
  
  const goToNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === galleryImages.length - 1 ? 0 : lightboxIndex + 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

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

        {/* Gallery Grid - Responsive avec auto-rows adaptatif */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 auto-rows-[150px] sm:auto-rows-[200px]">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className={`${image.span} group relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer`}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-125"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300" />
              <div className="absolute inset-0 flex items-end p-2 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-card text-xs sm:text-sm font-medium drop-shadow-lg line-clamp-2">{image.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Galerie d'images"
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            onClick={closeLightbox}
            aria-label="Fermer"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Previous button */}
          <button
            className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            aria-label="Image précédente"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          {/* Image container */}
          <div 
            className="max-w-[90vw] max-h-[85vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[lightboxIndex].src}
              alt={galleryImages[lightboxIndex].alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-center mt-4 text-lg font-medium">
              {galleryImages[lightboxIndex].alt}
            </p>
            <p className="text-white/60 text-center text-sm mt-1">
              {lightboxIndex + 1} / {galleryImages.length}
            </p>
          </div>

          {/* Next button */}
          <button
            className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            aria-label="Image suivante"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </section>
  );
}
