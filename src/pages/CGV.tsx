import { Layout } from "@/components/layout/Layout";

const CGV = () => {
  return (
    <Layout>
      <div className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
            Conditions Générales de Vente
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Bienvenue sur la page des conditions générales de vente de la Ferme équestre An Arwen. 
            Avant de réserver votre activité ou séjour, veuillez lire attentivement les informations ci-dessous. 
            Elles définissent les règles et conditions qui régissent votre réservation et participation à nos activités.
          </p>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            
            {/* Article 1 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 1 – Statut du prestataire
              </h2>
              <p>
                RAUBER Arwen exerce son activité en qualité de guide équestre indépendant, en tant que prestataire de services.
                Il n'intervient pas en qualité d'agence de voyages, de voyagiste ou de tour-opérateur au sens des articles L.211-1 et suivants du Code du tourisme.
              </p>
              <p>Les prestations proposées consistent exclusivement en :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>l'encadrement équestre,</li>
                <li>la mise à disposition des chevaux lorsque cela est précisé,</li>
                <li>l'organisation technique et logistique de randonnées équestres.</li>
              </ul>
              <p>
                Les prestations annexes (hébergement, restauration, transport, transferts, activités complémentaires) sont, 
                sauf mention expresse contraire, assurées par des prestataires tiers indépendants, agissant sous leur propre 
                responsabilité contractuelle et civile.
              </p>
              <p>
                RAUBER Arwen ne saurait être tenu responsable des défaillances, retards ou manquements imputables à ces prestataires.
              </p>
            </section>

            {/* Article 2 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 2 – Conditions de participation
              </h2>
              <p>La participation aux randonnées équestres implique que le participant :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>déclare disposer du niveau équestre requis,</li>
                <li>reconnaisse être apte physiquement et psychologiquement à la pratique de l'équitation d'extérieur,</li>
                <li>s'engage à respecter les consignes de sécurité données par le guide.</li>
              </ul>
              <p>
                Le participant reconnaît que toute fausse déclaration engage sa seule responsabilité.
              </p>
              <p>
                RAUBER Arwen se réserve le droit de refuser ou d'interrompre, à tout moment, la participation d'un cavalier 
                dont le comportement, l'état physique ou le niveau technique serait incompatible avec la sécurité du groupe, 
                des chevaux ou de l'activité, sans que cette décision ne puisse donner lieu à remboursement ou indemnisation.
              </p>
            </section>

            {/* Article 3 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 3 – Réservation
              </h2>
              <p>
                La réservation devient ferme et définitive après validation écrite et versement d'un acompte de 20% du montant 
                total de la prestation. Le solde est exigible au plus tard 30 jours avant le départ.
              </p>
              <p className="font-medium text-foreground">
                Toute réservation vaut engagement contractuel ferme.
              </p>
            </section>

            {/* Article 4 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 4 – Tarifs
              </h2>
              <p>
                Les tarifs sont exprimés en euros (€) et correspondent strictement aux prestations décrites dans le 
                programme communiqué au client.
              </p>
              <p>Sauf mention contraire, ne sont pas inclus :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>les transports jusqu'au lieu de rendez-vous ;</li>
                <li>les dépenses personnelles ;</li>
                <li>les assurances facultatives ;</li>
                <li>les prestations assurées par des prestataires tiers ;</li>
                <li>les frais administratifs et documents de voyage pour les séjours à l'étranger.</li>
              </ul>
              <p>
                Pour les randonnées organisées hors de France, les tarifs peuvent être ajustés en cas de variation 
                significative des coûts (change, taxes locales, carburant).
              </p>
            </section>

            {/* Article 5 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 5 – Modalités de paiement
              </h2>
              <p>
                Les prestations de randonnées équestres, séjours itinérants, sorties à la journée et activités d'équitation 
                de pleine nature proposées par RAUBER Arwen sont fournies aux conditions financières définies au présent article.
              </p>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.1 Moyens de paiement acceptés
              </h3>
              <p>Le règlement des prestations peut être effectué par les moyens suivants :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>virement bancaire sur le compte communiqué au client ;</li>
                <li>chèque bancaire émis par un établissement domicilié en France ;</li>
                <li>paiement électronique sécurisé via une plateforme de paiement en ligne ;</li>
                <li>espèces, dans la limite des plafonds légaux en vigueur.</li>
              </ul>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.2 Acompte et validation de la réservation
              </h3>
              <p>
                Conformément à l'article 3 des présentes CGV, toute réservation est subordonnée au versement d'un acompte 
                dont le montant est précisé lors de la réservation. La réservation n'est considérée comme ferme et définitive 
                qu'après encaissement effectif de cet acompte.
              </p>
              <p>
                Sauf stipulation contraire expressément prévue aux présentes CGV, l'acompte versé est non remboursable, 
                y compris en cas d'annulation par le client.
              </p>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.3 Solde du prix
              </h3>
              <p>
                Le solde du prix est exigible au plus tard à la date indiquée lors de la réservation et, en tout état de cause, 
                avant le départ de la randonnée équestre.
              </p>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.4 Paiement échelonné
              </h3>
              <p>
                Un paiement échelonné peut être accordé à titre exceptionnel, uniquement sur accord écrit préalable de RAUBER Arwen.
                Le non-respect d'une échéance entraîne l'exigibilité immédiate de l'intégralité des sommes restant dues.
              </p>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.5 Défaut ou retard de paiement
              </h3>
              <p>Tout retard ou défaut de paiement entraîne de plein droit, sans mise en demeure préalable :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>l'exigibilité immédiate de l'intégralité des sommes dues ;</li>
                <li>l'annulation ou la suspension de la prestation concernée ;</li>
                <li>l'application de pénalités de retard calculées sur la base du taux légal en vigueur.</li>
              </ul>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.6 Frais annexes
              </h3>
              <p>
                Les éventuels frais bancaires, frais de change ou commissions liés au mode de paiement choisi, notamment 
                pour les randonnées organisées hors de France, restent à la charge exclusive du client.
              </p>

              <h3 className="font-serif text-xl font-semibold text-foreground mt-6 mb-3">
                5.7 Contestation
              </h3>
              <p>
                Toute contestation relative à une facture ou à un paiement devra être formulée par écrit dans un délai 
                maximal de trente (30) jours à compter de la date d'émission de la facture.
              </p>
            </section>

            {/* Article 6 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 6 – Annulation par le client
              </h2>
              <p>
                Toute annulation doit être notifiée par écrit (courrier électronique ou courrier recommandé).
                La date de réception de la notification écrite fait foi pour le calcul des frais d'annulation.
              </p>
              <p>
                Les frais d'annulation sont dus à titre de clause contractuelle, et non à titre de pénalité, 
                en raison des engagements financiers et logistiques pris par le guide.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 my-4">
                <h4 className="font-semibold text-foreground mb-3">Barème des frais d'annulation :</h4>
                <ul className="space-y-2">
                  <li><strong>Plus de 60 jours avant le départ :</strong> 30% du montant total</li>
                  <li><strong>De 30 à 60 jours avant le départ :</strong> 50% du montant total</li>
                  <li><strong>Moins de 30 jours avant le départ :</strong> 100% du montant total</li>
                </ul>
              </div>

              <p>Aucun remboursement ne pourra être exigé :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>en cas de non-présentation du participant,</li>
                <li>en cas d'interruption du séjour du fait du participant,</li>
                <li>en cas d'exclusion décidée pour raisons de sécurité.</li>
              </ul>
            </section>

            {/* Article 7 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 7 – Annulation ou modification par le guide
              </h2>
              <p>
                RAUBER Arwen se réserve le droit de modifier ou d'annuler une randonnée lorsque les conditions de sécurité 
                ne sont plus garanties, notamment en cas de :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>conditions météorologiques défavorables,</li>
                <li>événements sanitaires, vétérinaires ou environnementaux,</li>
                <li>force majeure au sens de l'article 1218 du Code civil,</li>
                <li>défaillance grave d'un prestataire tiers,</li>
                <li>nombre insuffisant de participants.</li>
              </ul>
              <p>
                En cas d'annulation imputable au guide, les sommes versées seront intégralement remboursées ou reportées 
                à la demande du client, sans qu'aucune indemnité complémentaire ne puisse être réclamée.
              </p>
            </section>

            {/* Article 8 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 8 – Assurances
              </h2>
              <p>
                RAUBER Arwen est titulaire d'une assurance Responsabilité Civile Professionnelle couvrant l'encadrement 
                des activités équestres.
              </p>
              <p>
                Le participant reconnaît avoir été informé qu'il lui appartient de souscrire, à titre personnel, 
                une assurance individuelle accident, responsabilité civile personnelle, assistance et rapatriement, 
                notamment pour les séjours organisés hors du territoire français.
              </p>
              <p className="font-medium text-foreground">
                À défaut de souscription d'une telle assurance, le participant déclare assumer seul les conséquences 
                financières d'un éventuel accident corporel.
              </p>
            </section>

            {/* Article 9 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 9 – Responsabilité
              </h2>
              <p>
                Le participant reconnaît que l'équitation est une activité de pleine nature comportant des risques 
                inhérents, même en présence d'un encadrement professionnel.
              </p>
              <p>RAUBER Arwen ne saurait être tenu responsable :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>des accidents résultant d'un comportement imprudent ou inadapté du participant,</li>
                <li>des accidents survenus en dehors des temps d'encadrement effectif,</li>
                <li>des dommages causés ou subis lors de prestations assurées par des tiers,</li>
                <li>de la perte, du vol ou de la détérioration des effets personnels.</li>
              </ul>
              <p>
                La responsabilité du guide est strictement limitée aux dommages corporels ou matériels directement 
                imputables à une faute prouvée dans l'encadrement de l'activité.
              </p>
            </section>

            {/* Article 10 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 10 – Séjours à l'étranger
              </h2>
              <p>Pour les randonnées organisées hors de France, le participant est seul responsable :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>de la validité de ses documents administratifs (passeport, visa, vaccins),</li>
                <li>du respect des lois, usages et réglementations locales,</li>
                <li>de la conformité de sa couverture d'assurance à l'international.</li>
              </ul>
              <p>
                Aucun remboursement ne pourra être exigé en cas d'impossibilité de participation liée au non-respect 
                de ces obligations.
              </p>
            </section>

            {/* Article 11 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 11 – Données personnelles
              </h2>
              <p>
                Les données personnelles collectées sont utilisées exclusivement pour la gestion des réservations et 
                des relations clients, conformément à la réglementation en vigueur relative à la protection des 
                données personnelles (RGPD).
              </p>
            </section>

            {/* Article 12 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 12 – Droit à l'image
              </h2>
              <p>
                Sauf opposition écrite préalable, le participant autorise RAUBER Arwen à utiliser les images et vidéos 
                réalisées lors des randonnées à des fins de communication professionnelle.
              </p>
            </section>

            {/* Article 13 */}
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Article 13 – Droit applicable et litiges
              </h2>
              <p>
                Les présentes Conditions Générales de Vente sont soumises au droit français.
                Tout litige relatif à leur interprétation ou à leur exécution fera l'objet d'une tentative de 
                résolution amiable préalable.
              </p>
              <p>
                À défaut d'accord amiable, le litige sera porté devant les tribunaux compétents du ressort du 
                domicile professionnel de RAUBER Arwen, y compris en cas de pluralité de défendeurs ou d'appel en garantie.
              </p>
            </section>

            {/* Exigences Spécifiques */}
            <section className="bg-primary/5 rounded-lg p-6">
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Exigences Spécifiques
              </h2>
              <p>
                Afin de garantir la sécurité et le bon déroulement de nos activités équestres, certaines exigences 
                spécifiques s'appliquent :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Âge minimum :</strong> Variable selon l'activité (précisé dans la fiche de chaque randonnée)</li>
                <li><strong>Niveau d'expérience :</strong> Débutant à confirmé selon les activités proposées</li>
                <li><strong>Équipement obligatoire :</strong> Casque aux normes (prêt possible), chaussures fermées à petit talon</li>
                <li><strong>Équipement recommandé :</strong> Pantalon d'équitation ou jean, vêtements adaptés à la météo</li>
                <li><strong>Restrictions médicales :</strong> Toute condition médicale particulière doit être signalée avant la réservation</li>
              </ul>
            </section>

            <p className="text-sm text-muted-foreground/70 pt-8 border-t border-border">
              Dernière mise à jour : 01/01/2026<br />
              RAUBER Arwen – Guide équestre indépendant
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CGV;
