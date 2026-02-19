# Instructions Lovable - Ferme Equestre An Arwen

> Ce document contient les directives, regles et contexte pour guider Lovable lors de toute modification du projet **novel-pathfinder-app** (Ferme Equestre An Arwen - plateforme de tourisme equestre).

---

## 1. Contexte du Projet

### Description
Plateforme de reservation de sejours et activites equestres pour la **Ferme Equestre An Arwen**. Le site propose des destinations en France, Maroc, Europe et Asie avec un systeme de reservation, un espace admin complet (Control Tower), un carnet de voyage (blog), une galerie photo, et un systeme de chat communautaire.

### Public cible
- Cavaliers de tous niveaux (debutant a confirme)
- Familles et groupes souhaitant des sejours equestres
- Langue principale : francais, avec support multilingue (EN, ES, DE, AR)

### Ton et identite visuelle
- Ton : chaleureux, professionnel, nature/aventure
- Couleur primaire : Orange (`hsl(20 90% 48%)`)
- Couleur secondaire : Gris fonce (`hsl(0 0% 32%)`)
- Couleur accent : Jaune chaud (`hsl(47 100% 96%)`)
- Typographie titres : `Libre Caslon Text` (serif, elegance)
- Typographie corps : `Roboto` (sans-serif, lisibilite)
- Typographie code : `Roboto Mono` (monospace)

---

## 2. Stack Technique - NE PAS MODIFIER

### Framework et Build
- **React 18.3** avec **TypeScript 5.8**
- **Vite 5.4** avec plugin **SWC** (`@vitejs/plugin-react-swc`)
- **Path alias** : `@` pointe vers `./src`

### UI et Composants
- **shadcn/ui** comme bibliotheque de composants (28+ composants dans `src/components/ui/`)
- **Radix UI** pour les primitives accessibles (20+ packages)
- **Tailwind CSS 3.4** avec variables CSS HSL pour le theming
- **Lucide React 0.462** pour les icones (ne PAS utiliser d'autres bibliotheques d'icones)
- **Framer Motion 12** pour les animations
- **CVA** (Class Variance Authority) pour les variantes de composants

### Gestion d'Etat et Donnees
- **Zustand 5** avec middleware `persist` pour l'etat global (panier)
- **TanStack React Query 5** pour la gestion des donnees serveur
- **React Hook Form 7** + **Zod 3** pour les formulaires et la validation
- **React Context** pour le systeme de traduction

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions + Storage)
- **37 Edge Functions** Deno pour la logique metier
- **RLS** (Row-Level Security) sur toutes les tables

### Routing
- **React Router DOM 6** avec lazy loading (`React.lazy`) sur 21+ pages

### Autres Dependances Cles
- `date-fns` pour les dates
- `DOMPurify` pour la sanitisation HTML
- `Sonner` pour les notifications toast
- `React Helmet Async` pour le SEO
- `Recharts` pour les graphiques
- `FullCalendar` pour la gestion de planning
- `canvas-confetti` pour les celebrations
- `Embla Carousel` pour les carrousels

---

## 3. Architecture et Organisation des Fichiers

### Structure des dossiers
```
src/
  assets/          → Images, videos, ressources statiques
  components/      → Composants React organises par feature
    ui/            → Composants shadcn/ui (NE PAS modifier manuellement)
    admin/         → Module admin Control Tower
    [feature]/     → Composants par domaine fonctionnel
  config/          → Constantes de configuration
  contexts/        → React Contexts (TranslationContext)
  hooks/           → Custom hooks React
  integrations/    → Integration Supabase (client + types auto-generes)
  lib/             → Fonctions utilitaires
  pages/           → Composants de page (1 fichier = 1 route)
  stores/          → Stores Zustand
  types/           → Definitions TypeScript centralisees
```

### Regles d'organisation
- **Un composant par fichier**. Les fichiers de composants ne doivent contenir qu'un seul composant exporte par defaut.
- **Extraire les composants** si un fichier depasse 300 lignes. Creer des sous-composants dans le meme dossier.
- **Les hooks custom** vont dans `src/hooks/` avec le pattern `use[Feature].ts`.
- **Les types partages** vont dans `src/types/index.ts`.
- **Les utilitaires** vont dans `src/lib/`.
- **Ne jamais modifier** les fichiers dans `src/components/ui/` manuellement. Utiliser la CLI shadcn/ui.
- **Ne jamais modifier** les fichiers dans `src/integrations/supabase/` - ils sont auto-generes.

