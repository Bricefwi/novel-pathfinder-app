/**
 * Configuration centralisée de l'entreprise
 * Toutes les informations de l'entreprise doivent être importées depuis ce fichier
 */

export const COMPANY_CONFIG = {
  // Identité
  name: "Ferme Équestre An Arwen",
  shortName: "An Arwen",
  tagline: "Ferme Équestre",
  owner: "RAUBER Arwen",
  ownerTitle: "Guide équestre indépendant",
  
  // Contact
  email: "contact@ferme-equestre-arwen.com",
  phone: "02 99 06 68 68",
  phoneMobile: "06 59 22 62 70",
  phoneInternational: "+33659226270",
  whatsapp: "https://wa.me/33659226270",
  
  // Adresse
  address: {
    street: "5 Le Bignon",
    city: "La Chapelle du Lou du Lac",
    postalCode: "35360",
    country: "France",
    full: "5 Le Bignon, 35360 La Chapelle du Lou du Lac, France",
    short: "5 Le Bignon, 35360 La Chapelle du Lou du Lac",
  },
  
  // Immatriculation
  registration: {
    siret: "80266354200016",
    codeAPE: "9329Z",
    tvaStatus: "Non assujetti à la TVA – article 293 B du Code général des impôts",
  },
  
  // Réseaux sociaux
  social: {
    facebook: "https://www.facebook.com/fermeequestrearwen/",
    instagram: "https://www.instagram.com/fermeequestreanarwen/",
    tiktok: "https://www.tiktok.com/@ferme_equestre_an_arwen",
  },
  
  // Hébergeur
  hosting: {
    name: "Lovable (GPT Engineer Inc.)",
    address: "San Francisco, CA, États-Unis",
  },
  
  // URLs
  urls: {
    website: "https://ferme-equestre-arwen.com",
    app: import.meta.env.VITE_APP_URL || "https://ferme-equestre-arwen.com",
  },
  
  // Carte Google Maps
  maps: {
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2675.0!2d-1.85!3d48.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDE1JzAwLjAiTiAxwrA1MScwMC4wIlc!5e0!3m2!1sfr!2sfr!4v1234567890",
  },
} as const;

// Types pour l'autocomplétion
export type CompanyConfig = typeof COMPANY_CONFIG;
