import { Layout } from "@/components/layout/Layout";

const CGU = () => {
  return (
    <Layout>
      <div className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-8">
            Conditions Générales d'Utilisation
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                1. Présentation du site
              </h2>
              <p>
                Le site <strong>Ferme Équestre An Arwen</strong> est édité par la Ferme Équestre An Arwen, 
                située au 5 Le Bignon, 35360 La Chapelle du Lou du Lac, France.
              </p>
              <p>
                <strong>Responsable de publication :</strong> Ferme Équestre An Arwen<br />
                <strong>Contact :</strong> contact@ferme-equestre-an-arwen.com<br />
                <strong>Téléphone :</strong> 02 99 06 68 68
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                2. Acceptation des conditions
              </h2>
              <p>
                L'utilisation de ce site implique l'acceptation pleine et entière des présentes 
                conditions générales d'utilisation. Ces conditions d'utilisation sont susceptibles 
                d'être modifiées ou complétées à tout moment.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                3. Services proposés
              </h2>
              <p>
                Le site propose les services suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Présentation des randonnées équestres en Bretagne et au Maroc</li>
                <li>Réservation de séjours et d'activités équestres</li>
                <li>Hébergement en yourte</li>
                <li>Cours et stages d'équitation</li>
                <li>Espace communautaire pour les abonnés</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                4. Propriété intellectuelle
              </h2>
              <p>
                L'ensemble des éléments constituant ce site (textes, graphismes, photographies, 
                logos, etc.) est la propriété exclusive de la Ferme Équestre An Arwen, sauf 
                mentions contraires. Toute reproduction, représentation, modification ou adaptation 
                de ces éléments est interdite sans autorisation préalable.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                5. Responsabilité
              </h2>
              <p>
                La Ferme Équestre An Arwen s'efforce d'assurer l'exactitude et la mise à jour 
                des informations diffusées sur ce site. Toutefois, elle ne saurait garantir 
                l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                6. Création de compte
              </h2>
              <p>
                La création d'un compte utilisateur permet d'accéder à des fonctionnalités 
                réservées aux abonnés (chat communautaire, avis, planning). L'utilisateur 
                s'engage à fournir des informations exactes et à maintenir la confidentialité 
                de ses identifiants.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                7. Droit applicable
              </h2>
              <p>
                Les présentes CGU sont régies par la loi française. En cas de litige, les 
                tribunaux français seront seuls compétents.
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

export default CGU;
