# Configuration DNS Email — Ferme Équestre An Arwen

## Provider d'envoi : Brevo (ex-Sendinblue)
- **API utilisée** : API Transactionnelle v3 (`https://api.brevo.com/v3/smtp/email`)
- **Domaine d'expédition** : `ferme-equestre-arwen.com`

---

## Enregistrements DNS à configurer chez IONOS

### 1. SPF (Sender Policy Framework)
Permet aux serveurs de messagerie de vérifier que Brevo est autorisé à envoyer au nom de votre domaine.

| Type | Nom/Hôte | Valeur |
|------|----------|--------|
| TXT  | `@` (ou vide) | `v=spf1 include:sendinblue.com ~all` |

> ⚠️ Si un enregistrement SPF existe déjà, ajoutez `include:sendinblue.com` AVANT le `~all` existant.  
> Exemple : `v=spf1 include:_spf.google.com include:sendinblue.com ~all`

---

### 2. DKIM (DomainKeys Identified Mail)
Signe cryptographiquement les emails pour prouver qu'ils n'ont pas été altérés.

**Où trouver la valeur exacte :**
1. Connectez-vous à [Brevo](https://app.brevo.com)
2. Allez dans **Settings → Senders, Domains & Dedicated IPs → Domains**
3. Cliquez sur **"Authenticate this domain"** pour `ferme-equestre-arwen.com`
4. Brevo vous donnera les enregistrements DKIM à ajouter (généralement 2 enregistrements CNAME)

| Type  | Nom/Hôte | Valeur |
|-------|----------|--------|
| CNAME | `mail._domainkey` | *(valeur fournie par Brevo)* |
| CNAME | *(2ème clé fournie par Brevo)* | *(valeur fournie par Brevo)* |

---

### 3. DMARC (Domain-based Message Authentication)
Indique aux serveurs de messagerie quoi faire si SPF/DKIM échouent.

| Type | Nom/Hôte | Valeur |
|------|----------|--------|
| TXT  | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:contact@ferme-equestre-arwen.com; pct=100` |

> **Options de politique (`p=`)** :
> - `none` : Ne rien faire (monitoring uniquement, bon pour commencer)
> - `quarantine` : Mettre en spam les emails non authentifiés (recommandé)
> - `reject` : Rejeter complètement les emails non authentifiés (stricte)

---

### 4. Return-Path / Brevo Tracking (optionnel)
Pour améliorer la délivrabilité, Brevo peut demander un enregistrement CNAME supplémentaire :

| Type  | Nom/Hôte | Valeur |
|-------|----------|--------|
| CNAME | *(fourni par Brevo)* | *(fourni par Brevo)* |

---

## Adresses email configurées dans le code

| Adresse | Usage |
|---------|-------|
| `contact@ferme-equestre-arwen.com` | Formulaire de contact, réponses |
| `devis@ferme-equestre-arwen.com` | Envoi de devis |
| `factures@ferme-equestre-arwen.com` | Envoi de factures |
| `newsletter@ferme-equestre-arwen.com` | Newsletter |
| `notifications@ferme-equestre-arwen.com` | Notifications système |
| `relance@ferme-equestre-arwen.com` | Relances profils incomplets |

> Toutes ces adresses doivent être **vérifiées dans Brevo** :
> Settings → Senders & IPs → Add a sender

---

## Vérification

Après configuration DNS, vérifiez avec :
1. **Brevo Dashboard** : Settings → Domains → "Verify" pour chaque enregistrement
2. **[MXToolbox](https://mxtoolbox.com/SuperTool.aspx)** : Testez SPF, DKIM et DMARC
3. **[mail-tester.com](https://www.mail-tester.com/)** : Envoyez un email test et vérifiez le score

---

## Pourquoi les utilisateurs Orange/Hotmail ne reçoivent pas ?

Orange et Hotmail/Outlook sont **très stricts** sur l'authentification. Sans SPF + DKIM + DMARC correctement configurés :
- Les emails arrivent en **spam** ou sont **silencieusement rejetés**
- Aucune erreur n'apparaît côté expéditeur

**Priorité** : Configurez d'abord SPF + DKIM, puis DMARC. Attendez 24-48h la propagation DNS.
