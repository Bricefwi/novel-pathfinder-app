import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { X } from "lucide-react";

const photos = [
  {
    src: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
    alt: "Randonnée sur la plage",
    category: "Randonnées",
  },
  {
    src: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?w=800&q=80",
    alt: "Cavaliers en forêt",
    category: "Randonnées",
  },
  {
    src: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
    alt: "Paysage breton",
    category: "Paysages",
  },
  {
    src: "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=800&q=80",
    alt: "Désert marocain",
    category: "Maroc",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    alt: "Montagne bretonne",
    category: "Paysages",
  },
  {
    src: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80",
    alt: "Cheval au galop",
    category: "Chevaux",
  },
  {
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    alt: "Portrait cheval",
    category: "Chevaux",
  },
  {
    src: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80",
    alt: "Dunes du désert",
    category: "Maroc",
  },
  {
    src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=800&q=80",
    alt: "Forêt enchantée",
    category: "Paysages",
  },
  {
    src: "https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?w=800&q=80",
    alt: "Groupe de cavaliers",
    category: "Randonnées",
  },
  {
    src: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    alt: "Gîte cosy",
    category: "Hébergement",
  },
  {
    src: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80",
    alt: "Écurie",
    category: "Ferme",
  },
];

const categories = ["Tous", "Randonnées", "Chevaux", "Paysages", "Maroc", "Hébergement", "Ferme"];

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
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80')" }}
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
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
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
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredPhotos.map((photo, i) => (
              <div 
                key={i} 
                className="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => setLightboxImage(photo.src)}
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
        >
          <button 
            className="absolute top-6 right-6 text-primary-foreground hover:text-primary transition-colors"
            onClick={() => setLightboxImage(null)}
            aria-label="Fermer"
          >
            <X className="h-8 w-8" />
          </button>
          <img 
            src={lightboxImage.replace('w=800', 'w=1600')} 
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
