import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Check, 
  Calendar,
  ShoppingCart,
  Euro,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

// Import images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";
import ecosseHighlandsCavaliers from "@/assets/ecosse-highlands-cavaliers.jpg";
import mongolieSteppesCavaliers from "@/assets/mongolie-steppes-cavaliers.jpg";
import jordanieWadiRumCavaliers from "@/assets/jordanie-wadi-rum-cavaliers.jpg";

interface Creneau {
  id: string;
  dateDebut: string;
  dateFin: string;
  nuites: number;
  tarif: number;
  placesDisponibles: number;
}

interface SejourData {
  id: string;
  titre: string;
  sousTitre?: string;
  description: string;
  descriptionLongue?: string;
  image: string;
  images?: string[];
  niveau: string;
  duree: string;
  prixFrom: number | null;
  rating: number;
  inclusions: string[];
  exclusions?: string[];
  creneaux: Creneau[];
  region: string;
  pays: string;
  requirements?: string[];
}

// Static data for sejours
const sejoursData: Record<string, SejourData> = {
  "bretagne-romantique": {
    id: "bretagne-romantique",
    titre: "Bretagne Romantique",
    sousTitre: "Une escapade entre châteaux et forêts enchantées",
    description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours. Entre landes sauvages et patrimoine historique.",
    descriptionLongue: "Partez à la découverte de la Bretagne romantique, terre de légendes et d'histoire. Cette randonnée équestre vous emmènera à travers des paysages enchanteurs : forêts mystérieuses, châteaux médiévaux, landes sauvages et villages de caractère. Chaque jour, vous parcourrez entre 20 et 30 km à cheval, alternant pas, trot et galop selon le terrain et votre niveau.",
    image: cavaliersPlageCoucherSoleil,
    images: [cavaliersPlageCoucherSoleil, bretagnVillageChevaux, korrigansForetChevaux],
    niveau: "Tous niveaux",
    duree: "4 jours / 3 nuits",
    prixFrom: 680,
    rating: 4.9,
    inclusions: ["Hébergement en gîte de charme", "Pension complète (du déjeuner J1 au petit-déjeuner J4)", "Guide accompagnateur professionnel", "Matériel équestre fourni", "Assurance RC"],
    exclusions: ["Transport jusqu'au point de départ", "Équipement personnel", "Pourboires"],
    creneaux: [
      { id: "cr1", dateDebut: "2026-05-07", dateFin: "2026-05-11", nuites: 4, tarif: 680, placesDisponibles: 4 },
      { id: "cr2", dateDebut: "2026-05-21", dateFin: "2026-05-25", nuites: 4, tarif: 680, placesDisponibles: 2 },
      { id: "cr3", dateDebut: "2026-06-04", dateFin: "2026-06-08", nuites: 4, tarif: 720, placesDisponibles: 6 },
    ],
    region: "Bretagne",
    pays: "France",
    requirements: ["Savoir monter au pas, au trot, et au galop", "Bonne condition physique", "Âge minimum : 12 ans"],
  },
  "terre-mer": {
    id: "terre-mer",
    titre: "De la Terre à la Mer",
    sousTitre: "Une traversée épique de l'intérieur aux rivages",
    description: "Traversée de la Bretagne intérieure jusqu'aux rivages atlantiques. Galops sur les plages et bivouacs sous les étoiles bretonnes.",
    image: bretagnVillageChevaux,
    niveau: "Intermédiaire",
    duree: "6 jours / 5 nuits",
    prixFrom: 1190,
    rating: 4.8,
    inclusions: ["Hébergement varié (gîtes et bivouac)", "Pension complète", "Guide expert", "Transferts inclus"],
    creneaux: [
      { id: "cr4", dateDebut: "2026-06-15", dateFin: "2026-06-21", nuites: 6, tarif: 1190, placesDisponibles: 3 },
      { id: "cr5", dateDebut: "2026-07-12", dateFin: "2026-07-18", nuites: 6, tarif: 1290, placesDisponibles: 5 },
    ],
    region: "Bretagne",
    pays: "France",
  },
  "vosges": {
    id: "vosges",
    titre: "Chevauchée des Vosges",
    sousTitre: "Les crêtes et les forêts de sapins",
    description: "Parcourez les crêtes vosgiennes à travers forêts de sapins et chaumes d'altitude. Panoramas exceptionnels sur la plaine d'Alsace.",
    image: korrigansForetChevaux,
    niveau: "Intermédiaire",
    duree: "5 jours / 4 nuits",
    prixFrom: 950,
    rating: 4.7,
    inclusions: ["Hébergement en ferme-auberge", "Pension complète", "Guide local", "Matériel fourni"],
    creneaux: [
      { id: "cr6", dateDebut: "2026-07-20", dateFin: "2026-07-25", nuites: 5, tarif: 950, placesDisponibles: 4 },
      { id: "cr7", dateDebut: "2026-08-17", dateFin: "2026-08-22", nuites: 5, tarif: 990, placesDisponibles: 6 },
    ],
    region: "Vosges",
    pays: "France",
  },
  "portes-sahara": {
    id: "portes-sahara",
    titre: "Les Portes du Sahara",
    sousTitre: "Chevauchée mythique aux portes du désert",
    description: "Dunes dorées, oasis verdoyantes et nuits sous les étoiles du Sahara. Une immersion totale dans le grand Sud marocain.",
    image: marocDunesCavaliers,
    niveau: "Confirmé",
    duree: "7 jours / 6 nuits",
    prixFrom: 1780,
    rating: 5.0,
    inclusions: ["Bivouac & Riad", "Pension complète", "Guide berbère francophone", "Dromadaires de soutien", "Vol intérieur"],
    creneaux: [
      { id: "cr8", dateDebut: "2026-10-10", dateFin: "2026-10-17", nuites: 7, tarif: 1780, placesDisponibles: 6 },
      { id: "cr9", dateDebut: "2026-11-07", dateFin: "2026-11-14", nuites: 7, tarif: 1780, placesDisponibles: 4 },
    ],
    region: "Sud Marocain",
    pays: "Maroc",
  },
  "atlas-atlantique": {
    id: "atlas-atlantique",
    titre: "De l'Atlas à l'Atlantique",
    sousTitre: "Des sommets aux vagues d'Essaouira",
    description: "Des sommets enneigés de l'Atlas jusqu'aux vagues d'Essaouira. Une aventure complète à travers tous les paysages marocains.",
    image: marocCanyonCavaliers,
    niveau: "Confirmé",
    duree: "8 jours / 7 nuits",
    prixFrom: 1480,
    rating: 4.8,
    inclusions: ["Hébergement varié", "Pension complète", "2 guides", "Galops sur plage"],
    creneaux: [
      { id: "cr10", dateDebut: "2026-09-05", dateFin: "2026-09-13", nuites: 8, tarif: 1480, placesDisponibles: 6 },
      { id: "cr11", dateDebut: "2026-10-03", dateFin: "2026-10-11", nuites: 8, tarif: 1580, placesDisponibles: 4 },
    ],
    region: "Atlas & Côte",
    pays: "Maroc",
  },
  "ecosse": {
    id: "ecosse",
    titre: "Highlands à Cheval",
    sousTitre: "Châteaux mystérieux et lochs brumeux",
    description: "Galopez à travers les Highlands légendaires, entre châteaux mystérieux, lochs brumeux et landes à perte de vue.",
    image: ecosseHighlandsCavaliers,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    rating: 4.9,
    inclusions: ["B&B typiques", "Pension complète", "Guide écossais", "Whisky inclus"],
    creneaux: [],
    region: "Écosse",
    pays: "Europe",
  },
  "mongolie": {
    id: "mongolie",
    titre: "Steppes de Mongolie",
    sousTitre: "Vivez comme un nomade dans l'immensité",
    description: "Yourtes traditionnelles, troupeaux sauvages et hospitalité mongole. Une expérience unique au cœur de l'Asie centrale.",
    image: mongolieSteppesCavaliers,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    rating: 5.0,
    inclusions: ["Yourtes traditionnelles", "Pension nomade", "Guide mongol", "Chevaux locaux"],
    creneaux: [],
    region: "Mongolie",
    pays: "Asie",
  },
  "jordanie": {
    id: "jordanie",
    titre: "Jordanie - Wadi Rum",
    sousTitre: "Chevauchée dans le désert de Lawrence",
    description: "Explorez les paysages lunaires du Wadi Rum, campez sous les étoiles et découvrez Pétra à cheval.",
    image: jordanieWadiRumCavaliers,
    niveau: "Confirmé",
    duree: "Sur demande",
    prixFrom: null,
    rating: 4.9,
    inclusions: ["Camps bédouins", "Pension complète", "Guide local", "Visite Pétra"],
    creneaux: [],
    region: "Jordanie",
    pays: "Asie",
  },
};

