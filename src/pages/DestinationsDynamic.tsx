import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSejoursGrouped, type ActivityWithSlots } from "@/hooks/useActivities";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  MapPin,
  Clock,
  Users,
  Star,
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Check,
} from "lucide-react";

// Fallback images for countries without database images
import franceMontSaintMichelCavaliers from "@/assets/france-mont-saint-michel-cavaliers.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import ecosseHighlandsCavaliers from "@/assets/ecosse-highlands-cavaliers.jpg";
import mongolieSteppesCavaliers from "@/assets/mongolie-steppes-cavaliers.jpg";

const COUNTRY_IMAGES: Record<string, string> = {
  France: franceMontSaintMichelCavaliers,
  Maroc: marocDunesCavaliers,
  Europe: ecosseHighlandsCavaliers,
  Asie: mongolieSteppesCavaliers,
};

const COUNTRY_DESCRIPTIONS: Record<string, string> = {
  France: "Randonnées équestres au cœur des plus beaux paysages français, de la Bretagne sauvage aux Vosges majestueuses.",
  Maroc: "Des dunes dorées du Sahara aux sommets de l'Atlas, vivez l'aventure marocaine à cheval.",
  Europe: "Highlands écossais, steppes islandaises... Explorez les terres équestres européennes.",
  Asie: "Steppes mongoles, déserts jordaniens... Les grandes chevauchées d'Orient.",
};

type ViewLevel = "countries" | "regions" | "sejours";

interface NavigationState {
  level: ViewLevel;
  selectedCountry: string | null;
  selectedRegion: string | null;
}

