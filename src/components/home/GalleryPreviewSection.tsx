import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { detectVideo } from "@/lib/video-embed";
import galerieBretagneEglise from "@/assets/galerie-bretagne-eglise.jpg";
import galerieMarocDunes from "@/assets/galerie-maroc-dunes.jpg";
import galerieBretagnePanorama from "@/assets/galerie-bretagne-panorama.jpg";
import galerieMarocCoucherSoleil from "@/assets/galerie-maroc-coucher-soleil.jpg";
import galerieMarocPlage from "@/assets/galerie-maroc-plage.jpg";
import galerieMarocDesert from "@/assets/galerie-maroc-desert.jpg";

type MediaItem = {
  id: string;
  src: string;
  alt: string;
  span: string;
  mediaType: "image" | "video";
  videoUrl?: string;
  videoProvider?: "youtube" | "vimeo" | "file";
};

const SPANS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

const fallbackItems: MediaItem[] = [
  { id: "s1", src: galerieMarocCoucherSoleil, alt: "Cavaliers au coucher de soleil sur la plage au Maroc", span: SPANS[0], mediaType: "image" },
  { id: "s2", src: galerieBretagneEglise, alt: "Randonnée équestre près d'une église en Bretagne", span: SPANS[1], mediaType: "image" },
  { id: "s3", src: galerieMarocDunes, alt: "Cavaliers dans les dunes du désert marocain", span: SPANS[2], mediaType: "image" },
  { id: "s4", src: galerieMarocPlage, alt: "Randonnée à cheval sur la plage marocaine", span: SPANS[3], mediaType: "image" },
  { id: "s5", src: galerieBretagnePanorama, alt: "Chevaux admirant le panorama breton", span: SPANS[4], mediaType: "image" },
  { id: "s6", src: galerieMarocDesert, alt: "Cavaliers traversant le désert marocain", span: SPANS[5], mediaType: "image" },
];

export function GalleryPreviewSection() {
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>(fallbackItems);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error || !data || data.length === 0) return;

      const mapped: MediaItem[] = data.map((p: any, idx: number) => {
        const isVideo = p.media_type === "video";
        const embed = isVideo && p.video_url ? detectVideo(p.video_url) : null;
        const thumb = p.thumbnail_url || embed?.thumbnailUrl || p.image_url;
        return {
          id: p.id,
          src: thumb,
          alt: p.title || p.description || "Photo de la galerie",
          span: SPANS[idx % SPANS.length],
          mediaType: isVideo ? "video" : "image",
          videoUrl: embed?.embedUrl,
          videoProvider: embed?.provider,
        };
      });
      setGalleryItems(mapped);
    };
    load();
  }, []);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const goToPrevious = () =>
    lightboxIndex !== null &&
    setLightboxIndex(lightboxIndex === 0 ? galleryItems.length - 1 : lightboxIndex - 1);
  const goToNext = () =>
    lightboxIndex !== null &&
    setLightboxIndex(lightboxIndex === galleryItems.length - 1 ? 0 : lightboxIndex + 1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  const current = lightboxIndex !== null ? galleryItems[lightboxIndex] : null;

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block text-primary font-medium mb-4">Notre galerie</span>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 auto-rows-[150px] sm:auto-rows-[200px]">
          {galleryItems.map((item, index) => (
            <div
              key={item.id}
              className={`${item.span} group relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer`}
              onClick={() => openLightbox(index)}
            >
              <img
                src={item.src}
                alt={item.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-125"
                loading="lazy"
              />
              {item.mediaType === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="h-7 w-7 text-primary-foreground fill-current" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300" />
              <div className="absolute inset-0 flex items-end p-2 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-card text-xs sm:text-sm font-medium drop-shadow-lg line-clamp-2">{item.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Galerie"
        >
          <button className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10" onClick={closeLightbox} aria-label="Fermer">
            <X className="h-8 w-8" />
          </button>
          <button
            className="absolute left-4 p-2 text-white/80 hover:text-white z-10"
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            aria-label="Précédent"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          <div className="max-w-5xl w-[90vw] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {current.mediaType === "video" && current.videoUrl ? (
              current.videoProvider === "file" ? (
                <video src={current.videoUrl} controls autoPlay className="w-full max-h-[85vh] rounded-lg" />
              ) : (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`${current.videoUrl}${current.videoUrl.includes("?") ? "&" : "?"}autoplay=1`}
                    title={current.alt}
                    className="absolute inset-0 w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )
            ) : (
              <img src={current.src} alt={current.alt} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto" />
            )}
            <p className="text-white text-center mt-4 text-lg font-medium">{current.alt}</p>
            <p className="text-white/60 text-center text-sm mt-1">
              {(lightboxIndex ?? 0) + 1} / {galleryItems.length}
            </p>
          </div>

          <button
            className="absolute right-4 p-2 text-white/80 hover:text-white z-10"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            aria-label="Suivant"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </section>
  );
}
