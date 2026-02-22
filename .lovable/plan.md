
# Plan : Export Excel Analytics + Corrections restantes

## Etat des lieux

Apres analyse du code actuel :
- **Module Comptabilite** : deja cree et fonctionnel (`AccountingDashboard.tsx`) avec 4 onglets (vue d'ensemble, par produit, par client, liste detaillee) et export CSV
- **Relance profil CRM360** : deja corrigee avec gestion d'erreur amelioree (lignes 342-359)
- **Google Analytics** : GTM-WCLDQ7GV correctement installe dans `index.html` (lignes 6-10 + noscript lignes 300-301). Le probleme de detection est cote Google Tag Manager (conteneur non publie) ou domaine de production, pas cote code

## Seule modification necessaire : Export Excel professionnel pour Analytics Dashboard

### Approche technique
- Installer la dependance `xlsx` (SheetJS) pour generer des fichiers Excel `.xlsx` cote navigateur
- Ajouter un bouton "Exporter Excel" dans le header du dashboard Analytics
- Generer un classeur Excel multi-onglets avec mise en page soignee

### Structure du fichier Excel exporte

**Onglet 1 : Resume KPIs**
- Titre "Ferme Equestre An Arwen - Analytics" avec periode selectionnee
- Tableau des KPIs : Clients inscrits, Devis envoyes, Reservations, CA
- Variations par rapport a la periode precedente

**Onglet 2 : Entonnoir de conversion**
- Tableau : Etape, Nombre, Taux de conversion
- Visiteurs -> Inscrits -> Devis -> Ventes

**Onglet 3 : Destinations demandees**
- Tableau : Destination, Nombre de demandes
- Tri par popularite

**Onglet 4 : Evolution du CA**
- Tableau : Mois, Chiffre d'affaires
- Donnees mensuelles

**Onglet 5 : Repartition par type**
- Tableau : Type d'activite, Nombre

### Mise en page professionnelle
- En-tetes de colonnes en gras avec fond colore (orange primaire)
- Largeurs de colonnes ajustees automatiquement
- Formats numeriques (euros, pourcentages)
- Date d'export dans le pied de page
- Logo/nom de l'entreprise dans l'en-tete

### Fichiers concernes

**Dependance a ajouter** : `xlsx` (SheetJS Community Edition)

**Modifie** : `src/components/admin/modules/AnalyticsDashboard.tsx`
- Import de xlsx
- Ajout d'une fonction `exportToExcel()` qui cree le classeur multi-onglets
- Ajout du bouton "Exporter Excel" a cote du selecteur de periode dans le header

### Points deja resolus (aucune action necessaire)
- Module Comptabilite : operationnel
- Relance profil CRM360 : corrigee
- Google Analytics : correctement installe dans le code. Verifiez dans Google Tag Manager que le conteneur GTM-WCLDQ7GV est bien **publie** et que votre balise GA4 est active