const DestinationsDynamic = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem } = useCartStore();
  const { data: groupedData, isLoading, error } = useSejoursGrouped();

  const [nav, setNav] = useState<NavigationState>({
    level: "countries",
    selectedCountry: null,
    selectedRegion: null,
  });

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Handle URL params for deep linking
  useEffect(() => {
    const regionParam = searchParams.get("region");
    if (regionParam && groupedData) {
      // Find the country that contains this region
      for (const [country, regions] of Object.entries(groupedData)) {
        for (const region of Object.keys(regions)) {
          if (region.toLowerCase().includes(regionParam.toLowerCase())) {
            setNav({
              level: "sejours",
              selectedCountry: country,
              selectedRegion: region,
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
      }
    }
  }, [searchParams, groupedData]);

  const handleSelectCountry = (country: string) => {
    setNav({ level: "regions", selectedCountry: country, selectedRegion: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectRegion = (region: string) => {
    setNav({ ...nav, level: "sejours", selectedRegion: region });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (nav.level === "sejours") {
      setNav({ ...nav, level: "regions", selectedRegion: null });
    } else if (nav.level === "regions") {
      setNav({ level: "countries", selectedCountry: null, selectedRegion: null });
    }
    setSelectedSlotId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = (sejour: ActivityWithSlots) => {
    const slot = sejour.slots.find((s) => s.id === selectedSlotId);

    if (!slot && sejour.slots.length > 0) {
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
      image: sejour.featured_image || COUNTRY_IMAGES[sejour.country || "France"],
      price: slot?.price || sejour.price_from || 0,
      startDate: slot?.start_date,
      endDate: slot?.end_date,
      slotId: slot?.id,
      ridingLevel: sejour.riding_level || undefined,
    });

    toast.success(`${sejour.title} ajouté au panier !`);
    setSelectedSlotId(null);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen pt-28 pb-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96 mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Erreur de chargement</h1>
            <p className="text-muted-foreground mb-6">Impossible de charger les destinations.</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const countries = Object.keys(groupedData || {});
  const regions = nav.selectedCountry ? Object.keys(groupedData?.[nav.selectedCountry] || {}) : [];
  const sejours =
    nav.selectedCountry && nav.selectedRegion
      ? groupedData?.[nav.selectedCountry]?.[nav.selectedRegion] || []
      : [];

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

  return (
    <Layout>
      <SEOHead {...seoConfigs.destinations} />

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Accueil</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {nav.level === "countries" ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Destinations</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => setNav({ level: "countries", selectedCountry: null, selectedRegion: null })}
                    >
                      Destinations
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              {nav.level === "regions" && nav.selectedCountry && (
                <BreadcrumbItem>
                  <BreadcrumbPage>{nav.selectedCountry}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {nav.level === "sejours" && nav.selectedCountry && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => setNav({ level: "regions", selectedCountry: nav.selectedCountry, selectedRegion: null })}
                    >
                      {nav.selectedCountry}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{nav.selectedRegion}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Back Button */}
          {nav.level !== "countries" && (
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}

          {/* Title */}
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              {nav.level === "countries" && "Nos Destinations"}
              {nav.level === "regions" && nav.selectedCountry}
              {nav.level === "sejours" && nav.selectedRegion}
            </h1>
            <p className="text-lg text-muted-foreground">
              {nav.level === "countries" &&
                "Explorez nos randonnées équestres à travers le monde. Des paysages époustouflants vous attendent."}
              {nav.level === "regions" &&
                nav.selectedCountry &&
                COUNTRY_DESCRIPTIONS[nav.selectedCountry]}
              {nav.level === "sejours" &&
                `Découvrez nos séjours en ${nav.selectedRegion}, ${nav.selectedCountry}`}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* LEVEL 1: Countries */}
          {nav.level === "countries" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {countries.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">Aucune destination disponible pour le moment.</p>
                </div>
              ) : (
                countries.map((country) => {
                  const countryRegions = Object.keys(groupedData?.[country] || {});
                  const totalSejours = countryRegions.reduce(
                    (acc, r) => acc + (groupedData?.[country]?.[r]?.length || 0),
                    0
                  );

                  return (
                    <Card
                      key={country}
                      className="group cursor-pointer overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
                      onClick={() => handleSelectCountry(country)}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={COUNTRY_IMAGES[country] || franceMontSaintMichelCavaliers}
                          alt={country}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-serif text-2xl font-bold text-primary-foreground">
                            {country}
                          </h3>
                          <p className="text-primary-foreground/80 text-sm">
                            {totalSejours} voyage{totalSejours > 1 ? "s" : ""} • {countryRegions.length} région
                            {countryRegions.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {COUNTRY_DESCRIPTIONS[country] || "Découvrez nos séjours équestres."}
                        </p>
                        <div className="flex items-center text-primary font-medium text-sm">
                          Explorer
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* LEVEL 2: Regions */}
          {nav.level === "regions" && nav.selectedCountry && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">Aucune région disponible.</p>
                </div>
              ) : (
                regions.map((region) => {
                  const regionSejours = groupedData?.[nav.selectedCountry!]?.[region] || [];
                  const firstImage = regionSejours[0]?.featured_image;

                  return (
                    <Card
                      key={region}
                      className="group cursor-pointer overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
                      onClick={() => handleSelectRegion(region)}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={firstImage || COUNTRY_IMAGES[nav.selectedCountry!] || franceMontSaintMichelCavaliers}
                          alt={region}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {nav.selectedCountry}
                          </Badge>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-serif text-xl font-bold text-primary-foreground">
                            {region}
                          </h3>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-medium text-sm">
                            {regionSejours.length} voyage{regionSejours.length > 1 ? "s" : ""} disponible
                            {regionSejours.length > 1 ? "s" : ""}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <ArrowRight className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* LEVEL 3: Sejours */}
          {nav.level === "sejours" && nav.selectedRegion && (
            <div className="space-y-8">
              {sejours.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucun séjour disponible dans cette région.</p>
                </div>
              ) : (
                sejours.map((sejour) => (
                  <Card key={sejour.id} className="overflow-hidden hover:border-primary/30 transition-all">
                    <div className="flex flex-col lg:flex-row">
                      {/* Image */}
                      <Link
                        to={`/sejour/${sejour.slug}`}
                        className="relative lg:w-2/5 aspect-[16/10] lg:aspect-auto lg:min-h-[320px] overflow-hidden group"
                      >
                        <img
                          src={sejour.featured_image || COUNTRY_IMAGES[sejour.country || "France"]}
                          alt={sejour.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {sejour.riding_level && (
                          <div className="absolute top-4 left-4">
                            <Badge className={`${niveauColor[sejour.riding_level]} border text-xs`}>
                              {niveauLabels[sejour.riding_level]}
                            </Badge>
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col">
                        <div className="flex-1">
                          <Link to={`/sejour/${sejour.slug}`}>
                            <h3 className="font-serif text-2xl font-bold text-foreground mb-1 hover:text-primary transition-colors">
                              {sejour.title}
                            </h3>
                          </Link>
                          {sejour.short_description && (
                            <p className="text-primary font-medium text-sm mb-3">{sejour.short_description}</p>
                          )}
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {sejour.description}
                          </p>

                          {/* Quick Info */}
                          <div className="flex flex-wrap gap-3 mb-4">
                            {sejour.duration && (
                              <Badge variant="secondary" className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {sejour.duration}
                              </Badge>
                            )}
                            {sejour.max_participants && (
                              <Badge variant="secondary" className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Max {sejour.max_participants}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {sejour.region}
                            </Badge>
                          </div>

                          {/* Slots Table */}
                          {sejour.slots.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Prochaines dates
                              </p>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="text-xs">Dates</TableHead>
                                      <TableHead className="text-xs">Prix</TableHead>
                                      <TableHead className="text-xs">Places</TableHead>
                                      <TableHead className="text-xs w-10"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sejour.slots.slice(0, 3).map((slot) => {
                                      const placesRestantes = (slot.max_participants || 0) - (slot.current_participants || 0);
                                      return (
                                        <TableRow
                                          key={slot.id}
                                          className={`cursor-pointer transition-colors ${
                                            selectedSlotId === slot.id ? "bg-primary/5" : "hover:bg-muted/50"
                                          }`}
                                          onClick={() => setSelectedSlotId(slot.id)}
                                        >
                                          <TableCell className="text-sm py-2">
                                            {format(new Date(slot.start_date), "dd MMM", { locale: fr })} -{" "}
                                            {format(new Date(slot.end_date), "dd MMM", { locale: fr })}
                                          </TableCell>
                                          <TableCell className="font-semibold text-primary text-sm py-2">
                                            {slot.price?.toLocaleString("fr-FR")}€
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <Badge variant={placesRestantes <= 2 ? "destructive" : "secondary"} className="text-xs">
                                              {placesRestantes} place{placesRestantes > 1 ? "s" : ""}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-2">
                                            {selectedSlotId === slot.id && <Check className="h-4 w-4 text-primary" />}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div>
                            {sejour.price_from ? (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">À partir de</span>
                                <span className="text-2xl font-bold text-primary">
                                  {sejour.price_from.toLocaleString("fr-FR")}€
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Prix sur demande</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {sejour.slots.length > 0 ? (
                              <Button onClick={() => handleAddToCart(sejour)}>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Réserver
                              </Button>
                            ) : (
                              <Button asChild>
                                <Link to={`/demande-devis?sejour=${encodeURIComponent(sejour.title)}`}>
                                  Demander un devis
                                </Link>
                              </Button>
                            )}
                            <Button variant="outline" asChild>
                              <Link to={`/sejour/${sejour.slug}`}>Voir détails</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default DestinationsDynamic;
