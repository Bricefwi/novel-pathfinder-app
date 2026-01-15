import { Helmet } from 'react-helmet-async';

type SchemaType = 'product' | 'trip' | 'article' | 'organization' | 'breadcrumbs' | 'faq' | 'event';

interface SchemaFactoryProps {
  type: SchemaType;
  data: Record<string, any>;
  baseUrl?: string;
}

const siteUrl = "https://www.ferme-equestre-an-arwen.com";
const organizationDefaults = {
  name: "Ferme Équestre An Arwen",
  logo: `${siteUrl}/logo-an-arwen.png`,
  telephone: "+33 2 99 97 35 46",
  email: "contact@ferme-equestre-an-arwen.com",
  address: {
    streetAddress: "La Ferme An Arwen",
    addressLocality: "Bazouges-la-Pérouse",
    postalCode: "35560",
    addressRegion: "Bretagne",
    addressCountry: "FR"
  }
};

/**
 * SchemaFactory - Génère automatiquement le JSON-LD Schema.org
 * à partir des données de la base de données
 */
export function SchemaFactory({ type, data, baseUrl = siteUrl }: SchemaFactoryProps) {
  const schema = generateSchema(type, data, baseUrl);
  
  if (!schema) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

function generateSchema(type: SchemaType, data: Record<string, any>, baseUrl: string): object | null {
  switch (type) {
    case 'product':
    case 'trip':
      return generateTripSchema(data, baseUrl);
    case 'article':
      return generateArticleSchema(data, baseUrl);
    case 'organization':
      return generateOrganizationSchema(data, baseUrl);
    case 'breadcrumbs':
      return generateBreadcrumbSchema(data, baseUrl);
    case 'faq':
      return generateFAQSchema(data);
    case 'event':
      return generateEventSchema(data, baseUrl);
    default:
      return null;
  }
}

/**
 * Schema pour les produits/séjours équestres (Trip + Product)
 */
function generateTripSchema(data: Record<string, any>, baseUrl: string): object {
  const {
    title,
    slug,
    description,
    short_description,
    price_from,
    price_to,
    featured_image,
    region,
    country,
    duration,
    activity_type,
    riding_level,
    inclusions = [],
    is_active,
    slots = []
  } = data;

  // Récupérer les disponibilités depuis les slots
  const availability = slots.length > 0 && slots.some((s: any) => s.is_available) 
    ? "https://schema.org/InStock" 
    : is_active 
      ? "https://schema.org/PreOrder"
      : "https://schema.org/OutOfStock";

  // Dates des prochains créneaux disponibles
  const nextSlots = slots
    .filter((s: any) => s.is_available && new Date(s.start_date) > new Date())
    .slice(0, 5);

  const tripSchema = {
    "@context": "https://schema.org",
    "@type": ["Product", "TouristTrip"],
    "name": title,
    "description": description || short_description,
    "url": `${baseUrl}/destinations/${slug}`,
    "image": featured_image?.startsWith('http') ? featured_image : `${baseUrl}${featured_image}`,
    "provider": {
      "@type": "TouristAttraction",
      "name": organizationDefaults.name,
      "telephone": organizationDefaults.telephone,
      "address": {
        "@type": "PostalAddress",
        ...organizationDefaults.address
      }
    },
    "touristType": {
      "@type": "Audience",
      "audienceType": mapRidingLevel(riding_level)
    },
    ...(price_from && {
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "EUR",
        "lowPrice": price_from,
        "highPrice": price_to || price_from,
        "availability": availability,
        "validFrom": new Date().toISOString().split('T')[0],
        ...(nextSlots.length > 0 && {
          "availabilityStarts": nextSlots[0].start_date
        })
      }
    }),
    ...(duration && { "duration": formatDuration(duration) }),
    ...(region && { 
      "itinerary": {
        "@type": "ItemList",
        "itemListElement": [{
          "@type": "ListItem",
          "position": 1,
          "name": `${region}${country ? `, ${country}` : ''}`
        }]
      }
    }),
    ...(inclusions.length > 0 && {
      "amenityFeature": inclusions.map((inc: string) => ({
        "@type": "LocationFeatureSpecification",
        "name": inc,
        "value": true
      }))
    }),
    "category": mapActivityType(activity_type),
    "isAccessibleForFree": false
  };

  return tripSchema;
}

/**
 * Schema pour les articles de blog
 */
