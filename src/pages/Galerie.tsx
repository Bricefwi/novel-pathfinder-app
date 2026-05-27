import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { X, Play } from "lucide-react";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { detectVideo } from "@/lib/video-embed";

// Images statiques utilisées comme repli si la table est vide
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

type MediaItem = {
  id: string;
  src: string;            // image / thumbnail à afficher dans la grille
  alt: string;
  category: string;
  mediaType: "image" | "video";
  videoUrl?: string;      // URL d'embed (iframe) ou fichier
  videoProvider?: "youtube" | "vimeo" | "file";
};

const fallbackPhotos: MediaItem[] = [
  { id: "f1", src: cavaliersPlageCoucherSoleil, alt: "Cavaliers sur la plage au coucher de soleil", category: "Randonnées", mediaType: "image" },
  { id: "f2", src: marocDunesCavaliers, alt: "Cavaliers sur les dunes du Sahara", category: "Maroc", mediaType: "image" },
  { id: "f3", src: bretagnVillageChevaux, alt: "Chevaux devant un restaurant breton typique", category: "Bretagne", mediaType: "image" },
  { id: "f4", src: marocCavalierCote, alt: "Randonnée équestre sur la côte marocaine", category: "Maroc", mediaType: "image" },
  { id: "f5", src: marocDesertNuages, alt: "Paysage du désert marocain avec dunes", category: "Paysages", mediaType: "image" },
  { id: "f6", src: marocCanyonCavaliers, alt: "Cavaliers dans le canyon de l'Atlas", category: "Maroc", mediaType: "image" },
  { id: "f7", src: marocArchitecture, alt: "Architecture traditionnelle marocaine", category: "Maroc", mediaType: "image" },
  { id: "f8", src: marocPaysageRoute, alt: "Route panoramique au Maroc", category: "Paysages", mediaType: "image" },
  { id: "f9", src: marocOmbreCavalier, alt: "Ombre de cavalier dans le désert", category: "Maroc", mediaType: "image" },
  { id: "f10", src: marocEssaouiraBateau, alt: "Bateau de pêche traditionnel à Essaouira", category: "Maroc", mediaType: "image" },
];

const Galerie = () => {
  const [items, setItems] = useState<MediaItem[]>(fallbackPhotos);
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) return;

      const mapped: MediaItem[] = data.map((p: any) => {
        const isVideo = p.media_type === "video";
        const embed = isVideo && p.video_url ? detectVideo(p.video_url) : null;
        const thumb =
          p.thumbnail_url ||
          embed?.thumbnailUrl ||
          p.image_url;
        return {
          id: p.id,
          src: thumb,
          alt: p.title || p.description || "Photo",
          category: p.category
            ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
            : "Général",
          mediaType: isVideo ? "video" : "image",
          videoUrl: embed?.embedUrl,
          videoProvider: embed?.provider,
        };
      });
      setItems(mapped);
    };
    load();
  }, []);

  const categories = ["Tous", ...Array.from(new Set(items.map((i) => i.category)))];

  const filtered = selectedCategory === "Tous"
    ? items
    : items.filter((p) => p.category === selectedCategory);

  return (
    <Layout>
      <SEOHead {...seoConfigs.galerie} />
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

      {/* Grille masonry */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer relative"
                onClick={() => setLightboxItem(item)}
                role="button"
                tabIndex={0}
                aria-label={`Agrandir : ${item.alt}`}
                onKeyDown={(e) => e.key === "Enter" && setLightboxItem(item)}
              >
                <div className="relative">
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {item.mediaType === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                      <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-primary-foreground fill-current" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div>
                      <p className="text-primary-foreground font-medium">{item.alt}</p>
                      <p className="text-primary-foreground/80 text-sm">{item.category}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Média agrandi"
        >
          <button
            className="absolute top-6 right-6 text-primary-foreground hover:text-primary transition-colors z-10"
            onClick={() => setLightboxItem(null)}
            aria-label="Fermer"
          >
            <X className="h-8 w-8" />
          </button>

          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl w-full">
            {lightboxItem.mediaType === "video" && lightboxItem.videoUrl ? (
              lightboxItem.videoProvider === "file" ? (
                <video
                  src={lightboxItem.videoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[85vh] rounded-lg"
                />
              ) : (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`${lightboxItem.videoUrl}${lightboxItem.videoUrl.includes("?") ? "&" : "?"}autoplay=1`}
                    title={lightboxItem.alt}
                    className="absolute inset-0 w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )
            ) : (
              <img
                src={lightboxItem.src}
                alt={lightboxItem.alt}
                className="max-w-full max-h-[85vh] rounded-lg object-contain mx-auto"
              />
            )}
            <p className="text-primary-foreground text-center mt-4 text-lg font-medium">
              {lightboxItem.alt}
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Galerie;
