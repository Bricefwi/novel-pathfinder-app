import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Users, Clock, Euro } from "lucide-react";
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

// Import real images
import cavaliersPlageCoucherSoleil from "@/assets/cavaliers-plage-coucher-soleil.jpg";
import bretagnVillageChevaux from "@/assets/bretagne-village-chevaux.jpg";
import marocDunesCavaliers from "@/assets/maroc-dunes-cavaliers.jpg";
import marocCavalierCote from "@/assets/maroc-cavalier-cote.jpg";
import korrigansForetChevaux from "@/assets/korrigans-foret-chevaux.jpg";
import marocCanyonCavaliers from "@/assets/maroc-canyon-cavaliers.jpg";
import marocDesertNuages from "@/assets/maroc-desert-nuages.jpg";
import marocEssaouiraBateau from "@/assets/maroc-essaouira-bateau.jpg";

// Données des randonnées basées sur le site original
const destinations = [
  // France - Bretagne
  {
    id: "bretagne-romantique-1",
    pays: "France",
    region: "Bretagne",
    designation: "Bretagne Romantique",
    niveau: "Tous niveaux",
    debut: "07/05/2026",
    fin: "11/05/2026",
    nuites: 4,
    joursCheval: 4,
    tarif: 680,
    places: 2,
    image: cavaliersPlageCoucherSoleil,
  },
  {
    id: "bretagne-romantique-2",
    pays: "France",
    region: "Bretagne",
    designation: "Bretagne Romantique",
    niveau: "Tous niveaux",
    debut: "13/05/2026",
    fin: "17/05/2026",
    nuites: 4,
    joursCheval: 4,
    tarif: 680,
    places: 2,
    image: cavaliersPlageCoucherSoleil,
  },
  {
    id: "bretagne-romantique-3",
    pays: "France",
    region: "Bretagne",
    designation: "Bretagne Romantique",
    niveau: "Tous niveaux",
    debut: "22/05/2026",
    fin: "24/05/2026",
    nuites: 2,
    joursCheval: 2,
    tarif: 480,
    places: 2,
    image: cavaliersPlageCoucherSoleil,
  },
  {
    id: "terre-mer-1",
    pays: "France",
    region: "Bretagne",
    designation: "De la Terre à la Mer",
    niveau: "Intermédiaire",
    debut: "09/08/2026",
    fin: "15/08/2026",
    nuites: 6,
    joursCheval: 5,
    tarif: 1190,
    places: null,
    image: bretagnVillageChevaux,
  },
  {
    id: "terre-mer-2",
    pays: "France",
    region: "Bretagne",
    designation: "De la Terre à la Mer",
    niveau: "Intermédiaire",
    debut: "16/08/2026",
    fin: "22/08/2026",
    nuites: 6,
    joursCheval: 5,
    tarif: 1190,
    places: null,
    image: bretagnVillageChevaux,
  },
  // France - Vosges
  {
    id: "vosges-1",
    pays: "France",
    region: "Vosges",
    designation: "Chevauchée des Vosges",
    niveau: "Intermédiaire",
    debut: "12/04/2026",
    fin: "16/04/2026",
    nuites: 5,
    joursCheval: 5,
    tarif: 950,
    places: null,
    image: korrigansForetChevaux,
  },
  // Maroc
  {
    id: "maroc-sahara",
    pays: "Maroc",
    region: "Maroc",
    designation: "Les Portes du Sahara",
    niveau: "Confirmé",
    debut: "22/03/2026",
    fin: "29/03/2026",
    nuites: 7,
    joursCheval: 6,
    tarif: 1780,
    places: null,
    image: marocDunesCavaliers,
  },
  {
    id: "maroc-desert-oasis",
    pays: "Maroc",
    region: "Maroc",
    designation: "Entre désert et oasis",
    niveau: "Confirmé",
    debut: "29/03/2026",
    fin: "05/04/2026",
    nuites: 7,
    joursCheval: 6,
    tarif: 1480,
    places: null,
    image: marocDesertNuages,
  },
  {
    id: "maroc-atlas-1",
    pays: "Maroc",
    region: "Maroc",
    designation: "De l'Atlas à l'Atlantique",
    niveau: "Confirmé",
    debut: "31/05/2026",
    fin: "07/06/2026",
    nuites: 7,
    joursCheval: 5.5,
    tarif: 1480,
    places: null,
    image: marocCanyonCavaliers,
  },
  {
    id: "maroc-atlas-2",
    pays: "Maroc",
    region: "Maroc",
    designation: "De l'Atlas à l'Atlantique",
    niveau: "Confirmé",
    debut: "26/07/2026",
    fin: "02/08/2026",
    nuites: 7,
    joursCheval: 5.5,
    tarif: 1480,
    places: null,
    image: marocEssaouiraBateau,
  },
  // Europe - Ecosse
  {
    id: "ecosse",
    pays: "Europe",
    region: "Écosse",
    designation: "Highlands à cheval",
    niveau: "Confirmé",
    debut: "À définir",
    fin: "À définir",
    nuites: null,
    joursCheval: null,
    tarif: null,
    places: null,
    image: korrigansForetChevaux,
  },
  // Asie - Mongolie
  {
    id: "mongolie",
    pays: "Asie",
    region: "Mongolie",
    designation: "Steppes de Mongolie",
    niveau: "Confirmé",
    debut: "À définir",
    fin: "À définir",
    nuites: null,
    joursCheval: null,
    tarif: null,
    places: null,
    image: marocCavalierCote,
  },
];

