import { Layout } from "@/components/layout/Layout";
import mentionsImage1 from "@/assets/mentions-legales-1.jpg";
import mentionsImage2 from "@/assets/mentions-legales-2.jpg";
import mentionsImage3 from "@/assets/mentions-legales-3.jpg";
import mentionsImage4 from "@/assets/mentions-legales-4.jpg";
import mentionsImage5 from "@/assets/mentions-legales-5.jpg";
import mentionsImage6 from "@/assets/mentions-legales-6.jpg";

const MentionsLegales = () => {
  return (
    <Layout>
      <div className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
            Mentions légales
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Bienvenue sur la page des mentions légales de Ferme équestre An Arwen. Vous trouverez ici toutes les informations conformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
          </p>

          {/* Galerie photos décorative */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <img src={mentionsImage1} alt="Bivouac coucher de soleil" className="w-full h-48 object-cover rounded-lg" />
            <img src={mentionsImage2} alt="Randonnée équestre Bretagne" className="w-full h-48 object-cover rounded-lg" />
            <img src={mentionsImage3} alt="Chevaux en forêt" className="w-full h-48 object-cover rounded-lg" />
            <img src={mentionsImage4} alt="Cavaliers sur la plage" className="w-full h-48 object-cover rounded-lg" />
            <img src={mentionsImage5} alt="Chevaux dans les montagnes" className="w-full h-48 object-cover rounded-lg" />
            <img src={mentionsImage6} alt="Chevaux au pré" className="w-full h-48 object-cover rounded-lg" />
          </div>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Éditeur du site
              </h2>
              <ul className="list-none pl-0 space-y-2">
                <li><strong>Nom :</strong> RAUBER Arwen</li>
                <li><strong>Statut :</strong> Entrepreneur individuel – Guide équestre indépendant</li>
                <li><strong>Activité :</strong> Organisation et encadrement de randonnées équestres en France et à l'étranger</li>
                <li><strong>Siège social :</strong> 5 Le Bignon, 35360 La Chapelle Du Lou Du Lac, France</li>
                <li><strong>Téléphone :</strong> <a href="tel:+33659226270" className="text-primary hover:underline">06 59 22 62 70</a></li>
                <li><strong>Adresse e-mail :</strong> <a href="mailto:contact@ferme-equestre-an-arwen.com" className="text-primary hover:underline">contact@ferme-equestre-an-arwen.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Immatriculation
              </h2>
              <ul className="list-none pl-0 space-y-2">
                <li><strong>SIREN / SIRET :</strong> 80266354200016</li>
                <li><strong>Code APE :</strong> 9329Z</li>
                <li><strong>TVA intracommunautaire :</strong> Non assujetti à la TVA – article 293 B du Code général des impôts (sauf option contraire)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Responsable de la publication
              </h2>
              <p>
                <strong>RAUBER Arwen</strong><br />
                Titre : Guide équestre pour Ferme équestre An Arwen
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Hébergeur du site
              </h2>
              <ul className="list-none pl-0 space-y-2">
                <li><strong>Hébergeur :</strong> Lovable (GPT Engineer Inc.)</li>
                <li><strong>Adresse :</strong> San Francisco, CA, États-Unis</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Propriété intellectuelle
              </h2>
              <p>
                L'ensemble du contenu du site (textes, photographies, visuels, vidéos, logos, graphismes, structure générale) est la propriété exclusive de RAUBER Arwen, sauf mention contraire.
              </p>
              <p>
                Toute reproduction, représentation, diffusion ou exploitation, totale ou partielle, sans autorisation écrite préalable est strictement interdite et constitue une contrefaçon au sens des articles L.335-2 et suivants du Code de la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Responsabilité
              </h2>
              <p>
                RAUBER Arwen, en qualité de guide équestre indépendant, met en œuvre tous les moyens raisonnables pour assurer l'exactitude et la mise à jour des informations diffusées sur le site.
              </p>
              <p>
                Toutefois, l'éditeur ne saurait être tenu responsable des erreurs, omissions ou indisponibilités temporaires du site.
              </p>
              <p>
                Les activités proposées (randonnées équestres, séjours, stages) comportent par nature des risques liés à la pratique de l'équitation et aux activités de pleine nature. Les conditions de participation, responsabilités et obligations respectives sont détaillées dans les <a href="/cgu" className="text-primary hover:underline">Conditions Générales de Vente</a> accessibles sur le site.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Données personnelles
              </h2>
              <p>
                Les données personnelles collectées via le site sont traitées conformément au Règlement (UE) 2016/679 (RGPD) et à la loi n°78-17 modifiée.
              </p>
              <p>
                Les finalités, durées de conservation, droits des utilisateurs (accès, rectification, suppression, opposition) sont détaillés dans la <a href="/politique-confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Cookies
              </h2>
              <p>
                Le site est susceptible d'utiliser des cookies strictement nécessaires au fonctionnement du site ou à des fins de mesure d'audience.
              </p>
              <p>
                L'utilisateur peut à tout moment configurer ses préférences via le bandeau de gestion des cookies ou les paramètres de son navigateur.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Droit applicable et juridiction compétente
              </h2>
              <p>
                Les présentes mentions légales sont régies par le droit français.
              </p>
              <p>
                En cas de litige, et après tentative de résolution amiable, les tribunaux français territorialement compétents seront seuls compétents.
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

export default MentionsLegales;
