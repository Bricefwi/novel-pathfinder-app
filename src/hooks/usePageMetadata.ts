import { useMemo } from 'react';

interface MetadataResult {
  title: string;
  fullTitle: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
}

type EntityType = 'activity' | 'article' | 'ecosystem' | 'page' | 'accommodation';

const siteUrl = "https://www.ferme-equestre-an-arwen.com";
const siteName = "Ferme Équestre An Arwen";

/**
 * Hook utilitaire pour générer automatiquement les métadonnées SEO
 * à partir des données de la base de données
 */
export function usePageMetadata(entity: Record<string, any> | null, type: EntityType): MetadataResult {
  return useMemo(() => {
    if (!entity) {
      return getDefaultMetadata();
    }

    switch (type) {
      case 'activity':
        return generateActivityMetadata(entity);
      case 'article':
        return generateArticleMetadata(entity);
      case 'ecosystem':
        return generateEcosystemMetadata(entity);
      case 'accommodation':
        return generateAccommodationMetadata(entity);
      case 'page':
      default:
        return generatePageMetadata(entity);
    }
  }, [entity, type]);
}

function getDefaultMetadata(): MetadataResult {
  return {
    title: "Randonnées à Cheval Bretagne & Maroc",
    fullTitle: `Randonnées à Cheval Bretagne & Maroc | ${siteName}`,
    description: "Randonnées équestres en Bretagne et au Maroc. Galops sur les plages bretonnes, traversées du désert marocain. Hébergement yourte insolite. +25 ans d'expérience.",
    keywords: "randonnée équestre Bretagne, cheval plage Bretagne, séjour équestre Maroc, yourte Bretagne",
    canonicalUrl: siteUrl,
    ogImage: `${siteUrl}/og-image.jpg`,
    ogType: "website"
  };
}

/**
 * Métadonnées pour les activités/séjours
 */
function generateActivityMetadata(entity: Record<string, any>): MetadataResult {
  const {
    title,
    slug,
    short_description,
    description,
    region,
    country,
    price_from,
    featured_image,
    activity_type
  } = entity;

  // Template intelligent pour le titre
  const locationPart = region ? ` - ${region}` : '';
  const countryPart = country && country !== 'France' ? ` (${country})` : '';
  const seoTitle = `${title}${locationPart}${countryPart}`;

  // Description optimisée avec CTA
  const baseDescription = short_description || description || '';
  const cleanDescription = truncateAndClean(baseDescription, 140);
  const cta = price_from ? ` Dès ${price_from}€. Réservez maintenant !` : ' Demandez un devis gratuit !';
  const fullDescription = cleanDescription + cta;

  // Keywords dynamiques
  const keywords = generateActivityKeywords(entity);

  // Image OG
  const ogImage = resolveImageUrl(featured_image);

  return {
    title: seoTitle,
    fullTitle: `${seoTitle} | ${siteName}`,
    description: fullDescription.length > 160 ? fullDescription.substring(0, 157) + '...' : fullDescription,
    keywords,
    canonicalUrl: `${siteUrl}/destinations/${slug}`,
    ogImage,
    ogType: "product"
  };
}

/**
 * Métadonnées pour les articles du blog
 */
function generateArticleMetadata(entity: Record<string, any>): MetadataResult {
  const {
    title,
    slug,
    excerpt,
    content,
    category,
    tags = [],
    featured_image
  } = entity;

  const seoTitle = title;
  const description = truncateAndClean(excerpt || content, 155) + ' Découvrez notre récit.';
  
  // Keywords basés sur les tags et catégorie
  const keywordParts = [...tags];
  if (category) keywordParts.unshift(category);
  keywordParts.push('récit voyage', 'carnet voyage cheval', 'blog équestre');
  const keywords = keywordParts.slice(0, 10).join(', ');

  return {
    title: seoTitle,
    fullTitle: `${seoTitle} | Carnet de Voyage | ${siteName}`,
    description,
    keywords,
    canonicalUrl: `${siteUrl}/carnet-voyage/${slug}`,
    ogImage: resolveImageUrl(featured_image),
    ogType: "article"
  };
}

/**
 * Métadonnées pour les articles Éco-Système
 */