// Grouper les destinations par pays
const groupedDestinations = destinations.reduce((acc, dest) => {
  if (!acc[dest.pays]) {
    acc[dest.pays] = [];
  }
  acc[dest.pays].push(dest);
  return acc;
}, {} as Record<string, typeof destinations>);

const Destinations = () => {
  return (
    <Layout>
      <SEOHead {...seoConfigs.destinations} />
      
      {/* Hero - Bellevoire style */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
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
            Calendrier des Randonnées 2026
          </h1>
          <p className="text-primary-foreground/90 text-lg md:text-xl max-w-2xl mx-auto animate-fade-in drop-shadow">
            De la Bretagne romantique aux dunes du Maroc, planifiez votre prochaine aventure équestre.
          </p>
        </div>
      </section>

      {/* Tableau des destinations */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          
          {/* Info badges */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center">
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Dates 2026</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>France, Maroc, Europe, Asie</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Petits groupes</span>
            </Badge>
          </div>

          {/* Tableau par pays */}
          {Object.entries(groupedDestinations).map(([pays, randos]) => (
            <div key={pays} className="mb-12">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                <MapPin className="h-6 w-6 text-primary" />
                {pays}
              </h2>
              
              {/* Version desktop - Tableau */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[80px]">Photo</TableHead>
                      <TableHead>Région</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead className="text-center">Nuitées</TableHead>
                      <TableHead className="text-center">Jours à cheval</TableHead>
                      <TableHead className="text-right">Tarif</TableHead>
                      <TableHead className="text-center">Places</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {randos.map((rando) => (
                      <TableRow key={rando.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="w-16 h-12 rounded-lg overflow-hidden">
                            <img 
                              src={rando.image} 
                              alt={rando.designation}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {rando.region}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {rando.designation}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={rando.niveau === "Tous niveaux" ? "default" : rando.niveau === "Intermédiaire" ? "secondary" : "outline"}
                            className="whitespace-nowrap"
                          >
                            {rando.niveau}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{rando.debut}</TableCell>
                        <TableCell className="text-muted-foreground">{rando.fin}</TableCell>
                        <TableCell className="text-center">{rando.nuites ?? "-"}</TableCell>
                        <TableCell className="text-center">{rando.joursCheval ?? "-"}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {rando.tarif ? `${rando.tarif.toLocaleString("fr-FR")} €` : "Sur demande"}
                        </TableCell>
                        <TableCell className="text-center">
                          {rando.places !== null ? (
                            <Badge variant={rando.places <= 2 ? "destructive" : "default"}>
                              {rando.places}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link to="/demande-devis">
                            <Button size="sm" variant="ghost" className="group">
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Version mobile - Cartes */}
              <div className="md:hidden space-y-4">
                {randos.map((rando) => (
                  <article 
                    key={rando.id} 
                    className="bg-card rounded-xl border border-border overflow-hidden"
                  >
                    <div className="flex">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img 
                          src={rando.image} 
                          alt={rando.designation}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">{rando.region}</p>
                            <h3 className="font-semibold text-foreground">{rando.designation}</h3>
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {rando.niveau}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {rando.debut}
                          </span>
                          {rando.nuites && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rando.nuites} nuits
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-bold text-primary">
                            {rando.tarif ? `${rando.tarif.toLocaleString("fr-FR")} €` : "Sur demande"}
                          </span>
                          <Link to="/demande-devis">
                            <Button size="sm">Réserver</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
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
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Durée flexible</h3>
              <p className="text-muted-foreground text-sm">
                De 2 jours à plusieurs semaines selon vos envies
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Tout compris</h3>
              <p className="text-muted-foreground text-sm">
                Hébergement, repas et encadrement inclus
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Vous ne trouvez pas votre bonheur ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Contactez-nous pour organiser une randonnée sur mesure adaptée à vos envies.
          </p>
          <Link to="/demande-devis">
            <Button size="lg" className="group">
              Demander un devis personnalisé
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Destinations;