const FicheSejour = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, openCart } = useCartStore();
  const [selectedCreneau, setSelectedCreneau] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const sejour = slug ? sejoursData[slug] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!sejour) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Séjour non trouvé</h1>
            <Button onClick={() => navigate("/destinations")}>
              Retour aux destinations
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const images = sejour.images || [sejour.image];
  const selectedCreneauData = sejour.creneaux.find(c => c.id === selectedCreneau);

  const handleAddToCart = () => {
    if (!selectedCreneauData && sejour.creneaux.length > 0) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    addItem({
      id: sejour.id,
      type: "sejour",
      title: sejour.titre,
      subtitle: sejour.sousTitre,
      location: `${sejour.region}, ${sejour.pays}`,
      duration: sejour.duree,
      image: sejour.image,
      price: selectedCreneauData?.tarif || sejour.prixFrom || 0,
      startDate: selectedCreneauData?.dateDebut,
      endDate: selectedCreneauData?.dateFin,
      slotId: selectedCreneauData?.id,
      ridingLevel: sejour.niveau,
    });

    toast.success("Séjour ajouté au panier !");
  };

  const handleQuickReserve = () => {
    const params = new URLSearchParams();
    params.set("sejour", sejour.titre);
    if (selectedCreneauData) {
      params.set("date", selectedCreneauData.dateDebut);
    }
    navigate(`/demande-devis?${params.toString()}`);
  };

  const niveauColor = {
    "Tous niveaux": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Intermédiaire": "bg-amber-500/10 text-amber-700 border-amber-500/30",
    "Confirmé": "bg-rose-500/10 text-rose-700 border-rose-500/30",
  }[sejour.niveau] || "bg-muted text-muted-foreground";

  return (
    <Layout>
      <SEOHead
        title={`${sejour.titre} - Randonnée Équestre ${sejour.region}`}
        description={sejour.description}
        canonicalUrl={`/sejour/${sejour.id}`}
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
                <BreadcrumbPage>{sejour.titre}</BreadcrumbPage>
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
                  alt={sejour.titre}
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
                  <Badge className={`${niveauColor} border`}>
                    {sejour.niveau}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1.5 bg-foreground/80 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold">{sejour.rating}</span>
                  </div>
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
                  {sejour.region}, {sejour.pays}
                </p>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {sejour.titre}
                </h1>
                {sejour.sousTitre && (
                  <p className="text-muted-foreground text-lg italic">{sejour.sousTitre}</p>
                )}
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                  <Clock className="h-4 w-4" />
                  {sejour.duree}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                  <MapPin className="h-4 w-4" />
                  {sejour.region}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                  <Users className="h-4 w-4" />
                  {sejour.niveau}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <p className="text-muted-foreground leading-relaxed">
                  {sejour.descriptionLongue || sejour.description}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                {sejour.prixFrom ? (
                  <>
                    <span className="text-sm text-muted-foreground">À partir de</span>
                    <span className="text-4xl font-bold text-primary">
                      {sejour.prixFrom.toLocaleString("fr-FR")}€
                    </span>
                    <span className="text-muted-foreground">/personne</span>
                  </>
                ) : (
                  <span className="text-xl font-medium text-muted-foreground">Prix sur demande</span>
                )}
              </div>

              {/* Dates Selection */}
              {sejour.creneaux.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      Dates disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sejour.creneaux.map((creneau) => (
                        <button
                          key={creneau.id}
                          onClick={() => setSelectedCreneau(creneau.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            selectedCreneau === creneau.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <div className="text-left">
                            <span className="font-medium">
                              {new Date(creneau.dateDebut).toLocaleDateString("fr-FR", { 
                                day: "numeric", 
                                month: "long" 
                              })} - {new Date(creneau.dateFin).toLocaleDateString("fr-FR", { 
                                day: "numeric", 
                                month: "long", 
                                year: "numeric" 
                              })}
                            </span>
                            <span className="text-sm text-muted-foreground block">
                              {creneau.placesDisponibles} place{creneau.placesDisponibles > 1 ? "s" : ""} disponible{creneau.placesDisponibles > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-primary">{creneau.tarif}€</span>
                            {selectedCreneau === creneau.id && (
                              <Check className="h-5 w-5 text-primary inline-block ml-2" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={sejour.creneaux.length > 0 && !selectedCreneau}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Ajouter au panier
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="flex-1"
                  onClick={handleQuickReserve}
                >
                  Demander un devis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Inclusions / Exclusions */}
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Inclus dans le séjour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {sejour.inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {sejour.exclusions && sejour.exclusions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    Non inclus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {sejour.exclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Requirements */}
          {sejour.requirements && sejour.requirements.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Prérequis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {sejour.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Back button */}
          <div className="mt-12">
            <Button variant="outline" onClick={() => navigate("/destinations")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux destinations
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FicheSejour;