function generateEcosystemMetadata(entity: Record<string, any>): MetadataResult {
  const {
    title,
    slug,
    excerpt,
    content,
    category,
    tags = [],
    featured_image,
    featured_image_override,
    location_name,
    distance_from_arwen
  } = entity;

  // Titre enrichi avec la localisation
  const locationPart = location_name ? ` - ${location_name}` : '';
  const seoTitle = `${title}${locationPart}`;

  // Description avec contexte géographique
  const baseDesc = truncateAndClean(excerpt || content, 120);
  const distancePart = distance_from_arwen ? ` À ${distance_from_arwen} de notre ferme.` : '';
  const description = `${baseDesc}${distancePart} Découvrez ce lieu breton.`;

  // Keywords enrichis
  const keywordParts = [...tags];
  if (category) keywordParts.unshift(category);
  if (location_name) keywordParts.push(location_name);
  keywordParts.push('Bretagne', 'éco-tourisme', 'tourisme responsable');
  const keywords = [...new Set(keywordParts)].slice(0, 10).join(', ');

  const image = featured_image_override || featured_image;

  return {
    title: seoTitle,
    fullTitle: `${seoTitle} | Éco-Système Breton | ${siteName}`,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords,
    canonicalUrl: `${siteUrl}/eco-systeme/${slug}`,
    ogImage: resolveImageUrl(image),
    ogType: "article"
  };
}

/**
 * Métadonnées pour l'hébergement
 */
function generateAccommodationMetadata(entity: Record<string, any>): MetadataResult {
  const {
    name = "Yourte An Arwen",
    description: desc,
    price_per_night,
    featured_image
  } = entity;

  const pricePart = price_per_night ? ` Dès ${price_per_night}€/nuit.` : '';
  const description = `${truncateAndClean(desc || "Dormez dans une authentique yourte mongole en Bretagne.", 130)}${pricePart} Réservez votre nuit insolite !`;

  return {
    title: name,
    fullTitle: `${name} - Hébergement Insolite Bretagne | ${siteName}`,
    description,
    keywords: "yourte Bretagne, hébergement insolite Bretagne, glamping Bretagne, nuit yourte, hébergement écologique, dormir yourte Ille-et-Vilaine",
    canonicalUrl: `${siteUrl}/hebergement`,
    ogImage: resolveImageUrl(featured_image),
    ogType: "product"
  };
}

/**
 * Métadonnées pour les pages statiques
 */
function generatePageMetadata(entity: Record<string, any>): MetadataResult {
  const { title, description, keywords, slug, image } = entity;

  return {
    title: title || 'Page',
    fullTitle: title ? `${title} | ${siteName}` : siteName,
    description: description || getDefaultMetadata().description,
    keywords: keywords || getDefaultMetadata().keywords,
    canonicalUrl: slug ? `${siteUrl}/${slug}` : siteUrl,
    ogImage: resolveImageUrl(image),
    ogType: "website"
  };
}

// ============ HELPERS ============

function truncateAndClean(text: string | null, maxLength: number): string {
  if (!text) return '';
  // Supprimer les balises HTML et les marqueurs [IMAGE_X]
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/\[IMAGE_\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Couper au dernier mot complet
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated).trim() + '...';
}

function resolveImageUrl(image: string | null | undefined): string {
  if (!image) return `${siteUrl}/og-image.jpg`;
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return `${siteUrl}${image}`;
  return `${siteUrl}/${image}`;
}

function generateActivityKeywords(entity: Record<string, any>): string {
  const parts: string[] = [];
  
  if (entity.region) parts.push(`randonnée cheval ${entity.region}`);
  if (entity.country) parts.push(`séjour équestre ${entity.country}`);
  if (entity.activity_type) {
    const typeMap: Record<string, string> = {
      'randonnee': 'randonnée équestre',
      'stage': 'stage équitation',
      'sejour': 'vacances à cheval'
    };
    parts.push(typeMap[entity.activity_type] || entity.activity_type);
  }
  if (entity.riding_level) {
    const levelMap: Record<string, string> = {
      'debutant': 'randonnée cheval débutant',
      'confirme': 'randonnée cheval confirmé'
    };
    if (levelMap[entity.riding_level]) parts.push(levelMap[entity.riding_level]);
  }
  
  // Ajouter des mots-clés génériques
  parts.push('tourisme équestre', 'vacances cheval France');
  
  return [...new Set(parts)].slice(0, 10).join(', ');
}

export default usePageMetadata;
