import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactPreviewSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Map / Image */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2675.123456789!2d-1.85!3d48.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDE1JzAwLjAiTiAxwrA1MScwMC4wIlc!5e0!3m2!1sfr!2sfr!4v1234567890"
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
                  <p className="text-muted-foreground">
                    5 Le Bignon<br />
                    35360 La Chapelle du Lou du Lac
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Téléphone</h3>
                  <a
                    href="tel:+33299066868"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    02 99 06 68 68
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
                    href="mailto:contact@ferme-equestre-an-arwen.com"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    contact@ferme-equestre-an-arwen.com
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
              <Link to="/contact">
                <Button size="lg">
                  Demander un devis
                </Button>
              </Link>
              <a href="tel:+33299066868">
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