---

## 4. Conventions de Nommage

### Fichiers
| Type | Convention | Exemple |
|------|-----------|---------|
| Composants React | PascalCase | `DestinationCard.tsx` |
| Pages | PascalCase | `Destinations.tsx` |
| Hooks | camelCase prefixe `use` | `useActivities.ts` |
| Stores Zustand | camelCase + suffixe `Store` | `cartStore.ts` |
| Utilitaires | camelCase (kebab-case accepte) | `profile-utils.ts` |
| Types | PascalCase dans `types/index.ts` | `Activity`, `Booking` |

### Variables et Fonctions
| Type | Convention | Exemple |
|------|-----------|---------|
| Variables | camelCase | `selectedPays`, `isAdmin` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FILE_SIZE_MB` |
| Fonctions | camelCase | `handleSelectPays()` |
| Composants React | PascalCase | `<ReviewCard />` |
| Props interfaces | PascalCase + suffixe `Props` | `interface ReviewCardProps` |
| Handlers d'evenements | prefixe `handle` | `handleSubmit`, `handleDelete` |

### CSS / Tailwind
- Classes Tailwind en minuscules avec tirets : `bg-primary`, `flex-col`
- Variables CSS custom : `--kebab-case` (ex: `--sidebar-background`)
- **Toutes les couleurs en HSL** dans les variables CSS

---

## 5. Regles de Style de Code

### TypeScript
```typescript
// Composant fonctionnel avec interface Props
interface MonComposantProps {
  titre: string;
  children: React.ReactNode;
  onAction?: () => void;
}

const MonComposant = ({ titre, children, onAction }: MonComposantProps) => {
  // Hooks en premier
  const [state, setState] = useState(false);
  const { data } = useQuery({ ... });

  // Handlers
  const handleClick = () => { ... };

  // Rendu
  return (
    <div className="flex flex-col gap-4">
      ...
    </div>
  );
};

export default MonComposant;
```

### Regles strictes
- **Indentation** : 2 espaces (tabulation interdite)
- **Point-virgule** : obligatoire en fin de ligne
- **Arrow functions** pour les composants et handlers
- **Destructuration** des props dans la signature de la fonction
- **Pas de `any`** : toujours typer correctement. Utiliser `unknown` si necessaire.
- **Pas de class components** : uniquement des composants fonctionnels avec hooks
- **Imports** : utiliser l'alias `@/` pour tous les imports internes (ex: `import { Button } from "@/components/ui/button"`)

---

## 6. Regles de Styling avec Tailwind CSS

### Design System
- Utiliser **exclusivement les tokens de couleur semantiques** definis dans `index.css` :
  - `bg-primary`, `text-primary-foreground` (orange)
  - `bg-secondary`, `text-secondary-foreground` (gris fonce)
  - `bg-accent`, `text-accent-foreground` (jaune chaud)
  - `bg-destructive` (rouge, pour erreurs/suppressions)
  - `bg-muted` (gris, pour elements desactives)
  - `bg-card`, `bg-background`, `bg-popover` (fonds)
- **Ne jamais utiliser de couleurs Tailwind brutes** (`bg-red-500`, `text-blue-600`). Toujours utiliser les tokens semantiques.
- **Border radius** : utiliser `rounded-lg` (= `var(--radius)` = `0.75rem`) par defaut

### Responsive Design
- Approche **mobile-first** : styles par defaut pour mobile, puis breakpoints croissants
- Breakpoints : `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1400px)
- Toujours tester la responsivite sur les 3 tailles principales : mobile, tablette, desktop

### Dark Mode
- Le dark mode est supporte via la strategie `class`
- Utiliser les prefixes `dark:` pour les styles alternatifs
- Les tokens CSS gerer automatiquement le theming clair/sombre

### Animations
- Utiliser **Framer Motion** pour les animations complexes (transitions de page, apparitions)
- Utiliser les animations Tailwind (`animate-*`) pour les micro-interactions simples
- Garder les animations subtiles et performantes (privilegier `transform` et `opacity`)

---

## 7. Patterns de Donnees et Supabase

### Requetes avec React Query
```typescript
// Pattern standard pour un hook de donnees
export const useActivities = () => {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, activity_slots(*)")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
};
```

