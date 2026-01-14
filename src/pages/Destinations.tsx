import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Calendar, Users, Euro, Compass, Star, Clock, Check, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead, seoConfigs } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
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

// Import real images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCavalierCote from "@/assets/maroc-cavalier-cote.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";
import ecosseHighlandsCavaliers from "@/assets/ecosse-highlands-cavaliers.jpg";
import mongolieSteppesCavaliers from "@/assets/mongolie-steppes-cavaliers.jpg";
import jordanieWadiRumCavaliers from "@/assets/jordanie-wadi-rum-cavaliers.jpg";

interface Creneau {
  dateDebut: string;
  dateFin: string;
  nuites: number;
  tarif: number;
  placesDisponibles: number;
}

interface Sejour {
  id: string;
  titre: string;
  sousTitre?: string;
  description: string;
  image: string;
  niveau: string;
  duree: string;
  prixFrom: number | null;
  rating: number;
  inclusions: string[];
  creneaux: Creneau[];
}

interface Region {
  nom: string;
  description: string;
  image: string;
  sejours: Sejour[];
}

interface Pays {
  nom: string;
  description: string;
  image: string;
  regions: Region[];
}

// Structure des destinations par arborescence : Pays > Région > Séjours
const destinations: Pays[] = [
  {
    nom: "France",
    description: "Randonnées équestres au cœur des plus beaux paysages français, de la Bretagne sauvage aux Vosges majestueuses.",
    image: cavaliersPlageCoucherSoleil,
    regions: [
      {
        nom: "Bretagne",
        description: "Côtes sauvages, forêts légendaires et landes mystérieuses vous attendent pour des chevauchées inoubliables.",
        image: bretagnVillageChevaux,
        sejours: [
          {
            id: "bretagne-romantique",
            titre: "Bretagne Romantique",
            sousTitre: "Une escapade entre châteaux et forêts enchantées",
            description: "Découvrez les châteaux et forêts légendaires de Bretagne lors d'une randonnée de 3 à 5 jours. Entre landes sauvages et patrimoine historique.",
            image: cavaliersPlageCoucherSoleil,
            niveau: "Tous niveaux",
            duree: "4 jours",
            prixFrom: 680,
            rating: 4.9,
            inclusions: ["Hébergement en gîte", "Pension complète", "Guide accompagnateur", "Matériel équestre"],
            creneaux: [
              { dateDebut: "07/05/2026", dateFin: "11/05/2026", nuites: 4, tarif: 680, placesDisponibles: 4 },
              { dateDebut: "21/05/2026", dateFin: "25/05/2026", nuites: 4, tarif: 680, placesDisponibles: 2 },
              { dateDebut: "04/06/2026", dateFin: "08/06/2026", nuites: 4, tarif: 720, placesDisponibles: 6 },
            ],
          },
          {
            id: "terre-mer",
            titre: "De la Terre à la Mer",
            sousTitre: "Une traversée épique de l'intérieur aux rivages",
            description: "Traversée de la Bretagne intérieure jusqu'aux rivages atlantiques. Galops sur les plages et bivouacs sous les étoiles bretonnes.",
            image: bretagnVillageChevaux,
            niveau: "Intermédiaire",
            duree: "6 jours",
            prixFrom: 1190,
            rating: 4.8,
            inclusions: ["Hébergement varié", "Pension complète", "Guide expert", "Transferts inclus"],
            creneaux: [
              { dateDebut: "15/06/2026", dateFin: "21/06/2026", nuites: 6, tarif: 1190, placesDisponibles: 3 },
              { dateDebut: "12/07/2026", dateFin: "18/07/2026", nuites: 6, tarif: 1290, placesDisponibles: 5 },
            ],
          },
        ],
      },
      {
        nom: "Vosges",
        description: "Crêtes majestueuses, forêts de sapins et panoramas exceptionnels sur la plaine d'Alsace.",
        image: korrigansForetChevaux,
        sejours: [
          {
            id: "vosges",
            titre: "Chevauchée des Vosges",
            sousTitre: "Les crêtes et les forêts de sapins",
            description: "Parcourez les crêtes vosgiennes à travers forêts de sapins et chaumes d'altitude. Panoramas exceptionnels sur la plaine d'Alsace.",
            image: korrigansForetChevaux,
            niveau: "Intermédiaire",
            duree: "5 jours",
            prixFrom: 950,
            rating: 4.7,
            inclusions: ["Hébergement en ferme-auberge", "Pension complète", "Guide local", "Matériel fourni"],
            creneaux: [
              { dateDebut: "20/07/2026", dateFin: "25/07/2026", nuites: 5, tarif: 950, placesDisponibles: 4 },
              { dateDebut: "17/08/2026", dateFin: "22/08/2026", nuites: 5, tarif: 990, placesDisponibles: 6 },
            ],
          },
        ],
      },
    ],
  },
  {
    nom: "Maroc",
    description: "Des dunes dorées du Sahara aux sommets de l'Atlas, vivez l'aventure marocaine à cheval.",
    image: marocDunesCavaliers,
    regions: [
      {
        nom: "Sud Marocain",
        description: "Dunes mythiques, oasis verdoyantes et nuits étoilées au cœur du désert.",
        image: marocDesertNuages,
        sejours: [
          {
            id: "portes-sahara",
            titre: "Les Portes du Sahara",
            sousTitre: "Chevauchée mythique aux portes du désert",
            description: "Dunes dorées, oasis verdoyantes et nuits sous les étoiles du Sahara. Une immersion totale dans le grand Sud marocain.",
            image: marocDunesCavaliers,
            niveau: "Confirmé",
            duree: "7 jours",
            prixFrom: 1780,
            rating: 5.0,
            inclusions: ["Bivouac & Riad", "Pension complète", "Guide berbère", "Dromadaires de soutien"],
            creneaux: [
              { dateDebut: "10/10/2026", dateFin: "17/10/2026", nuites: 7, tarif: 1780, placesDisponibles: 6 },
              { dateDebut: "07/11/2026", dateFin: "14/11/2026", nuites: 7, tarif: 1780, placesDisponibles: 4 },
            ],
          },
          {
            id: "desert-oasis",
            titre: "Entre Désert et Oasis",
            sousTitre: "Un voyage entre sable et verdure",
            description: "Des palmeraies luxuriantes aux ergs majestueux. L'essence du Maroc authentique entre contrastes et rencontres inoubliables.",
            image: marocDesertNuages,
            niveau: "Confirmé",
            duree: "7 jours",
            prixFrom: 1480,
            rating: 4.9,
            inclusions: ["Hébergement traditionnel", "Pension complète", "Guide francophone", "Chevaux barbes"],
            creneaux: [
              { dateDebut: "24/10/2026", dateFin: "31/10/2026", nuites: 7, tarif: 1480, placesDisponibles: 5 },
            ],
          },
        ],
      },
      {
        nom: "Atlas & Côte",
        description: "Des sommets enneigés de l'Atlas aux plages d'Essaouira, une traversée spectaculaire.",
        image: marocCanyonCavaliers,
        sejours: [
          {
            id: "atlas-atlantique",
            titre: "De l'Atlas à l'Atlantique",
            sousTitre: "Des sommets aux vagues d'Essaouira",
            description: "Des sommets enneigés de l'Atlas jusqu'aux vagues d'Essaouira. Une aventure complète à travers tous les paysages marocains.",
            image: marocCanyonCavaliers,
            niveau: "Confirmé",
            duree: "8 jours",
            prixFrom: 1480,
            rating: 4.8,
            inclusions: ["Hébergement varié", "Pension complète", "2 guides", "Galops sur plage"],
            creneaux: [
              { dateDebut: "05/09/2026", dateFin: "13/09/2026", nuites: 8, tarif: 1480, placesDisponibles: 6 },
              { dateDebut: "03/10/2026", dateFin: "11/10/2026", nuites: 8, tarif: 1580, placesDisponibles: 4 },
            ],
          },
        ],
      },
    ],
  },
  {
    nom: "Europe",
    description: "Highlands écossais, steppes islandaises... Explorez les terres équestres européennes.",
    image: ecosseHighlandsCavaliers,
    regions: [
      {
        nom: "Écosse",
        description: "Châteaux mystérieux, lochs brumeux et landes à perte de vue.",
        image: ecosseHighlandsCavaliers,
        sejours: [
          {
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
          },
        ],
      },
    ],
  },
  {
    nom: "Asie",
    description: "Steppes mongoles, déserts jordaniens... Les grandes chevauchées d'Orient.",
    image: mongolieSteppesCavaliers,
    regions: [
      {
        nom: "Mongolie",
        description: "L'immensité des steppes, les yourtes traditionnelles et l'hospitalité nomade.",
        image: mongolieSteppesCavaliers,
        sejours: [
          {
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
          },
        ],
      },
      {
        nom: "Jordanie",
        description: "Les paysages lunaires du Wadi Rum et les merveilles de Pétra.",
        image: jordanieWadiRumCavaliers,
        sejours: [
          {
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
          },
        ],
      },
    ],
  },
];

