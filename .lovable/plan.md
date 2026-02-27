

## Diagnostic complet du probleme

### Cause racine identifiee

Le probleme est une **condition de course (race condition)** dans `Auth.tsx` entre deux mecanismes concurrents :

1. **`onAuthStateChange`** (ligne 108) : Ce listener detecte l'evenement `SIGNED_IN` quand le token de recovery est echange par Supabase. Il appelle immediatement `handlePostLoginRedirect()` qui redirige vers `/mon-espace` ou `/onboarding`.

2. **`checkSessionAndRedirect`** (ligne 125) : Cette fonction verifie les parametres d'URL (`?reset=true`, `#type=recovery`) pour afficher le formulaire de reinitialisation. Mais elle s'execute **apres** que le listener ait deja redirige l'utilisateur.

**Resultat** : Le client clique sur le lien d'activation → Supabase echange le token → `SIGNED_IN` se declenche → redirection immediate vers une autre page → le formulaire de mot de passe n'est jamais affiche.

**Probleme secondaire** : L'evenement `PASSWORD_RECOVERY` emis par Supabase n'est pas gere du tout dans le listener.

### Flux actuel (defectueux)

```text
Client clique lien
  → Supabase echange token recovery
  → /auth?reset=true#access_token=...&type=recovery
  → onAuthStateChange: SIGNED_IN → handlePostLoginRedirect()
  → Redirection vers /mon-espace (profil onboarding_completed=true)
  → Le formulaire de mot de passe n'apparait JAMAIS
```

### Plan de correction

#### 1. Corriger le listener `onAuthStateChange` dans `Auth.tsx`

- Ajouter la gestion de l'evenement `PASSWORD_RECOVERY` : quand cet evenement est recu, forcer `setIsResetPassword(true)` et ne pas rediriger
- Pour l'evenement `SIGNED_IN` : verifier si l'URL contient `reset=true` ou si le hash contient `type=recovery` ou `type=invite`. Si oui, ne pas rediriger et laisser `checkSessionAndRedirect` gerer l'affichage du formulaire

```text
Flux corrige :

Client clique lien
  → Supabase echange token
  → /auth?reset=true#access_token=...&type=recovery
  → onAuthStateChange: PASSWORD_RECOVERY → setIsResetPassword(true) ✓
  → OU SIGNED_IN + URL a reset=true → skip redirect ✓
  → Formulaire "Definir mon mot de passe" s'affiche ✓
  → Client saisit mot de passe → updateUser({ password }) ✓
```

#### 2. Securiser `checkSessionAndRedirect`

- S'assurer que cette fonction s'execute en premier via un flag `isProcessingAuth` qui bloque le listener pendant l'analyse des parametres URL
- Deplacer la detection des parametres URL avant le setup du listener `onAuthStateChange`

#### 3. Corriger le message post-reset

- Apres la mise a jour du mot de passe, rediriger vers `/mon-espace` au lieu de simplement revenir au formulaire de connexion (l'utilisateur a deja une session active)

#### 4. Verifier les emails de bienvenue

- Le CTA de l'email de bienvenue (`bienvenue-nouveau-client`) pointe vers `/onboarding` et non vers la page de definition de mot de passe. C'est coherent car cet email n'est PAS un email d'activation. Mais il faut s'assurer que les deux flux sont bien distincts pour le client.

### Fichiers a modifier

- **`src/pages/Auth.tsx`** : Corriger le listener `onAuthStateChange`, ajouter la gestion de `PASSWORD_RECOVERY`, proteger contre la redirection prematuree en cas de recovery/invite

### Aucune modification backend necessaire

La fonction `admin-resend-invitations` genere correctement le lien avec `redirectTo: .../auth?reset=true`. Le probleme est entierement cote frontend dans la gestion de l'evenement d'authentification.

