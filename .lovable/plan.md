
# Plan : Système d'Audit Complet avec Gemini 3 Pro

## Objectif
Creer un outil d'audit automatise qui analyse l'ensemble du site An Arwen (code, securite, UX, SEO, accessibilite, performance) en utilisant **Gemini 3 Pro** via Lovable AI Gateway.

---

## Architecture Proposee

```text
+-------------------+       +------------------------+       +------------------+
|   Admin Panel     |  -->  |  Edge Function         |  -->  | Gemini 3 Pro     |
|   (Control Tower) |       |  audit-site            |       | (Lovable AI)     |
+-------------------+       +------------------------+       +------------------+
         |                           |
         v                           v
  +-------------+            +------------------+
  | Rapport PDF |            | Stockage DB      |
  | (telecharg) |            | (audit_reports)  |
  +-------------+            +------------------+
```

---

## Fonctionnalites de l'Audit

### 1. Categories d'Analyse
L'audit couvrira 6 domaines :

| Domaine | Points Analyses |
|---------|-----------------|
| **Securite** | RLS policies, validation inputs, CORS, injection XSS/SQL |
| **Performance** | Lazy loading, bundle size, images optimisees, cache |
| **SEO** | Meta tags, sitemap, robots.txt, llms.txt, schema.org |
| **Accessibilite** | Contrastes, labels aria, navigation clavier, alt images |
| **UX/Design** | Coherence visuelle, responsive, parcours utilisateur |
| **Code** | Bonnes pratiques React, TypeScript, composants reutilisables |

### 2. Score Global
Chaque domaine recoit une note de 0 a 100, avec un score global pondere.

### 3. Recommandations Actionnables
Chaque probleme identifie sera accompagne :
- D'une description claire du probleme
- D'un niveau de priorite (Critique, Haute, Moyenne, Faible)
- D'une solution concrete avec exemple de code si applicable

---

## Implementation Technique

### Phase 1 : Creation de la Table de Stockage
```sql
CREATE TABLE audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  audit_type TEXT NOT NULL, -- 'full', 'security', 'seo', etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  scores JSONB, -- { security: 85, performance: 72, ... }
  global_score INTEGER,
  findings JSONB, -- Array of issues found
  recommendations JSONB, -- Array of suggestions
  raw_response TEXT, -- Full AI response for debugging
  model_used TEXT DEFAULT 'google/gemini-3-pro-preview'
);
```

### Phase 2 : Edge Function `audit-site`

**Fichier** : `supabase/functions/audit-site/index.ts`

L'edge function :
1. Recupere les donnees du projet (structure pages, composants, config)
2. Analyse la base de donnees (tables, RLS policies via linter)
3. Construit un prompt detaille pour Gemini 3 Pro
4. Execute l'appel API avec le modele `google/gemini-3-pro-preview`
5. Parse et stocke le rapport dans `audit_reports`

```typescript
// Extrait du prompt systeme
const AUDIT_SYSTEM_PROMPT = `Tu es un expert en developpement web, securite et UX.
Tu realises un audit complet d'une application React/Vite/Supabase.

STRUCTURE DU RAPPORT ATTENDU (JSON) :
{
  "scores": {
    "security": 0-100,
    "performance": 0-100,
    "seo": 0-100,
    "accessibility": 0-100,
    "ux": 0-100,
    "code_quality": 0-100
  },
  "global_score": 0-100,
  "findings": [
    {
      "category": "security|performance|seo|accessibility|ux|code",
      "severity": "critical|high|medium|low",
      "title": "Titre du probleme",
      "description": "Description detaillee",
      "location": "Fichier ou composant concerne",
      "recommendation": "Solution concrete",
      "code_example": "Code correctif si applicable"
    }
  ],
  "summary": "Resume en 3 phrases"
}`;
```

### Phase 3 : Interface Admin

**Nouveau module** : `src/components/admin/modules/SiteAudit.tsx`

Fonctionnalites :
- Bouton "Lancer un audit complet"
- Historique des audits precedents
- Affichage des scores avec jauges visuelles
- Liste des problemes tries par priorite
- Export PDF du rapport
- Comparaison entre audits (evolution dans le temps)

### Phase 4 : Collecte des Donnees pour l'Audit

L'edge function collectera :

```typescript
// Donnees injectees dans le prompt
const auditContext = {
  // Structure de l'application
  pages: ["Index", "Destinations", "Auth", "Admin", ...],
  components_count: 45,
  edge_functions: ["ask-loic", "analyze-prospect", ...],
  
  // Configuration
  seo_files: ["robots.txt", "sitemap.xml", "llms.txt"],
  rls_policies: [...], // Depuis le linter
  
  // Echantillons de code
  auth_implementation: "...",
  sample_components: ["Header.tsx", "Layout.tsx"],
  
  // Configuration Supabase
  tables: ["profiles", "activities", "bookings", ...],
  storage_buckets: ["avatars", "gallery"],
};
```

---

## Details des Livrables

### Fichiers a Creer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/audit-site/index.ts` | Edge function principale |
| `src/components/admin/modules/SiteAudit.tsx` | Interface d'audit dans Control Tower |
| `src/hooks/use-site-audit.ts` | Hook pour gerer l'etat de l'audit |
| Migration SQL | Table `audit_reports` + RLS admin-only |

### Fichiers a Modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/Admin.tsx` | Ajouter onglet "Audit Site" |
| `src/components/admin/ControlTowerContent.tsx` | Integrer le module SiteAudit |
| `supabase/config.toml` | Declarer la nouvelle function |

---

## Interface Utilisateur

```text
+------------------------------------------------------------------+
|  AUDIT DU SITE                                    [Lancer Audit] |
+------------------------------------------------------------------+
|                                                                  |
|  Score Global : 78/100  ████████████████████░░░░░                |
|                                                                  |
|  +------------+  +------------+  +------------+                  |
|  | Securite   |  | Perf.      |  | SEO        |                  |
|  |   85/100   |  |   72/100   |  |   91/100   |                  |
|  +------------+  +------------+  +------------+                  |
|  +------------+  +------------+  +------------+                  |
|  | A11y       |  | UX         |  | Code       |                  |
|  |   68/100   |  |   80/100   |  |   75/100   |                  |
|  +------------+  +------------+  +------------+                  |
|                                                                  |
|  PROBLEMES IDENTIFIES (12)                                       |
|  +--------------------------------------------------------------+|
|  | ! CRITIQUE : Validation input manquante sur AgentFAQ        ||
|  | ! HAUTE    : Images sans attribut alt dans Galerie          ||
|  | . MOYENNE  : Bundle JS non optimise (1.2MB)                 ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  [Telecharger PDF]  [Voir historique]  [Comparer]                |
+------------------------------------------------------------------+
```

---

## Modele IA Utilise

- **Modele** : `google/gemini-3-pro-preview`
- **Raison** : Modele next-gen avec capacites de raisonnement avancees, ideal pour l'analyse de code complexe et la generation de recommandations detaillees
- **Configuration** :
  - `temperature: 0.2` (reponses factuelles et precises)
  - `max_tokens: 8192` (rapport detaille)

---

## Securite

- Table `audit_reports` avec RLS : lecture/ecriture admin uniquement
- Edge function avec validation du role admin avant execution
- Pas d'exposition de donnees sensibles dans les rapports

---

## Estimation du Travail

| Etape | Temps estime |
|-------|--------------|
| Table + RLS | 5 min |
| Edge function audit-site | 15 min |
| Interface SiteAudit.tsx | 15 min |
| Integration Control Tower | 5 min |
| Tests et ajustements | 10 min |

**Total : ~50 minutes**
