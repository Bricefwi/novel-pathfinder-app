import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Check, 
  Calendar,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityBySlug } from "@/hooks/useActivities";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Default images for fallback
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";

const FicheSejourDynamic = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { data: sejour, isLoading, error } = useActivityBySlug(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen pt-28 pb-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-48" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !sejour) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Séjour non trouvé</h1>
            <p className="text-muted-foreground mb-6">Ce séjour n'existe pas ou n'est plus disponible.</p>
            <Button onClick={() => navigate("/destinations")}>
              Retour aux destinations
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Parse images from JSON or use featured image
  const images: string[] = (() => {
    if (sejour.images && Array.isArray(sejour.images)) {
      return sejour.images as string[];
    }
    if (sejour.featured_image) {
      return [sejour.featured_image];
    }
    return [cavaliersPlageCoucherSoleil];
  })();

  const selectedSlot = sejour.slots.find((s) => s.id === selectedSlotId);

  const handleAddToCart = () => {
    if (!selectedSlot && sejour.slots.length > 0) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    addItem({
      id: sejour.id,
      type: "sejour",
      title: sejour.title,
      subtitle: sejour.short_description || undefined,
      location: `${sejour.region || ""}, ${sejour.country || ""}`,
      duration: sejour.duration || undefined,
      image: images[0],
      price: selectedSlot?.price || sejour.price_from || 0,
      startDate: selectedSlot?.start_date,
      endDate: selectedSlot?.end_date,
      slotId: selectedSlot?.id,
      ridingLevel: sejour.riding_level || undefined,
    });

    toast.success("Séjour ajouté au panier !");
  };

  const handleQuickReserve = () => {
    const params = new URLSearchParams();
    params.set("sejour", sejour.title);
    if (selectedSlot) {
      params.set("date", selectedSlot.start_date);
    }
    navigate(`/demande-devis?${params.toString()}`);
  };

  const niveauLabels: Record<string, string> = {
    debutant: "Débutant",
    intermediaire: "Intermédiaire",
    confirme: "Confirmé",
    expert: "Expert",
  };

  const niveauColor: Record<string, string> = {
    debutant: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    intermediaire: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    confirme: "bg-rose-500/10 text-rose-700 border-rose-500/30",
    expert: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  };

  const inclusions = sejour.inclusions || [];
  const exclusions = sejour.exclusions || [];
  const requirements = sejour.requirements || [];

  return (
    <Layout>
      <SEOHead
        title={`${sejour.title} - Randonnée Équestre ${sejour.region || ""}`}
        description={sejour.short_description || sejour.description || ""}
        canonicalUrl={`/sejour/${sejour.slug}`}
      />

      {/* Breadcrumb */}
      <section className="pt-28 pb-4 bg-muted/30">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Accueil</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/destinations">Destinations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sejour.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <img
                  src={images[currentImageIndex]}
                  alt={sejour.title}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {sejour.riding_level && (
                    <Badge className={`${niveauColor[sejour.riding_level] || "bg-muted"} border`}>
                      {niveauLabels[sejour.riding_level] || sejour.riding_level}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <p className="text-primary font-medium text-sm tracking-wide uppercase mb-2">
                  {sejour.region}, {sejour.country}
                </p>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {sejour.title}
                </h1>
                {sejour.short_description && (
                  <p className="text-muted-foreground text-lg italic">{sejour.short_description}</p>
                )}
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-3">
                {sejour.duration && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                    <Clock className="h-4 w-4" />
                    {sejour.duration}
                  </Badge>
                )}
                {sejour.region && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                    <MapPin className="h-4 w-4" />
                    {sejour.region}
                  </Badge>
                )}
                {sejour.max_participants && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                    <Users className="h-4 w-4" />
                    Max {sejour.max_participants} pers.
                  </Badge>
                )}
              </div>

              {/* Description */}
              {sejour.description && (
                <div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {sejour.description}
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                {sejour.price_from ? (
                  <>
                    <span className="text-sm text-muted-foreground">À partir de</span>
                    <span className="text-4xl font-bold text-primary">
                      {sejour.price_from.toLocaleString("fr-FR")}€
                    </span>
                    <span className="text-muted-foreground">/personne</span>
                  </>
                ) : (
                  <span className="text-xl font-medium text-muted-foreground">Prix sur demande</span>
                )}
              </div>

              {/* Dates Selection */}
              {sejour.slots.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      Dates disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dates</TableHead>
                          <TableHead>Prix</TableHead>
                          <TableHead>Places</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sejour.slots.map((slot) => {
                          const placesRestantes = (slot.max_participants || 0) - (slot.current_participants || 0);
                          return (
                            <TableRow
                              key={slot.id}
                              className={`cursor-pointer transition-colors ${
                                selectedSlotId === slot.id ? "bg-primary/5" : "hover:bg-muted/50"
                              }`}
                              onClick={() => setSelectedSlotId(slot.id)}
                            >
                              <TableCell className="font-medium">
                                {format(new Date(slot.start_date), "dd MMM", { locale: fr })} - {format(new Date(slot.end_date), "dd MMM yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell className="font-semibold text-primary">
                                {slot.price?.toLocaleString("fr-FR")}€
                              </TableCell>
                              <TableCell>
                                <Badge variant={placesRestantes <= 2 ? "destructive" : "secondary"}>
                                  {placesRestantes} place{placesRestantes > 1 ? "s" : ""}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {selectedSlotId === slot.id && (
                                  <Check className="h-5 w-5 text-primary" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {sejour.slots.length > 0 ? (
                  <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Ajouter au panier
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1" onClick={handleQuickReserve}>
                    Demander un devis
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={handleQuickReserve}>
                  Demande personnalisée
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Info Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {/* Inclusions */}
            {inclusions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600" />
                    Inclus dans le séjour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Exclusions */}
            {exclusions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <X className="h-5 w-5 text-destructive" />
                    Non inclus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {exclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Prérequis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requirements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FicheSejourDynamic;
