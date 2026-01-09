import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  jsonLd?: object;
}

const defaultTitle = "Ferme Équestre An Arwen | Randonnées à Cheval Bretagne & Maroc";
const defaultDescription = "Randonnées équestres en Bretagne et au Maroc. Galops sur les plages bretonnes, traversées du désert marocain. Hébergement yourte insolite. +20 ans d'expérience.";
const defaultKeywords = "randonnée équestre Bretagne, cheval plage Bretagne, séjour équestre Maroc, yourte Bretagne, galop plage Mont-Saint-Michel, vacances à cheval France, randonnée cheval désert Maroc, centre équestre Ille-et-Vilaine";
const siteUrl = "https://www.ferme-equestre-an-arwen.com";

export function SEOHead({
  title,
  description = defaultDescription,
  keywords = defaultKeywords,
  canonicalUrl,
  ogImage = "/og-image.jpg",
  ogType = "website",
  noIndex = false,
  jsonLd
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | Ferme Équestre An Arwen` : defaultTitle;
  const fullCanonicalUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="Ferme Équestre An Arwen" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

// Page-specific SEO configurations
export const seoConfigs = {
  home: {
    title: undefined, // Uses default
    description: "Randonnées équestres en Bretagne et au Maroc. Galops sur les plages bretonnes, traversées du désert marocain. Hébergement yourte insolite. +20 ans d'expérience.",
    canonicalUrl: "/",
  },
  destinations: {
    title: "Randonnées Équestres Bretagne & Maroc",
    description: "Découvrez nos randonnées à cheval en Bretagne (plages, forêts) et au Maroc (désert, Atlas). Tous niveaux acceptés. Réservez votre aventure équestre.",
    keywords: "randonnée équestre Bretagne, randonnée cheval Maroc, galop plage Bretagne, traversée désert cheval, balade à cheval Mont-Saint-Michel",
    canonicalUrl: "/destinations",
  },
  sejours: {
    title: "Séjours Équestres - Bretagne & Maroc",
    description: "Séjours équestres tout compris en Bretagne et au Maroc. Hébergement, repas et randonnées à cheval inclus. De 3 jours à 2 semaines.",
    keywords: "séjour équestre Bretagne, vacances à cheval Maroc, stage équitation Bretagne, séjour randonnée cheval, voyage équestre France",
    canonicalUrl: "/sejours",
  },
  hebergement: {
    title: "Yourte Bretagne - Hébergement Insolite",
    description: "Dormez dans une authentique yourte mongole en Bretagne. Hébergement insolite et écologique au cœur de notre ferme équestre. 2-4 personnes.",
    keywords: "yourte Bretagne, hébergement insolite Bretagne, glamping Bretagne, nuit yourte Ille-et-Vilaine, hébergement écologique Bretagne",
    canonicalUrl: "/hebergement",
  },
  galerie: {
    title: "Galerie Photos - Randonnées à Cheval",
    description: "Découvrez en images nos randonnées équestres en Bretagne et au Maroc. Photos de galops sur la plage, traversées du désert, moments de partage.",
    canonicalUrl: "/galerie",
  },
  contact: {
    title: "Contact - Réservation Randonnée Équestre",
    description: "Contactez la Ferme Équestre An Arwen pour réserver votre randonnée à cheval en Bretagne ou au Maroc. Devis gratuit et personnalisé.",
    canonicalUrl: "/contact",
  },
  preparerVoyage: {
    title: "Préparer son Voyage Équestre - Guide Complet",
    description: "Guide complet pour préparer votre randonnée à cheval : équipement cavalier, santé, documents, préparation physique. Conseils pour Bretagne, Maroc, Mongolie.",
    keywords: "préparer randonnée cheval, équipement cavalier randonnée, santé voyage équestre, checklist voyage équestre, préparation physique équitation",
    canonicalUrl: "/preparer-voyage",
  },
  devis: {
    title: "Demande de Devis - Randonnée Équestre",
    description: "Demandez un devis gratuit pour votre randonnée équestre en Bretagne ou au Maroc. Réponse sous 48h. Séjour sur-mesure disponible.",
    canonicalUrl: "/demande-devis",
  },
  carnetVoyage: {
    title: "Carnet de Voyage - Récits d'Aventures Équestres",
    description: "Récits et témoignages de nos randonnées à cheval. Découvrez les aventures de nos cavaliers en Bretagne et au Maroc.",
    canonicalUrl: "/carnet-voyage",
  },
  planning: {
    title: "Planning & Disponibilités - Randonnées Équestres",
    description: "Consultez le planning des randonnées équestres et les disponibilités. Réservez votre date pour une aventure à cheval en Bretagne ou au Maroc.",
    canonicalUrl: "/planning",
  },
};
