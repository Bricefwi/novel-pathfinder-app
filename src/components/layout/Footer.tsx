import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Instagram, MessageCircle } from "lucide-react";
import logoCheval from "@/assets/logo-cheval.png";
import { COMPANY_CONFIG } from "@/config/constants";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const navigation = {
  destinations: [
    { name: "Randonnées Bretagne", href: "/destinations" },
    { name: "Séjours Maroc", href: "/destinations" },
  ],
  informations: [
    { name: "Hébergement", href: "/hebergement" },
    { name: "Planning", href: "/planning" },
    { name: "Préparer son voyage", href: "/preparer-voyage" },
    { name: "FAQ", href: "/agent-faq" },
  ],
  legal: [
    { name: "Mentions légales", href: "/mentions-legales" },
    { name: "CGU", href: "/cgu" },
    { name: "CGV", href: "/cgv" },
    { name: "Confidentialité", href: "/politique-confidentialite" },
    { name: "Cookies", href: "/cookies" },
  ],
};

const socialLinks = [
  {
    name: "Facebook",
    href: COMPANY_CONFIG.social.facebook,
    icon: Facebook,
  },
  {
    name: "Instagram",
    href: COMPANY_CONFIG.social.instagram,
    icon: Instagram,
  },
  {
    name: "TikTok",
    href: COMPANY_CONFIG.social.tiktok,
    icon: TikTokIcon,
  },
  {
    name: "WhatsApp",
    href: COMPANY_CONFIG.whatsapp,
    icon: MessageCircle,
  },
];

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-20 h-20 rounded-full bg-background/10 flex items-center justify-center overflow-hidden">
                <img src={logoCheval} alt={`Logo ${COMPANY_CONFIG.name}`} className="w-18 h-18 object-contain" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold">{COMPANY_CONFIG.shortName}</h2>
                <p className="text-xs text-secondary-foreground/70">{COMPANY_CONFIG.tagline}</p>
              </div>
            </Link>
            <p className="text-sm text-secondary-foreground/80 leading-relaxed">
              Quand la sérénité du voyage rencontre l'aventure à cheval. Découvrez nos randonnées
              équestres en Bretagne et au Maroc.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  className="w-10 h-10 rounded-full bg-secondary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <social.icon />
                </a>
              ))}
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

          {/* Informations légales */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-6">Informations légales</h3>
            <ul className="space-y-3">
              {navigation.legal.map((item) => (
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
                <a
                  href={COMPANY_CONFIG.maps.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  {COMPANY_CONFIG.address.street}<br />
                  {COMPANY_CONFIG.address.postalCode} {COMPANY_CONFIG.address.city}
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <a
                  href={`tel:${COMPANY_CONFIG.phoneInternational}`}
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  {COMPANY_CONFIG.phone}
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <a
                  href={`mailto:${COMPANY_CONFIG.email}`}
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  {COMPANY_CONFIG.email}
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
              © {new Date().getFullYear()} {COMPANY_CONFIG.name}. Tous droits réservés.
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
