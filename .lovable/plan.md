
# Plan de Renforcement SEO - Marque "Ferme Equestre Arwen"

## Objectif
Propulser "ferme-equestre-arwen" et la variante "ferme-equestre-arwan" en tete des resultats de recherche moteurs et IA.

---

## Modifications a effectuer

### 1. Mise a jour des mots-cles dans SEOHead.tsx

**Fichier:** `src/components/seo/SEOHead.tsx`

Enrichir `defaultKeywords` avec les variantes de marque :
- ferme equestre arwen
- ferme equestre arwan (variante orthographique)
- ferme-equestre-arwen
- an arwen bretagne
- an arwen equestre

### 2. Enrichissement du JSON-LD dans index.html

**Fichier:** `index.html`

Ajouter dans le schema `LocalBusiness` :
- Propriete `alternateName` avec un tableau de variantes : "An Arwen", "Ferme Equestre Arwan", "ferme-equestre-arwen"
- Propriete `keywords` dans la description
- Renforcer `sameAs` avec les profils sociaux

Ajouter un nouveau bloc JSON-LD `Organization` dedie a la marque avec :
```text
"@type": "Organization"
"name": "Ferme Equestre An Arwen"
"alternateName": ["An Arwen", "Ferme Equestre Arwan", "ferme-equestre-arwen", "ferme-equestre-arwan"]
"brand": {...}
```

### 3. Mise a jour des meta tags dans index.html

**Fichier:** `index.html`

Ajouter dans la section `<head>` :
- Meta `keywords` enrichi avec les variantes de marque
- Meta `application-name` pour les navigateurs
- Meta `apple-mobile-web-app-title`

### 4. Mise a jour du fichier llms.txt statique

**Fichier:** `public/llms.txt`

Ajouter une section dediee aux noms de marque :
```text
## Noms de marque et variantes
- Nom officiel : Ferme Equestre An Arwen
- Variantes acceptees : ferme-equestre-arwen, ferme-equestre-arwan, An Arwen
- URL : ferme-equestre-arwen.com
```

### 5. Mise a jour du fichier llms.txt .well-known

**Fichier:** `public/.well-known/llms.txt`

Ajouter les memes variantes de marque pour les crawlers IA en anglais.

### 6. Mise a jour de l'Edge Function serve-llms-txt

**Fichier:** `supabase/functions/serve-llms-txt/index.ts`

Integrer dans la generation dynamique :
- Section "Identite de marque" avec toutes les variantes
- Mots-cles de marque dans la section Keywords

### 7. Mise a jour du robots.txt

**Fichier:** `public/robots.txt`

Ajouter un commentaire SEO avec les mots-cles de marque pour les crawlers qui lisent les commentaires.

### 8. Ajout dans la configuration centralisee

**Fichier:** `src/config/constants.ts`

Ajouter un champ `brandVariants` dans `COMPANY_CONFIG` :
```text
brandVariants: [
  "Ferme Equestre An Arwen",
  "ferme-equestre-arwen",
  "ferme-equestre-arwan",
  "An Arwen",
  "An Arwen Equestre"
]
```

---

## Resume des fichiers a modifier

| Fichier | Type de modification |
|---------|---------------------|
| `src/components/seo/SEOHead.tsx` | Enrichir mots-cles par defaut |
| `index.html` | Ajouter JSON-LD Organization + meta tags |
| `public/llms.txt` | Section noms de marque |
| `public/.well-known/llms.txt` | Section brand names (EN) |
| `supabase/functions/serve-llms-txt/index.ts` | Identite de marque dynamique |
| `public/robots.txt` | Commentaires SEO enrichis |
| `src/config/constants.ts` | Champ brandVariants |

---

## Impact attendu

- **Moteurs de recherche** : Meilleure association entre les requetes "ferme equestre arwen/arwan" et le site
- **Agents IA** : Reconnaissance immediate de la marque grace aux fichiers llms.txt
- **Fautes de frappe** : Capture des utilisateurs tapant "arwan" au lieu de "arwen"
- **Donnees structurees** : Schema.org renforce pour le Knowledge Graph Google
