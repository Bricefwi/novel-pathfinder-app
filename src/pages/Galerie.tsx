import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { X } from "lucide-react";

// Import real images
import marocPaysageRoute from "@/assets/maroc-paysage-route.jpg";
import marocArchitecture from "@/assets/maroc-architecture.jpg";
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocCavalierCote from "@/assets/maroc-cavalier-cote.jpg";
import marocOmbreCavalier from "@/assets/maroc-ombre-cavalier.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

const photos = [
  {
    src: cavaliersPlageCoucherSoleil,
    alt: "Cavaliers sur la plage au coucher de soleil",
    category: "Randonnées",
  },
  {
    src: marocDunesCavaliers,
    alt: "Cavaliers sur les dunes du Sahara",
    category: "Maroc",
  },
  {
    src: bretagnVillageChevaux,
    alt: "Chevaux devant un restaurant breton typique",
    category: "Bretagne",
  },
  {
    src: marocCavalierCote,
    alt: "Randonnée équestre sur la côte marocaine",
    category: "Maroc",
  },
  {
    src: marocDesertNuages,
    alt: "Paysage du désert marocain avec dunes",
    category: "Paysages",
  },
  {
    src: marocCanyonCavaliers,
    alt: "Cavaliers dans le canyon de l'Atlas",
    category: "Maroc",
  },
  {
    src: marocArchitecture,
    alt: "Architecture traditionnelle marocaine",
    category: "Maroc",
  },
  {
    src: marocPaysageRoute,
    alt: "Route panoramique au Maroc",
    category: "Paysages",
  },
  {
    src: marocOmbreCavalier,
    alt: "Ombre de cavalier dans le désert",
    category: "Maroc",
  },
  {
    src: marocEssaouiraBateau,
    alt: "Bateau de pêche traditionnel à Essaouira",
    category: "Maroc",
  },
];

const categories = ["Tous", "Randonnées", "Bretagne", "Maroc", "Paysages"];

const Galerie = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const filteredPhotos = selectedCategory === "Tous" 
    ? photos 
    : photos.filter(p => p.category === selectedCategory);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marocDunesCavaliers})` }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm">
            Galerie
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            Nos plus beaux moments
          </h1>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Filtrer par catégorie">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                role="tab"
                aria-selected={selectedCategory === cat}
                aria-controls="gallery-grid"
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid - Masonry style */}
      <section className="py-16 bg-background" id="gallery-grid" role="tabpanel">
        <div className="container mx-auto px-4">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredPhotos.map((photo, i) => (
              <div 
                key={i} 
                className="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => setLightboxImage(photo.src)}
                role="button"
                tabIndex={0}
                aria-label={`Agrandir l'image: ${photo.alt}`}
                onKeyDown={(e) => e.key === 'Enter' && setLightboxImage(photo.src)}
              >
                <div className="relative">
                  <img 
                    src={photo.src} 
                    alt={photo.alt} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div>
                      <p className="text-primary-foreground font-medium">{photo.alt}</p>
                      <p className="text-primary-foreground/80 text-sm">{photo.category}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
        >
          <button 
            className="absolute top-6 right-6 text-primary-foreground hover:text-primary transition-colors"
            onClick={() => setLightboxImage(null)}
            aria-label="Fermer"
          >
            <X className="h-8 w-8" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Photo agrandie" 
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
};

export default Galerie;