### Regles Supabase
- **Toujours verifier `error`** apres chaque requete Supabase
- Utiliser `maybeSingle()` pour les requetes qui peuvent retourner 0 ou 1 resultat
- Utiliser `single()` uniquement quand le resultat est garanti
- Les **query keys** suivent le format tableau : `["entite", filtre?]`
- **Ne jamais exposer** la cle service Supabase cote client
- Respecter le **RLS** : les requetes cote client passent par la cle anon/publishable

### Mutations
```typescript
const mutation = useMutation({
  mutationFn: async (data: InsertData) => {
    const { error } = await supabase.from("table").insert(data);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["table"] });
    toast.success("Operation reussie");
  },
  onError: () => {
    toast.error("Une erreur est survenue");
  },
});
```

### Tables principales
| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (niveau equestre, preferences) |
| `activities` | Sejours, cours, stages, randonnees, hebergements |
| `activity_slots` | Creneaux disponibles pour les activites |
| `bookings` | Reservations avec suivi de statut |
| `articles` | Articles du carnet de voyage |
| `testimonials` | Avis et temoignages clients |
| `gallery_photos` | Photos de la galerie |
| `contact_requests` | Messages du formulaire de contact |
| `favorites` | Favoris utilisateurs |
| `quotes_invoices` | Devis et factures |
| `chat_messages` | Messages du chat communautaire |
| `newsletter_subscriptions` | Abonnes newsletter |

---

## 8. Patterns de Composants

### Composant de Page
```typescript
// Chaque page suit ce pattern
import { SEOHead } from "@/components/SEOHead";
import Layout from "@/components/Layout";

const MaPage = () => {
  return (
    <Layout>
      <SEOHead
        title="Titre de la page"
        description="Description SEO"
        canonicalUrl="/ma-page"
      />
      {/* Contenu de la page */}
    </Layout>
  );
};

export default MaPage;
```

### Routing et Lazy Loading
```typescript
// Toujours utiliser React.lazy pour les nouvelles pages
const NouvellePage = React.lazy(() => import("./pages/NouvellePage"));

// Dans le Router, envelopper avec Suspense
<Suspense fallback={<div>Chargement...</div>}>
  <NouvellePage />
</Suspense>
```

### Formulaires
```typescript
// Pattern React Hook Form + Zod
const schema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().email("Email invalide"),
});

type FormData = z.infer<typeof schema>;

const MonFormulaire = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", email: "" },
  });

  const onSubmit = (data: FormData) => { ... };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="nom" render={...} />
      </form>
    </Form>
  );
};
```

### Store Zustand
```typescript
// Pattern Zustand avec persistence
interface MonState {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useMonStore = create<MonState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
    }),
    { name: "mon-store" }
  )
);
```

---

## 9. SEO et Accessibilite

### SEO
- **Chaque page** doit avoir un composant `<SEOHead>` avec titre, description et URL canonique
- Utiliser les balises Open Graph et Twitter Card via SEOHead
- Les titres de page suivent le format : `"Titre Page | Ferme Equestre An Arwen"`
- Ajouter des donnees structurees JSON-LD quand c'est pertinent
- Les slugs d'URL doivent etre en kebab-case et en francais

### Accessibilite (a11y)
- Utiliser les composants **Radix UI** qui gerent l'accessibilite nativement
- Toujours fournir un `aria-label` sur les boutons icone-only
- Les images doivent avoir un attribut `alt` descriptif
- Respecter la hierarchie des titres (`h1` > `h2` > `h3`, un seul `h1` par page)
- Les formulaires doivent avoir des labels associes a chaque champ

---

## 10. Securite

- **Sanitiser tout HTML dynamique** avec `DOMPurify` avant le rendu (`dangerouslySetInnerHTML`)
- **Ne jamais stocker de secrets** dans le code client
- Seules les variables `VITE_*` sont accessibles cote client
- **Valider toutes les entrees** cote client avec Zod ET cote serveur dans les Edge Functions
- Les operations sensibles (suppression, modification admin) doivent verifier le role via `has_role('admin')` en RLS
- Utiliser `encodeURIComponent` pour les parametres d'URL dynamiques

---

## 11. Performance

- **Lazy loading** obligatoire pour toutes les nouvelles pages (`React.lazy`)
- **Optimiser les images** : utiliser des formats modernes (WebP), ajouter `loading="lazy"` sur les images sous le fold
- **Eviter les re-renders** : utiliser `React.memo`, `useMemo`, `useCallback` quand necessaire
- **React Query staleTime** : configurer un `staleTime` adapte (5 min pour les donnees statiques, 0 pour les donnees temps reel)
- **Ne pas dupliquer les requetes** : centraliser les appels Supabase dans des hooks dedies

