import { useState } from 'react';
import { Layout } from "@/components/layout/Layout";
import { 
  HeartPulse, 
  Shirt, 
  Dumbbell, 
  Map, 
  CheckSquare, 
  AlertTriangle,
  FileText,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const PreparerVoyage = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const contentData = {
    admin: {
      title: "Administratif & Sécurité",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-primary/10 text-primary",
      sections: [
        {
          title: "Documents Officiels",
          items: [
            "Passeport : Valide impérativement 6 mois APRÈS la date de retour (Maroc/Mongolie).",
            "Visa : Vérifiez les exemptions (Français exemptés < 30 jours Mongolie - à reconfirmer selon l'année, exemptés Maroc).",
            "Photocopies : 2 jeux de copies (Passeport + Assurance). Un jeu dans la valise, un jeu sur vous. + 1 copie Cloud (Drive/Dropbox).",
            "Argent : Prévoir du cash (Euros et monnaie locale) en petites coupures pour les pourboires et zones reculées."
          ]
        },
        {
          title: "Assurances Spécifiques",
          items: [
            "RC (Responsabilité Civile) : Vérifiez qu'elle couvre les dommages causés par un animal (cheval) loué.",
            "Assurance Rapatriement : C'est le point CRITIQUE. Vérifiez la clause 'Recherche et Secours' (Frais d'hélicoptère).",
            "Exclusions : Attention aux clauses excluant les 'sports à risque' ou la 'compétition' (même si rando).",
            "Contact d'urgence : Numéro de la police d'assurance enregistré dans le téléphone sous 'ICE' (In Case of Emergency)."
          ]
        }
      ]
    },
    sante: {
      title: "Santé & Hygiène",
      icon: <HeartPulse className="w-6 h-6" />,
      color: "bg-destructive/10 text-destructive",
      sections: [
        {
          title: "Vaccination & Prévention",
          items: [
            "Tétanos : À jour OBLIGATOIRE (risque élevé avec les chevaux/sol).",
            "Rage : Recommandé pour la Mongolie (chiens errants, animaux sauvages).",
            "Hépatite A & Typhoïde : Fortement recommandé (alimentation/eau).",
            "Eau : Ne JAMAIS boire l'eau du robinet ou des rivières sans traitement (Micropur Forte ou filtre)."
          ]
        },
        {
          title: "Trousse de Secours (La vraie)",
          items: [
            "Désinfectant (Bétadine ou Chlorexidine).",
            "Pansements 'Seconde Peau' (Compeed) : Gros stock, tailles variées.",
            "Bandes cohésives (type Co-Plus) : Pour entorse ou maintien pansement.",
            "Antalgiques : Paracétamol (douleur) + Ibuprofène (inflammatoire).",
            "Digestif : Lopéramide (Imodium) + Racécadotril (Tiorfan) + Antibiotique spectre large intestinal (sur ordonnance).",
            "Réhydratation : Sachets SRO (Sels de Réhydratation Orale) - Vital en cas de diarrhée sévère ou coup de chaleur.",
            "Collyre : Sérum physiologique (poussière, sable)."
          ]
        }
      ]
    },
    physique: {
      title: "Préparation Physique",
      icon: <Dumbbell className="w-6 h-6" />,
      color: "bg-accent/20 text-accent-foreground",
      intro: "La randonnée n'est pas une promenade. C'est un sport d'endurance. Commencez 8 semaines avant.",
      sections: [
        {
          title: "Les 3 Piliers",
          items: [
            "Le Cardio (Cœur) : Pour tenir le rythme et l'altitude (Mongolie/Atlas). Marche rapide, vélo ou natation 2x/semaine.",
            "Les Adducteurs (Intérieur cuisse) : Pour éviter les courbatures atroces du J2. Exercice : Serrer un ballon entre les genoux.",
            "Le Gainage (Dos/Abdos) : Votre dos souffre des chocs. Des abdos solides protègent vos vertèbres. Planche : 3x 1min tous les jours."
          ]
        },
        {
          title: "Gestion de l'effort sur place",
          items: [
            "Étirements : Tous les soirs au bivouac (quadriceps, dos, mollets).",
            "Marche à pied : Descendre du cheval 15 min toutes les 2-3 heures pour rétablir la circulation sanguine.",
            "Hydratation : Boire AVANT d'avoir soif. L'urine doit rester claire."
          ]
        }
      ]
    },
    equipement: {
      title: "Équipement Cavalier",
      icon: <Shirt className="w-6 h-6" />,
      color: "bg-secondary text-secondary-foreground",
      sections: [
        {
          title: "La Tête",
          items: [
            "Casque (Bombe) : Modèle très aéré (type endurance). Obligatoire pour la sécurité.",
            "Lunettes : Catégorie 3 ou 4. Forme enveloppante (vent/poussière). Cordon d'attache indispensable.",
            "Protection cou/visage : Chèche (Désert) ou Buff (Bretagne/Mongolie)."
          ]
        },
        {
          title: "Le Corps (Système 3 couches)",
          items: [
            "Couche 1 (Peau) : T-shirt technique ou laine Mérinos (Zéro coton qui garde le froid quand mouillé).",
            "Couche 2 (Chaleur) : Polaire ou micro-doudoune.",
            "Couche 3 (Protection) : Veste coupe-vent imperméable respirante (Gore-Tex).",
            "Pantalon : Culotte de cheval confortable (déjà portée et lavée plusieurs fois). Éviter les jeans (coutures blessantes)."
          ]
        },
        {
          title: "Les Pieds & Mains",
          items: [
            "Chaussures : Boots de randonnée équestre ou chaussures de marche + Mini-chaps. Semelle crantée pour marcher, talon pour l'étrier.",
            "Chaussettes : Techniques (anti-ampoules). En prendre une paire propre par jour.",
            "Gants : Indispensables pour tenir les rênes longtemps sans brûlures."
          ]
        }
      ]
    },
    destinations: {
      title: "Spécificités Terrain",
      icon: <Map className="w-6 h-6" />,
      color: "bg-muted text-muted-foreground",
      sections: [
        {
          title: "🌊 Bretagne (Climat Océanique)",
          items: [
            "Ennemi : La pluie insidieuse et le vent.",
            "Must-Have : Un long manteau de pluie fendu (type Australien) ou un large poncho couvrant les sacoches.",
            "Terrain : Plages (sable dur/mou), sentiers côtiers, dénivelé moyen.",
            "Conseil : Attention aux horaires des marées pour les galops sur plage."
          ]
        },
        {
          title: "🏜️ Maroc (Désert/Atlas)",
          items: [
            "Ennemi : Le soleil zénithal et l'amplitude thermique (chaud jour / froid nuit).",
            "Must-Have : Sac de couchage confort 0°C (nuits glaciales), Chèche coton long (3m).",
            "Terrain : Reg (cailloux), Erg (dunes), Montagne.",
            "Conseil : Secouez vos chaussures le matin (scorpions)."
          ]
        },
        {
          title: "🐎 Mongolie (Steppes)",
          items: [
            "Ennemi : La rusticité et le changement météo brutal (4 saisons en 1 jour).",
            "Must-Have : Dessus de selle en mouton ou gel (selles en bois très dures), étriers souvent courts.",
            "Terrain : Steppes infinies, terriers de marmottes (danger !).",
            "Conseil : Ne jamais approcher un cheval par derrière, les chevaux mongols sont semi-sauvages."
          ]
        }
      ]
    }
  };

  const navItems = [
    { id: 'admin', label: 'Administratif', icon: <FileText className="w-5 h-5" /> },
    { id: 'sante', label: 'Santé & Hygiène', icon: <HeartPulse className="w-5 h-5" /> },
    { id: 'physique', label: 'Prép. Physique', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'equipement', label: 'Équipement', icon: <Shirt className="w-5 h-5" /> },
    { id: 'destinations', label: 'Destinations', icon: <Map className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    const data = contentData[activeTab as keyof typeof contentData];
    return (
      <div className="animate-in fade-in duration-300">
        <header className="mb-6 border-b border-border pb-4">
          <div className={`inline-flex p-3 rounded-xl ${data.color} mb-3`}>
            {data.icon}
          </div>
          <h2 className="text-3xl font-serif font-bold text-foreground">{data.title}</h2>
          {'intro' in data && data.intro && (
            <p className="mt-2 text-muted-foreground italic">{data.intro}</p>
          )}
        </header>
        
        <div className="grid gap-6">
          {data.sections.map((section, idx) => (
            <div key={idx} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-muted px-6 py-4 border-b border-border flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <h3 className="font-bold text-lg text-card-foreground">{section.title}</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start text-muted-foreground leading-relaxed">
                      <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const NavItem = ({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );

  const SidebarContent = () => (
    <>
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
        ))}
      </nav>

      <div className="bg-accent/20 p-4 rounded-xl border border-accent/30">
        <div className="flex items-center gap-2 text-accent-foreground font-bold text-sm mb-2">
          <AlertTriangle className="w-4 h-4" /> Conseil Vital
        </div>
        <p className="text-xs text-muted-foreground leading-tight">
          "Le confort du cavalier fait la santé du cheval." Un cavalier qui a mal au dos pèse lourd sur sa monture.
        </p>
      </div>
    </>
  );

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/src/assets/maroc-dunes-cavaliers.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-4">
            Préparer Votre Voyage
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Guide complet pour randonneurs équestres • Bretagne | Maroc | Mongolie
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Menu className="w-5 h-5" />
                    <span>Navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <div className="flex flex-col gap-6 mt-6">
                    <SidebarContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col gap-6 sticky top-24 h-fit">
              <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              <div className="max-w-4xl">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PreparerVoyage;
