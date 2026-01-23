import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY_CONFIG } from "@/config/constants";

export function ContactPreviewSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Map / Image */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
            <iframe
              src={COMPANY_CONFIG.maps.embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0"
              title="Localisation Ferme Équestre An Arwen"
            />
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div>
              <span className="inline-block text-primary font-medium mb-4">
                Nous trouver
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                Venez nous rendre visite
              </h2>
              <p className="text-muted-foreground text-lg">
                Située au cœur de la Bretagne, notre ferme équestre vous accueille
                dans un cadre naturel exceptionnel.
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Adresse</h3>
                  <a
                    href={COMPANY_CONFIG.maps.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {COMPANY_CONFIG.address.street}<br />
                    {COMPANY_CONFIG.address.postalCode} {COMPANY_CONFIG.address.city}
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Téléphone</h3>
                  <a
                    href={`tel:${COMPANY_CONFIG.phoneInternational}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {COMPANY_CONFIG.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <a
                    href={`mailto:${COMPANY_CONFIG.email}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {COMPANY_CONFIG.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Horaires</h3>
                  <p className="text-muted-foreground">
                    Du lundi au samedi : 9h - 19h<br />
                    Dimanche : Sur rendez-vous
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/contact" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <Button size="lg">
                  Demander un devis
                </Button>
              </Link>
              <a href={`tel:${COMPANY_CONFIG.phoneInternational}`}>
                <Button variant="outline" size="lg">
                  <Phone className="mr-2 h-4 w-4" />
                  Nous appeler
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
