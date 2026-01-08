import { Layout } from "@/components/layout/Layout";

const PolitiqueConfidentialite = () => {
  return (
    <Layout>
      <div className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-8">
            Politique de Confidentialité - RGPD
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                1. Responsable du traitement
              </h2>
              <p>
                Le responsable du traitement des données personnelles est la Ferme Équestre An Arwen, 
                située au 5 Le Bignon, 35360 La Chapelle du Lou du Lac, France.
              </p>
              <p>
                <strong>Contact DPO :</strong> contact@ferme-equestre-an-arwen.com
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                2. Données collectées
              </h2>
              <p>
                Nous collectons les données suivantes dans le cadre de nos services :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Données d'identification :</strong> nom, prénom, email, téléphone</li>
                <li><strong>Données de profil :</strong> niveau équestre, préférences de voyage</li>
                <li><strong>Données de réservation :</strong> dates, activités choisies, participants</li>
                <li><strong>Données de navigation :</strong> cookies, adresse IP, pages visitées</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                3. Finalités du traitement
              </h2>
              <p>
                Vos données sont traitées pour les finalités suivantes :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Gestion des réservations et des demandes de contact</li>
                <li>Personnalisation de votre expérience utilisateur</li>
                <li>Envoi de newsletters et communications (avec votre consentement)</li>
                <li>Amélioration de nos services et du site web</li>
                <li>Respect de nos obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                4. Base légale du traitement
              </h2>
              <p>
                Le traitement de vos données repose sur :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>L'exécution du contrat :</strong> pour les réservations et services</li>
                <li><strong>Votre consentement :</strong> pour les newsletters et cookies non essentiels</li>
                <li><strong>L'intérêt légitime :</strong> pour l'amélioration de nos services</li>
                <li><strong>L'obligation légale :</strong> pour la conservation des factures</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                5. Durée de conservation
              </h2>
              <p>
                Vos données sont conservées selon les durées suivantes :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Données de compte :</strong> durée de vie du compte + 3 ans</li>
                <li><strong>Données de réservation :</strong> 10 ans (obligation comptable)</li>
                <li><strong>Données de navigation :</strong> 13 mois maximum</li>
                <li><strong>Données de newsletter :</strong> jusqu'au retrait du consentement</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                6. Vos droits
              </h2>
              <p>
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
              </ul>
              <p className="mt-4">
                Pour exercer vos droits, contactez-nous à : <strong>contact@ferme-equestre-an-arwen.com</strong>
              </p>
              <p>
                Vous pouvez également introduire une réclamation auprès de la CNIL : 
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  www.cnil.fr
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                7. Sécurité des données
              </h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées 
                pour protéger vos données contre tout accès non autorisé, modification, divulgation 
                ou destruction. Nos données sont hébergées sur des serveurs sécurisés.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                8. Transferts de données
              </h2>
              <p>
                Vos données peuvent être transférées vers des prestataires situés hors de l'Union 
                Européenne. Dans ce cas, nous nous assurons que ces transferts sont encadrés par 
                des garanties appropriées (clauses contractuelles types, décisions d'adéquation).
              </p>
            </section>

            <p className="text-sm text-muted-foreground/70 pt-8 border-t border-border">
              Dernière mise à jour : Janvier 2026
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PolitiqueConfidentialite;
