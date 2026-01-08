import { Layout } from "@/components/layout/Layout";

const Cookies = () => {
  return (
    <Layout>
      <div className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-8">
            Politique des Cookies
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                1. Qu'est-ce qu'un cookie ?
              </h2>
              <p>
                Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, 
                tablette, smartphone) lors de votre visite sur notre site. Il permet de 
                stocker des informations relatives à votre navigation.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                2. Les cookies que nous utilisons
              </h2>
              
              <h3 className="font-serif text-xl font-medium text-foreground mt-6 mb-3">
                Cookies strictement nécessaires
              </h3>
              <p>
                Ces cookies sont indispensables au fonctionnement du site. Ils vous permettent 
                d'utiliser les principales fonctionnalités du site (authentification, panier, etc.). 
                Sans ces cookies, vous ne pourrez pas utiliser notre site normalement.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Session utilisateur :</strong> maintien de votre connexion</li>
                <li><strong>Préférences cookies :</strong> mémorisation de vos choix</li>
              </ul>

              <h3 className="font-serif text-xl font-medium text-foreground mt-6 mb-3">
                Cookies de performance
              </h3>
              <p>
                Ces cookies nous permettent de recueillir des statistiques anonymes sur 
                l'utilisation de notre site (pages visitées, temps passé, etc.) afin 
                d'améliorer son fonctionnement.
              </p>

              <h3 className="font-serif text-xl font-medium text-foreground mt-6 mb-3">
                Cookies de fonctionnalité
              </h3>
              <p>
                Ces cookies permettent de mémoriser vos préférences (langue, région, etc.) 
                pour vous offrir une expérience personnalisée.
              </p>

              <h3 className="font-serif text-xl font-medium text-foreground mt-6 mb-3">
                Cookies de ciblage / publicité
              </h3>
              <p>
                Nous n'utilisons actuellement pas de cookies publicitaires sur notre site.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                3. Durée de conservation
              </h2>
              <p>
                Les cookies ont une durée de vie maximale de 13 mois à compter de leur dépôt 
                sur votre appareil, conformément aux recommandations de la CNIL.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                4. Gestion des cookies
              </h2>
              <p>
                Vous pouvez à tout moment choisir de désactiver ces cookies. Votre navigateur 
                peut également être paramétré pour vous signaler les cookies qui sont déposés 
                dans votre ordinateur et vous demander de les accepter ou non.
              </p>
              <p className="mt-4">
                <strong>Pour gérer vos cookies selon votre navigateur :</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                5. Consentement
              </h2>
              <p>
                Lors de votre première visite sur notre site, un bandeau vous informe de la 
                présence de cookies et vous invite à indiquer votre choix. Vous pouvez modifier 
                vos préférences à tout moment en nous contactant.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                6. Contact
              </h2>
              <p>
                Pour toute question concernant notre politique de cookies, vous pouvez nous 
                contacter à : <strong>contact@ferme-equestre-an-arwen.com</strong>
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

export default Cookies;
