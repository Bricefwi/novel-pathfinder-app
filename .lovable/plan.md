
# Plan : Module Comptabilite, Corrections et Google Analytics

## 3 axes d'intervention

---

## 1. Correction de l'erreur de relance profil (CRM 360)

**Probleme identifie** : La fonction `send-single-profile-reminder` utilise `authenticateRequest()` (qui lit le header `Authorization`), mais `supabase.functions.invoke()` passe le token automatiquement. Le probleme vient probablement du fait que la session utilisateur est expiree ou que le token n'est pas transmis correctement.

**Correction dans `CRM360.tsx`** (ligne ~343-356) :
- Ajouter un log de l'erreur detaillee retournee par la fonction pour identifier la cause exacte
- Verifier que la reponse `data` contient bien un champ `error` et l'afficher dans le toast
- Le `supabase.functions.invoke` retourne `{ data, error }` -- l'erreur peut etre dans `data.error` plutot que dans `error`

**Correction du code** :
```typescript
const sendProfileReminder = async (userId: string) => {
  setIsSendingReminder(true);
  try {
    const { data, error } = await supabase.functions.invoke("send-single-profile-reminder", {
      body: { user_id: userId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    toast.success(`Relance envoyee a ${data?.email_sent_to || "l'utilisateur"}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Erreur envoi relance:", msg);
    toast.error(`Erreur : ${msg}`);
  } finally {
    setIsSendingReminder(false);
  }
};
```

---

## 2. Nouveau module Comptabilite

### Emplacement
- Nouveau fichier : `src/components/admin/modules/AccountingDashboard.tsx`
- Ajout dans la sidebar sous la section **Croissance** avec l'icone `Landmark` (Lucide)
- Nouveau type de module : `"accounting"` dans `ControlTower.tsx`

### Fonctionnalites du module

#### Onglet 1 : Vue d'ensemble financiere
- **KPIs principaux** :
  - CA total (factures payees)
  - CA du mois en cours
  - Montant total en attente (factures pending/partial)
  - Taux de recouvrement (paye / total facture)
- **Graphique** : Evolution du CA par mois (LineChart Recharts)

#### Onglet 2 : Reglements par produit
- Tableau agrege par `activity_title` :
  - Nombre de factures
  - Montant total facture
  - Montant paye
  - Restant du
- Graphique camembert de la repartition par produit

#### Onglet 3 : Reglements par client
- Tableau agrege par `client_name` :
  - Nombre de factures
  - Montant total
  - Montant paye
  - Restant du
  - Dernier paiement (date)
- Filtre de recherche par nom/email

#### Onglet 4 : Liste detaillee des paiements
- Tableau complet de toutes les factures avec :
  - Numero de facture, client, activite, montant total, montant paye, restant, statut, date de paiement, methode de paiement
- Filtres : par statut (paid/pending/partial), par periode
- Export CSV

### Source de donnees
Tout repose sur la table `invoices` existante (colonnes : `total_amount`, `amount_paid`, `payment_status`, `payment_date`, `payment_method`, `activity_title`, `client_name`, `client_email`). Aucune migration necessaire.

---

## 3. Balise Google Analytics non detectee

**Constat** : Le GTM (GTM-WCLDQ7GV) est bien installe dans `index.html`. Le probleme visible sur la capture d'ecran est que **Google ne detecte pas la balise sur le domaine `www.ferme-equestre-arwen.com`**.

**Causes possibles** :
- Le site en production (domaine personnalise) n'est pas le meme que le preview Lovable
- Le conteneur GTM doit etre publie (dans l'interface Google Tag Manager)
- La balise de verification Google (`google-site-verification`) est presente dans le `<head>` -- c'est bon
- Il faut verifier que le fichier `public/googlea54930b027dc8e71.html` est bien servi sur le domaine de production

**Ce que je peux faire dans le code** : Rien a modifier cote code, le GTM est correctement installe. C'est un probleme de configuration cote Google Tag Manager (publication du conteneur) ou de propagation DNS/deploiement sur le domaine de production.

**Recommandation** : 
1. Allez sur [tagmanager.google.com](https://tagmanager.google.com), verifiez que le conteneur GTM-WCLDQ7GV est bien **publie** (pas en brouillon)
2. Dans Google Analytics, verifiez que l'ID de mesure GA4 est bien configure comme balise dans GTM
3. Testez avec l'extension "Google Tag Assistant" sur votre domaine de production

---

## Fichiers concernes

### Modifies
- `src/components/admin/modules/CRM360.tsx` : correction du handler de relance (meilleur affichage d'erreur)
- `src/components/admin/ControlTower.tsx` : ajout du type `"accounting"` dans `AdminModule`
- `src/components/admin/ControlTowerContent.tsx` : ajout du rendu du module comptabilite
- `src/components/admin/ControlTowerSidebar.tsx` : ajout de l'entree "Comptabilite" dans la section Croissance

### Crees
- `src/components/admin/modules/AccountingDashboard.tsx` : nouveau module comptabilite complet

### Aucune migration base de donnees necessaire
Toutes les donnees existent deja dans la table `invoices`.
