
# Plan — Conformité Facturation Électronique 2026/2027

## Décisions prises (défauts retenus)

- **PA partenaire : Super PDP** (offre API, marque grise, hébergement France) — gratuit jusqu'à 1000 factures/mois, puis 0,01 €/facture. Volume Arwen ≈ <100/mois ⇒ coût quasi nul.
- **Statut Arwen : Solution Compatible (SC)** — micro-entreprise franchise en base TVA (art. 293 B), donc :
  - Émission B2B obligatoire : **1er sept. 2027**
  - Réception : **1er sept. 2026**
  - E-reporting B2C : **1er sept. 2027**, fréquence **bimestrielle**
- **Périmètre B2C dominant** : SIREN facultatif côté client, formulaire devis enrichi pour pro.
- **Archivage** : Lovable Cloud Storage (bucket privé + journal d'intégrité) en V1, basculable vers PA en 2027 si besoin.

## Architecture cible

```text
DemandeDevis / AdminQuotesInvoices
        │
        ▼
  Edge Function generate-facturx
   (PDF + XML EN 16931 embarqué)
        │
        ▼
  Edge Function pa-send-invoice ──► Super PDP API
        │                              │
        ▼                              ▼
  invoices.status                  DGFiP (données)
   (déposée/rejetée/refusée/payée)
        ▲
        │  webhook
  Edge Function pa-webhook-status
```

## Vague 1 — Préparation & Réception (livrable juin-juillet 2026)

**Objectif : être prêt à recevoir des factures et émettre du Factur-X en interne.**

1. **Données enrichies sur quotes/invoices** (migration SQL)
   - Colonnes : `client_siren`, `client_vat_number`, `client_type` (`particulier`/`pro`), `delivery_address`, `operation_nature` (`bien`/`service`/`mixte`), `vat_on_debit_option` (bool).
   - Colonnes cycle de vie : `efacture_status`, `efacture_pa_id`, `efacture_submitted_at`, `efacture_xml_url`.
   - Numéros unifiés : `quote_number` / `invoice_number` au format `DEV-YYYY-NNNN` / `FAC-YYYY-NNNN` (déjà partiellement en place — à standardiser).

2. **Formulaire devis enrichi** (`DemandeDevis.tsx`, `AdminQuotesInvoices.tsx`)
   - Toggle "Particulier / Professionnel".
   - Si Pro : champs SIREN (validé 9 chiffres + checksum Luhn), raison sociale, TVA intra (optionnel), adresse de livraison.
   - Champ "Nature de l'opération" (par défaut "prestation de services" pour les séjours).

3. **Génération Factur-X EN 16931**
   - Edge function `generate-facturx` qui produit PDF/A-3 + XML CII embarqué.
   - Bibliothèque : `npm:@xmldom/xmldom` + `npm:pdf-lib` côté Deno, ou délégation au endpoint conversion Super PDP.
   - Templates PDF : reprise du design Bellevoire actuel (Playfair/Inter), ajout zone légale obligatoire.

4. **Module "Boîte de réception" admin** (Control Tower)
   - Nouvelle entrée sidebar "Factures reçues".
   - Stockage `inbound_invoices` (PDF + métadonnées XML parsées) + webhook entrant Super PDP.

## Vague 2 — Émission & E-reporting (livrable Q1 2027)

5. **Connexion Super PDP**
   - Création compte API (manuel par l'admin), stockage `SUPER_PDP_API_KEY` en secret.
   - Edge function `pa-register-client` : KYC SIREN à la première facture pro.
   - Edge function `pa-send-invoice` : transmission Factur-X avec retry + audit.
   - Edge function `pa-webhook-status` : réception statuts (déposée / rejetée / refusée / encaissée) → MAJ `invoices.efacture_status` + notification email branded au client + admin BCC.

6. **E-reporting B2C bimestriel**
   - Cron Supabase (1er du mois pair) → agrégation des paiements Stripe B2C → push API Super PDP.
   - Vue admin "E-reporting" avec historique des soumissions et statuts DGFiP.

7. **UI cycle de vie facture**
   - Badge statut (Déposée/Rejetée/Refusée/Encaissée) avec couleurs Bellevoire dans MonEspace + AdminQuotesInvoices.
   - Timeline statuts dans la fiche facture (réutilise pattern `PaymentAttemptTimeline`).

## Vague 3 — Archivage & Finitions (livrable été 2027)

8. **Archivage légal 10 ans**
   - Bucket privé `factures-archives` avec policy WORM (lecture seule après dépôt).
   - Table `invoice_archive_log` : hash SHA-256 + timestamp + signature.
   - Tâche cron mensuelle de vérification d'intégrité.

9. **Documentation & sanctions**
   - Page admin "Conformité e-invoicing" : checklist état du système, dernier e-reporting, factures en erreur.
   - Alerte automatique si une facture est en statut "Rejetée" >24h (15 € d'amende par mention manquante).

## Détails techniques

### Migrations DB principales
- `ALTER TABLE quotes` + `ALTER TABLE invoices` (nouveaux champs).
- `CREATE TABLE inbound_invoices` (factures reçues).
- `CREATE TABLE efacture_events` (audit cycle de vie).
- `CREATE TABLE ereporting_submissions` (historique bimestriel).
- Bucket Storage `factures-archives` (privé) + `factures-inbound` (privé).

### Edge functions à créer
- `generate-facturx` — PDF/A-3 + XML CII
- `pa-register-client` — KYC SIREN
- `pa-send-invoice` — émission
- `pa-webhook-status` — réception statuts
- `pa-inbound-receive` — réception factures fournisseurs
- `ereporting-bimestriel` — cron e-reporting B2C
- `archive-invoice` — copie WORM + hash

### Secrets à ajouter (avant Vague 2)
- `SUPER_PDP_API_KEY`
- `SUPER_PDP_WEBHOOK_SECRET`
- `ARWEN_SIRET` (déjà connu : 80266354200016)

### Impact sur l'existant
- `create-checkout-session` + `create-installment-payment` : sur succès Stripe, déclencher `generate-facturx` puis `pa-send-invoice` (B2B uniquement) ou agrégation e-reporting (B2C).
- `send-invoice-email` : joindre le Factur-X (PDF avec XML embarqué) au lieu du PDF simple.
- Numérotation devis/facture : centraliser via fonction Postgres `next_invoice_number()` séquentielle annuelle.

## Coût estimé
- **Super PDP** : 0 €/mois tant que < 1000 fact./mois (largement le cas).
- **Dev** : ~25-35 jours réparties sur 3 vagues.
- **Aucun nouvel abonnement SaaS** requis (archivage interne).

## Risques & points de vigilance
- Super PDP doit confirmer son agrément DGFiP avant juillet 2026 (à vérifier sur la liste officielle).
- Factur-X PDF/A-3 nécessite des polices embarquées correctement (Playfair Display + Inter).
- Si la base clients pro grossit, prévoir bascule vers archivage PA pour décharger la responsabilité.
- Test sandbox Super PDP obligatoire avant production (prévoir 1 semaine de validation).

## Livrables Vague 1 (à valider en premier)
- Migrations DB (5 tables/colonnes).
- 1 edge function `generate-facturx`.
- Refonte formulaire devis (Particulier/Pro + SIREN validation).
- Module admin "Factures reçues" minimal.
- Tests : générer une facture Factur-X valide et la valider sur [factur-x.org/validator](https://factur-x.org).

Validez la Vague 1 et je lance l'implémentation. Les Vagues 2 et 3 pourront être ouvertes ensuite avec un plan plus fin une fois le compte Super PDP créé.
