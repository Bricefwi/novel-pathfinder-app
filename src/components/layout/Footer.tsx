import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react";

const navigation = {
  destinations: [
    { name: "Randonnées Bretagne", href: "/destinations?region=bretagne" },
    { name: "Séjours Maroc", href: "/destinations?region=maroc" },
    { name: "Cours d'équitation", href: "/destinations?type=cours" },
    { name: "Stages", href: "/destinations?type=stage" },
  ],
  informations: [
    { name: "Hébergement", href: "/hebergement" },
    { name: "Tarifs", href: "/tarifs" },
    { name: "Préparer son voyage", href: "/preparer-voyage" },
    { name: "FAQ", href: "/contact#faq" },
  ],
  legal: [
    { name: "Mentions légales", href: "/mentions-legales" },
    { name: "Politique de confidentialité", href: "/mentions-legales#confidentialite" },
    { name: "CGV", href: "/mentions-legales#cgv" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">🐴</span>
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold">An Arwen</h2>
                <p className="text-xs text-secondary-foreground/70">Ferme Équestre</p>
              </div>
            </Link>
            <p className="text-sm text-secondary-foreground/80 leading-relaxed">
              Quand la sérénité du voyage rencontre l'aventure à cheval. Découvrez nos randonnées
              équestres en Bretagne et au Maroc.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Destinations */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-6">Destinations</h3>
            <ul className="space-y-3">
              {navigation.destinations.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-6">Informations</h3>
            <ul className="space-y-3">
              {navigation.informations.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-secondary-foreground/70">
                  5 Le Bignon<br />
                  35360 La Chapelle du Lou du Lac
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <a
                  href="tel:+33299066868"
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  02 99 06 68 68
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <a
                  href="mailto:contact@ferme-equestre-an-arwen.com"
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  contact@ferme-equestre-an-arwen.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-foreground/60">
              © {new Date().getFullYear()} Ferme Équestre An Arwen. Tous droits réservés.
            </p>
            <ul className="flex items-center space-x-6">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-xs text-secondary-foreground/60 hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