// ==================== COMPOSANT CARTE PAYS (NIVEAU 1) ====================
const PaysCard = ({ 
  pays, 
  onClick 
}: { 
  pays: Pays; 
  onClick: () => void;
}) => {
  const totalSejours = pays.regions.reduce((acc, region) => acc + region.sejours.length, 0);
  
  return (
    <div 
      className="group cursor-pointer rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-card"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={pays.image}
          alt={pays.nom}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-primary-foreground mb-1">
            {pays.nom}
          </h3>
          <p className="text-primary-foreground/80 text-sm">
            {totalSejours} voyage{totalSejours > 1 ? "s" : ""} • {pays.regions.length} région{pays.regions.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {pays.description}
        </p>
        <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
          Explorer les régions
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT CARTE RÉGION (NIVEAU 2) ====================
const RegionCard = ({ 
  region, 
  paysNom,
  onClick 
}: { 
  region: Region;
  paysNom: string;
  onClick: () => void;
}) => {
  return (
    <div 
      className="group cursor-pointer rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-card"
      onClick={onClick}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={region.image}
          alt={region.nom}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-4 left-4">
          <Badge className="bg-primary text-primary-foreground text-xs tracking-wider">
            {paysNom.toUpperCase()}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="font-serif text-xl md:text-2xl font-bold text-primary-foreground">
            {region.nom}
          </h3>
        </div>
      </div>
      <div className="p-5">
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {region.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-medium text-sm">
            {region.sejours.length} voyage{region.sejours.length > 1 ? "s" : ""} disponible{region.sejours.length > 1 ? "s" : ""}
          </span>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT CARTE SÉJOUR (NIVEAU 3) ====================
const SejourCard = ({ 
  sejour, 
  region,
  pays 
}: { 
  sejour: Sejour; 
  region: string;
  pays: string;
}) => {
  const niveauColor = {
    "Tous niveaux": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "Intermédiaire": "bg-amber-500/10 text-amber-700 border-amber-500/30",
    "Confirmé": "bg-rose-500/10 text-rose-700 border-rose-500/30",
  }[sejour.niveau] || "bg-muted text-muted-foreground";

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Image section */}
        <div className="relative lg:w-2/5 aspect-[16/10] lg:aspect-auto lg:min-h-[320px] overflow-hidden">
          <img
            src={sejour.image}
            alt={sejour.titre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Badge niveau */}
          <div className="absolute top-4 left-4">
            <Badge className={`${niveauColor} border text-xs tracking-wider font-medium`}>
              {sejour.niveau.toUpperCase()}
            </Badge>
          </div>
          {/* Rating badge */}
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1.5 bg-foreground/80 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-lg">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-sm">{sejour.rating}</span>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col">
          <div className="flex-1">
            {/* Title */}
            <h3 className="font-serif text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {sejour.titre}
            </h3>

            {/* Subtitle */}
            {sejour.sousTitre && (
              <p className="text-muted-foreground italic mb-3">{sejour.sousTitre}</p>
            )}

            {/* Duration badge */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground"
              >
                <Clock className="h-4 w-4" />
                {sejour.duree}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              {sejour.description}
            </p>

            {/* Inclusions grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-6">
              {sejour.inclusions.map((inclusion, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground text-xs">
                    {inclusion}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau des créneaux */}
          {sejour.creneaux.length > 0 ? (
            <div className="border-t border-border pt-4">
              <h4 className="font-semibold text-foreground text-sm mb-3">Dates disponibles</h4>
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-xs font-semibold text-muted-foreground h-9 px-2">DATES</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground h-9 px-2 text-center">NUITÉES</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground h-9 px-2 text-center">TARIF</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground h-9 px-2 text-center">DISPO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sejour.creneaux.map((creneau, index) => (
                      <TableRow key={index} className="hover:bg-muted/50 border-border">
                        <TableCell className="text-xs text-foreground py-2 px-2 whitespace-nowrap">
                          {creneau.dateDebut} - {creneau.dateFin}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-2 px-2 text-center">
                          {creneau.nuites}
                        </TableCell>
                        <TableCell className="text-xs text-foreground py-2 px-2 text-center font-medium">
                          {creneau.tarif.toLocaleString("fr-FR")}€
                        </TableCell>
                        <TableCell className="text-xs py-2 px-2 text-center">
                          <span className={`font-medium ${creneau.placesDisponibles <= 2 ? "text-rose-600" : "text-emerald-600"}`}>
                            {creneau.placesDisponibles} place{creneau.placesDisponibles > 1 ? "s" : ""}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <Link to={`/demande-devis?sejour=${encodeURIComponent(sejour.titre)}`}>
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                    Voir les détails
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">Sur demande uniquement</p>
              <Link to={`/demande-devis?sejour=${encodeURIComponent(sejour.titre)}`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Demander un devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PAGE DESTINATIONS ====================
const Destinations = () => {
  const [view, setView] = useState<"pays" | "regions" | "sejours">("pays");
  const [selectedPays, setSelectedPays] = useState<Pays | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const handleSelectPays = (pays: Pays) => {
    setSelectedPays(pays);
    setSelectedRegion(null);
    setView("regions");
  };

  const handleSelectRegion = (region: Region) => {
    setSelectedRegion(region);
    setView("sejours");
  };

  const handleBackToPays = () => {
    setView("pays");
    setSelectedPays(null);
    setSelectedRegion(null);
  };

  const handleBackToRegions = () => {
    setView("regions");
    setSelectedRegion(null);
  };

  return (
    <Layout>
      <SEOHead {...seoConfigs.destinations} />
      
      {/* Hero */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marocCavalierCote})` }}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-medium mb-4 tracking-widest uppercase text-sm animate-fade-in">
            Nos destinations
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in drop-shadow-lg">
            Voyages Équestres
          </h1>
          <p className="text-primary-foreground/90 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in drop-shadow">
            De la Bretagne romantique aux dunes du Sahara, choisissez votre prochaine aventure à cheval.
          </p>
        </div>
      </section>

      {/* Breadcrumb navigation */}
      <section className="py-4 bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {view === "pays" ? (
                  <BreadcrumbPage>Toutes les destinations</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button onClick={handleBackToPays} className="hover:text-primary transition-colors">
                      Toutes les destinations
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {selectedPays && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {view === "regions" ? (
                      <BreadcrumbPage>{selectedPays.nom}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button onClick={handleBackToRegions} className="hover:text-primary transition-colors">
                          {selectedPays.nom}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </>
              )}
              {selectedRegion && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedRegion.nom}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          
          {/* ==================== VUE PAYS (NIVEAU 1) ==================== */}
          {view === "pays" && (
            <>
              <div className="text-center mb-10">
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Choisissez votre destination
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  4 pays, des paysages variés et des aventures équestres uniques vous attendent.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {destinations.map((pays) => (
                  <PaysCard 
                    key={pays.nom} 
                    pays={pays} 
                    onClick={() => handleSelectPays(pays)} 
                  />
                ))}
              </div>
            </>
          )}

          {/* ==================== VUE RÉGIONS (NIVEAU 2) ==================== */}
          {view === "regions" && selectedPays && (
            <>
              <div className="mb-8">
                <button 
                  onClick={handleBackToPays}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour aux destinations
                </button>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {selectedPays.nom}
                </h2>
                <p className="text-muted-foreground max-w-xl">
                  {selectedPays.description}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPays.regions.map((region) => (
                  <RegionCard 
                    key={region.nom} 
                    region={region} 
                    paysNom={selectedPays.nom}
                    onClick={() => handleSelectRegion(region)} 
                  />
                ))}
              </div>
            </>
          )}

          {/* ==================== VUE SÉJOURS (NIVEAU 3) ==================== */}
          {view === "sejours" && selectedPays && selectedRegion && (
            <>
              <div className="mb-8">
                <button 
                  onClick={handleBackToRegions}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à {selectedPays.nom}
                </button>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {selectedRegion.nom}
                </h2>
                <p className="text-muted-foreground max-w-xl">
                  {selectedRegion.description}
                </p>
              </div>
              <div className="space-y-8">
                {selectedRegion.sejours.map((sejour) => (
                  <SejourCard 
                    key={sejour.id} 
                    sejour={sejour}
                    region={selectedRegion.nom}
                    pays={selectedPays.nom}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section calendrier */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Calendrier des Randonnées 2026
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Consultez toutes les dates disponibles et réservez votre prochaine aventure.
          </p>
          <Link to="/planning">
            <Button size="lg" className="group">
              Voir le calendrier complet
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Légende & Informations */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Petits groupes</h3>
              <p className="text-muted-foreground text-sm">
                Maximum 8 cavaliers pour une expérience privilégiée
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Paiement flexible</h3>
              <p className="text-muted-foreground text-sm">
                Acompte de 20%, paiement en plusieurs fois possible
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Tout compris</h3>
              <p className="text-muted-foreground text-sm">
                Hébergement, repas et encadrement inclus
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Sur mesure */}
      <section className="py-24 bg-[#F5F0EB]">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary font-medium mb-4 tracking-widest uppercase text-sm">
            Voyage personnalisé
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
            Un séjour sur mesure ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Vous avez un projet particulier ? Un groupe à organiser ? Une destination de rêve ? 
            Nous créons votre voyage équestre sur mesure.
          </p>
          <Link to="/demande-devis">
            <Button size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              Demander un devis personnalisé
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;