function generateArticleSchema(data: Record<string, any>, baseUrl: string): object {
  const {
    title,
    slug,
    content,
    excerpt,
    featured_image,
    category,
    tags = [],
    author_id,
    published_at,
    updated_at,
    views_count
  } = data;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": excerpt || truncateText(content, 160),
    "url": `${baseUrl}/carnet-voyage/${slug}`,
    "image": featured_image?.startsWith('http') ? featured_image : `${baseUrl}${featured_image}`,
    "datePublished": published_at || new Date().toISOString(),
    "dateModified": updated_at || published_at || new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": organizationDefaults.name,
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": organizationDefaults.name,
      "logo": {
        "@type": "ImageObject",
        "url": organizationDefaults.logo
      }
    },
    ...(category && { "articleSection": category }),
    ...(tags.length > 0 && { "keywords": tags.join(', ') }),
    ...(views_count && { "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/ReadAction",
      "userInteractionCount": views_count
    }}),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/carnet-voyage/${slug}`
    }
  };
}

/**
 * Schema pour l'organisation
 */
function generateOrganizationSchema(data: Record<string, any>, baseUrl: string): object {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "TouristAttraction", "SportsActivityLocation"],
    "name": data.name || organizationDefaults.name,
    "url": baseUrl,
    "logo": data.logo || organizationDefaults.logo,
    "image": data.image || `${baseUrl}/og-image.jpg`,
    "telephone": data.telephone || organizationDefaults.telephone,
    "email": data.email || organizationDefaults.email,
    "address": {
      "@type": "PostalAddress",
      ...organizationDefaults.address,
      ...(data.address || {})
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 48.4356,
      "longitude": -1.5719
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "09:00",
      "closes": "18:00"
    },
    "priceRange": "€€€",
    "sameAs": [
      "https://www.instagram.com/anarwen_equestre/",
      "https://www.facebook.com/fermeequestreanarwen/",
      "https://www.tiktok.com/@anarwen_equestre"
    ],
    "description": data.description || "Randonnées équestres en Bretagne et au Maroc. Plus de 25 ans d'expérience.",
    "foundingDate": "1999",
    "currenciesAccepted": "EUR",
    "paymentAccepted": "Cash, Credit Card, Bank Transfer"
  };
}

/**
 * Schema pour le fil d'Ariane
 */
function generateBreadcrumbSchema(data: Record<string, any>, baseUrl: string): object {
  const { items = [] } = data;
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item: { name: string; url: string }, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  };
}

/**
 * Schema pour les FAQ
 */
function generateFAQSchema(data: Record<string, any>): object {
  const { questions = [] } = data;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map((q: { question: string; answer: string }) => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer
      }
    }))
  };
}

/**
 * Schema pour les événements/créneaux
 */
function generateEventSchema(data: Record<string, any>, baseUrl: string): object {
  const {
    title,
    description,
    start_date,
    end_date,
    price,
    max_participants,
    current_participants,
    location,
    featured_image,
    slug
  } = data;

  const availableSpots = (max_participants || 10) - (current_participants || 0);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": title,
    "description": description,
    "startDate": start_date,
    "endDate": end_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": location || "Ferme Équestre An Arwen",
      "address": {
        "@type": "PostalAddress",
        ...organizationDefaults.address
      }
    },
    "image": featured_image,
    "organizer": {
      "@type": "Organization",
      "name": organizationDefaults.name,
      "url": baseUrl
    },
    ...(price && {
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "EUR",
        "availability": availableSpots > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/SoldOut",
        "url": `${baseUrl}/demande-devis?sejour=${slug}`,
        "validFrom": new Date().toISOString().split('T')[0]
      }
    }),
    ...(max_participants && {
      "maximumAttendeeCapacity": max_participants,
      "remainingAttendeeCapacity": availableSpots
    })
  };
}

// ============ HELPERS ============

function mapRidingLevel(level: string | null): string {
  const levels: Record<string, string> = {
    'debutant': 'Débutants - Cavaliers novices',
    'intermediaire': 'Intermédiaires - Cavaliers réguliers',
    'confirme': 'Confirmés - Cavaliers expérimentés',
    'expert': 'Experts - Cavaliers professionnels'
  };
  return levels[level || ''] || 'Tous niveaux';
}

function mapActivityType(type: string | null): string {
  const types: Record<string, string> = {
    'randonnee': 'Randonnée Équestre',
    'stage': 'Stage d\'Équitation',
    'cours': 'Cours d\'Équitation',
    'sejour': 'Séjour Équestre',
    'evenement': 'Événement Équestre'
  };
  return types[type || ''] || 'Activité Équestre';
}

function formatDuration(duration: string): string {
  // Convertir "5 jours" en format ISO 8601 (P5D)
  const match = duration.match(/(\d+)\s*(jour|jours|day|days)/i);
  if (match) {
    return `P${match[1]}D`;
  }
  return duration;
}

function truncateText(text: string | null, maxLength: number): string {
  if (!text) return '';
  const cleaned = text.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3).trim() + '...';
}

export default SchemaFactory;
