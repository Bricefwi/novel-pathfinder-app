
# Ajout de la visibilite onboarding dans le CRM 360

## Constat sur Sandra LEBRETON

Son profil est complete a **50%** (5 champs sur 10 renseignes) :

| Etape | Champ | Statut |
|-------|-------|--------|
| Identite | Prenom | Renseigne |
| Identite | Nom | Renseigne |
| Identite | Telephone | Renseigne |
| Profil Cavalier | Niveau equestre | Renseigne |
| Profil Cavalier | Annees d'experience | Renseigne (0) |
| Preferences | Destinations revees | Vide |
| Preferences | Types de sejours | Vide |
| Preferences | Centres d'interet | Vide |
| Profil Cavalier | Style d'equitation | Vide |
| Preferences | Compagnons de voyage | Vide |

## Ce qui existe deja

- La logique de calcul de completion dans `src/lib/profile-utils.ts` (10 champs, 100%)
- L'Edge Function `send-incomplete-profile-reminders` qui envoie des emails de relance aux profils incomplets
- Le CRM 360 affiche le Lead Score mais **pas le taux de completion du profil**

## Modifications prevues

### 1. Ajouter le taux de completion du profil dans la fiche client CRM 360

Dans `src/components/admin/modules/CRM360.tsx` :

- Importer `calculateProfileCompletion` depuis `@/lib/profile-utils`
- Ajouter dans la vue detail client (a cote du Lead Score) un indicateur **"Profil Cavalier"** avec le pourcentage de completion et une barre de progression
- Ajouter une section **"Etapes Onboarding"** sous les coordonnees qui affiche visuellement les 10 champs avec un indicateur vert/rouge pour chacun :
  - Prenom, Nom, Telephone
  - Niveau equestre, Experience, Style d'equitation
  - Destinations revees, Types de sejours, Centres d'interet, Compagnons de voyage
- Ajouter un badge "Profil incomplet" ou "Cavalier Verifie" visible directement dans la fiche

### 2. Ajouter le taux de completion dans la liste des clients

- Afficher le pourcentage de completion du profil dans chaque carte client de la liste (sous le Lead Score existant), avec une micro barre de progression

### 3. Ajouter un bouton "Relancer pour completer le profil"

- Dans la fiche client, si le profil est incomplet, afficher un bouton **"Envoyer un rappel"** qui appelle l'Edge Function `send-incomplete-profile-reminders` pour envoyer un email cible a ce client specifique
- Pour cela, creer une nouvelle Edge Function `send-single-profile-reminder` qui envoie la relance a un seul utilisateur (par `user_id`), reutilisant le meme template d'email

### 4. Enrichir les donnees du ClientProfile

- Ajouter les champs necessaires au type `ClientProfile` dans le CRM : `riding_experience_years`, `preferred_trip_types`, `interests`, `riding_style`, `travel_companions`, `onboarding_completed`
- Ces champs sont deja recuperes par la requete `profiles` mais pas mappes dans le type

## Details techniques

### Fichiers modifies
- `src/components/admin/modules/CRM360.tsx` : ajout completion profil + section etapes onboarding + bouton relance

### Fichier cree
- `supabase/functions/send-single-profile-reminder/index.ts` : Edge Function pour relancer un client individuel (reprend le template de `send-incomplete-profile-reminders` mais pour un seul `user_id`)

### Pas de migration base de donnees necessaire
Toutes les donnees existent deja dans la table `profiles`.