---

## 12. Gestion des Erreurs et Notifications

### Notifications (Toast)
```typescript
import { toast } from "sonner";

// Succes
toast.success("Reservation confirmee !");

// Erreur
toast.error("Impossible de charger les donnees.");

// Information
toast.info("Votre profil a ete mis a jour.");
```

### Gestion des erreurs
- Chaque appel API doit gerer les erreurs avec `try/catch` ou le pattern `.error` de Supabase
- Afficher un message utilisateur clair via `toast.error()` - jamais de messages techniques
- L'`ErrorBoundary` capture les erreurs de rendu non gerees
- Les messages d'erreur doivent etre en **francais**

---

## 13. Systeme de Traduction

- Le contexte `TranslationContext` gere la langue active
- Langues supportees : `fr` (defaut), `en`, `es`, `de`, `ar`
- L'arabe (`ar`) active automatiquement le mode RTL
- Les traductions sont mises en cache en memoire
- Les nouvelles traductions passent par l'Edge Function `translate-page`
- **Tout nouveau texte visible** doit etre traduit ou traduisible

---

## 14. Module Admin (Control Tower)

### Structure
- Point d'entree : `src/components/admin/ControlTower.tsx`
- Sidebar avec navigation par module : `ControlTowerSidebar.tsx`
- Contenu dynamique : `ControlTowerContent.tsx`
- Palette de commandes : `CommandPalette.tsx` (raccourci `Cmd+K`)

### 19 Modules admin
1. Dashboard - Vue d'ensemble
2. Stocks - Gestion des creneaux avec FullCalendar
3. CRM - Gestion clients et prospects
4. Articles - Gestion du carnet de voyage
5. Galerie - Gestion des photos
6. Avis - Moderation des temoignages
7. Marketing - Campagnes et newsletter
8. Communication - Chat et messages
9. Devis - Generation de devis PDF
10. Factures - Facturation
11. Analytiques - Statistiques et graphiques
12. Juridique - CGV, mentions legales
13. Automatisations - Workflows automatiques
14. Contenu - Gestion du contenu du site
15. Outils SEO - Optimisation referencement
16. Notifications - Gestion des notifications
17. Parametres - Configuration generale
18. Ecosysteme - Articles partenaires
19. Audit - Diagnostic du site

### Regles pour le module admin
- Les nouvelles fonctionnalites admin doivent etre ajoutees comme **module** dans le Control Tower
- Verifier le role admin via `user_roles` avant d'afficher le contenu
- Les actions admin critiques doivent etre confirmees par une modale `AlertDialog`

---

## 15. Tests et Qualite

- Pas de framework de test configure actuellement
- Typer tout le code pour beneficier de la verification TypeScript
- Utiliser `eslint` pour la coherence du code (`npm run lint`)
- Verifier que le build passe sans erreur (`npm run build`)
- Tester manuellement la responsivite et le dark mode

---

## 16. Regles Generales pour Lovable

### A FAIRE
- Suivre les patterns existants du codebase
- Utiliser les composants shadcn/ui existants avant d'en creer de nouveaux
- Garder la coherence avec le design system (couleurs, typographie, espacements)
- Ajouter le composant `SEOHead` a chaque nouvelle page
- Centraliser les appels Supabase dans des hooks `use[Feature]`
- Utiliser `toast` de Sonner pour les notifications utilisateur
- Respecter l'architecture par dossiers (pages/, components/, hooks/, etc.)
- Ecrire du code lisible et maintenable avec des noms descriptifs
- Toujours ajouter le lazy loading pour les nouvelles pages dans `App.tsx`

### A NE PAS FAIRE
- Ne pas installer de nouvelles dependances sans justification forte
- Ne pas modifier les composants `src/components/ui/*` directement
- Ne pas modifier les fichiers `src/integrations/supabase/*`
- Ne pas utiliser de couleurs Tailwind brutes (`bg-blue-500`) - utiliser les tokens semantiques
- Ne pas creer de fichiers CSS supplementaires - tout passe par Tailwind + `index.css`
- Ne pas utiliser `any` en TypeScript
- Ne pas afficher de messages d'erreur techniques a l'utilisateur
- Ne pas stocker de donnees sensibles dans le localStorage (sauf panier)
- Ne pas utiliser d'icones d'une autre bibliotheque que Lucide React
- Ne pas creer de composants classes (class components)
- Ne pas ajouter de commentaires inutiles ou de code mort
