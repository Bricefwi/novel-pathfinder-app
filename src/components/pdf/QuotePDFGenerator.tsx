import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COMPANY_CONFIG } from "@/config/constants";
import pdfLogo from "@/assets/logo-cheval-pdf.png";

export interface QuoteData {
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  activity_title: string;
  activity_duration?: string;
  start_date?: string;
  end_date?: string;
  unit_price: number;
  participants: number;
  total_price: number;
  deposit_amount: number;
  deposit_percentage: number;
  payment_option: string;
  valid_until?: string;
  notes?: string;
  created_at: string;
}

const paymentOptionLabels: Record<string, string> = {
  deposit: "Acompte",
  full: "Paiement comptant",
  installments: "Paiement en 3 fois",
};

// Logo SVG inline pour garantir l'affichage dans le PDF
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="180" height="108">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#C9A227"/>
      <stop offset="50%" style="stop-color:#B8860B"/>
      <stop offset="100%" style="stop-color:#8B6914"/>
    </linearGradient>
    <linearGradient id="brownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B4513"/>
      <stop offset="100%" style="stop-color:#654321"/>
    </linearGradient>
  </defs>
  <!-- Cercle extérieur -->
  <ellipse cx="100" cy="50" rx="45" ry="42" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>
  <!-- Soleil -->
  <circle cx="135" cy="22" r="8" fill="none" stroke="url(#goldGrad)" stroke-width="2"/>
  <!-- Crinière -->
  <path d="M65 35 Q50 25 55 45 Q45 35 52 55 Q42 48 50 62 L70 50 Z" fill="url(#goldGrad)"/>
  <!-- Tête du cheval -->
  <path d="M70 30 Q85 20 100 30 Q110 35 115 50 Q118 65 105 75 Q95 80 85 75 Q75 72 70 60 Q65 45 70 30" fill="url(#brownGrad)"/>
  <!-- Oreille -->
  <path d="M78 28 Q82 18 88 25 L85 32 Z" fill="url(#brownGrad)"/>
  <!-- Nez -->
  <ellipse cx="110" cy="58" rx="3" ry="2" fill="#C9A227"/>
  <!-- Texte -->
  <text x="100" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-style="italic" fill="#B8860B">Ferme équestre</text>
  <text x="100" y="115" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-style="italic" font-weight="bold" fill="#B8860B">an Arwen</text>
</svg>`;

export const generateQuotePDF = (data: QuoteData): string => {
  const logoUrl =
    typeof window !== "undefined"
      ? new URL(pdfLogo, window.location.origin).toString()
      : pdfLogo;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "À définir";
    return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${data.quote_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10px; 
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
    }
    
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 50px;
    }
    
    /* En-tête avec logo et infos entreprise */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 25px;
      border-bottom: 3px solid #B8860B;
      margin-bottom: 30px;
    }
    
    .logo-section {
      flex-shrink: 0;
    }

    .logo-img {
      display: block;
      width: 120px;
      height: auto;
      object-fit: contain;
    }
    
    .company-section {
      text-align: right;
      padding-left: 20px;
    }
    
    .company-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      color: #B8860B;
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 9px;
      color: #6b7280;
      line-height: 1.7;
    }
    
    /* Titre du document */
    .document-header {
      text-align: center;
      margin: 35px 0;
      padding: 25px;
      background: linear-gradient(135deg, #fef9e7 0%, #f8f4e3 100%);
      border-radius: 12px;
      border: 1px solid #e5d9b6;
    }
    
    .document-type {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      color: #8B4513;
      letter-spacing: 3px;
      margin-bottom: 8px;
    }
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      color: #B8860B;
      margin-bottom: 10px;
    }
    
    .document-date {
      font-size: 10px;
      color: #6b7280;
    }
    
    .validity-badge {
      display: inline-block;
      padding: 10px 25px;
      background: linear-gradient(135deg, #C9B896 0%, #B8A67A 100%);
      color: #3d2e1a;
      border-radius: 25px;
      font-weight: 600;
      font-size: 11px;
      margin-top: 15px;
    }
    
    /* Sections d'informations */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 30px;
    }
    
    .info-card {
      padding: 20px;
      background: #fafafa;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
    }
    
    .info-card.highlight {
      background: linear-gradient(135deg, #f0f7f4 0%, #e8f5e9 100%);
      border-color: #6B8E7F40;
    }
    
    .info-card-title {
      font-size: 9px;
      font-weight: 600;
      color: #B8860B;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #B8860B30;
    }
    
    .info-card-content {
      font-size: 10px;
    }
    
    .info-card-content strong {
      color: #1f2937;
      font-weight: 600;
    }
    
    .info-card-content p {
      margin: 4px 0;
      color: #4b5563;
    }
    
    .client-name {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 6px;
    }
    
    /* Tableau de prestations */
    .prestations-section {
      margin: 30px 0;
    }
    
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px;
      font-weight: 600;
      color: #8B4513;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #B8860B30;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10px;
    }
    
    thead th {
      background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    thead th:first-child {
      border-radius: 8px 0 0 0;
    }
    
    thead th:last-child {
      border-radius: 0 8px 0 0;
    }
    
    tbody td {
      padding: 14px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    tbody tr:last-child td:first-child {
      border-radius: 0 0 0 8px;
    }
    
    tbody tr:last-child td:last-child {
      border-radius: 0 0 8px 0;
    }
    
    .text-right {
      text-align: right;
    }
    
    .activity-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    .activity-dates {
      font-size: 9px;
      color: #6b7280;
      margin-top: 4px;
    }
    
    /* Totaux */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin: 30px 0;
    }
    
    .totals-table {
      width: 320px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    
    .totals-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .totals-table tr:last-child td {
      border-bottom: none;
    }
    
    .total-row {
      background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
      color: white;
      font-weight: 700;
      font-size: 14px;
    }
    
    .deposit-row {
      background: linear-gradient(135deg, #C9B896 0%, #B8A67A 100%);
      color: #3d2e1a;
      font-weight: 600;
      font-size: 12px;
    }
    
    /* Sections d'information */
    .info-section {
      margin: 25px 0;
      padding: 20px;
      background: linear-gradient(135deg, #f0f7f4 0%, #e8f5e9 100%);
      border-radius: 10px;
      border-left: 4px solid #6B8E7F;
    }
    
    .info-section h3 {
      font-size: 11px;
      font-weight: 600;
      color: #6B8E7F;
      margin-bottom: 10px;
    }
    
    .info-section p {
      font-size: 10px;
      color: #4b5563;
      margin: 4px 0;
    }
    
    /* Signatures */
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 35px 0;
    }
    
    .signature-box {
      padding: 20px;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      min-height: 100px;
      background: #fafafa;
    }
    
    .signature-box h4 {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .signature-box p {
      font-size: 9px;
      color: #9ca3af;
      margin-top: 40px;
    }
    
    .signature-box .prestataire {
      font-size: 11px;
      color: #374151;
      font-weight: 500;
      margin-top: 30px;
    }
    
    /* Conditions */
    .conditions-section {
      margin-top: 30px;
      padding: 20px;
      background: #f8f7f5;
      border-radius: 10px;
      font-size: 8px;
      line-height: 1.7;
    }
    
    .conditions-section h3 {
      font-size: 10px;
      font-weight: 600;
      color: #8B4513;
      margin-bottom: 12px;
    }
    
    .conditions-section h4 {
      font-size: 9px;
      font-weight: 600;
      color: #374151;
      margin: 12px 0 5px;
    }
    
    .conditions-section p {
      color: #6b7280;
    }
    
    /* Pied de page */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #B8860B30;
      text-align: center;
      font-size: 8px;
      color: #9ca3af;
    }
    
    .footer p {
      margin: 3px 0;
    }
    
    .footer-brand {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11px;
      color: #B8860B;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 30px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-section">
        <img class="logo-img" src="${logoUrl}" alt="${COMPANY_CONFIG.name}" />
      </div>
      <div class="company-section">
        <div class="company-name">${COMPANY_CONFIG.name}</div>
        <div class="company-details">
          <p>${COMPANY_CONFIG.owner}</p>
          <p>${COMPANY_CONFIG.ownerTitle}</p>
          <p>${COMPANY_CONFIG.address.short}</p>
          <p>📞 ${COMPANY_CONFIG.phone}</p>
          <p>✉️ ${COMPANY_CONFIG.email}</p>
        </div>
      </div>
    </div>

    <div class="document-header">
      <div class="document-type">DEVIS</div>
      <div class="document-number">N° ${data.quote_number}</div>
      <div class="document-date">Établi le ${formatDate(data.created_at)}</div>
      <span class="validity-badge">✓ Valable jusqu'au ${data.valid_until ? formatDate(data.valid_until) : "30 jours"}</span>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">📋 Client</div>
        <div class="info-card-content">
          <div class="client-name">${data.client_name}</div>
          <p>✉️ ${data.client_email}</p>
          ${data.client_phone ? `<p>📞 ${data.client_phone}</p>` : ""}
          ${data.client_address ? `<p>📍 ${data.client_address}</p>` : ""}
        </div>
      </div>
      <div class="info-card highlight">
        <div class="info-card-title">📄 Références</div>
        <div class="info-card-content">
          <p><strong>Devis :</strong> ${data.quote_number}</p>
          <p><strong>Date d'émission :</strong> ${formatDate(data.created_at)}</p>
          <p><strong>Validité :</strong> ${data.valid_until ? formatDate(data.valid_until) : "30 jours"}</p>
        </div>
      </div>
    </div>

    <div class="prestations-section">
      <div class="section-title">🐎 Prestations proposées</div>
      <table>
        <thead>
          <tr>
            <th style="width: 35%">Description</th>
            <th style="width: 15%">Durée</th>
            <th style="width: 20%">Période</th>
            <th class="text-right" style="width: 10%">P.U.</th>
            <th class="text-right" style="width: 8%">Qté</th>
            <th class="text-right" style="width: 12%">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="activity-name">${data.activity_title}</div>
              ${data.start_date ? `<div class="activity-dates">${formatDate(data.start_date)} → ${formatDate(data.end_date)}</div>` : ""}
            </td>
            <td>${data.activity_duration || "—"}</td>
            <td>${data.start_date ? `${formatDate(data.start_date)}` : "À définir"}</td>
            <td class="text-right">${formatCurrency(data.unit_price)}</td>
            <td class="text-right">${data.participants}</td>
            <td class="text-right"><strong>${formatCurrency(data.total_price)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Total HT</td>
          <td class="text-right">${formatCurrency(data.total_price)}</td>
        </tr>
        <tr>
          <td>TVA (Non applicable)</td>
          <td class="text-right">0,00 €</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL TTC</td>
          <td class="text-right">${formatCurrency(data.total_price)}</td>
        </tr>
        <tr class="deposit-row">
          <td><strong>Acompte (${data.deposit_percentage}%)</strong></td>
          <td class="text-right"><strong>${formatCurrency(data.deposit_amount)}</strong></td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <h3>💳 Modalités de paiement</h3>
      <p><strong>Option choisie :</strong> ${paymentOptionLabels[data.payment_option] || data.payment_option}</p>
      <p>Un acompte de <strong>${data.deposit_percentage}%</strong> soit <strong>${formatCurrency(data.deposit_amount)}</strong> est requis pour confirmer la réservation.</p>
      <p>Le solde de <strong>${formatCurrency(data.total_price - data.deposit_amount)}</strong> sera dû au plus tard 30 jours avant le départ.</p>
    </div>

    ${data.notes ? `
    <div class="info-section" style="border-left-color: #C9B896;">
      <h3 style="color: #8B4513;">📝 Notes</h3>
      <p>${data.notes}</p>
    </div>
    ` : ""}

    <div class="signature-section">
      <div class="signature-box">
        <h4>Le Client (Bon pour accord)</h4>
        <p>Date et signature précédées de la mention<br/>"Lu et approuvé"</p>
      </div>
      <div class="signature-box">
        <h4>Le Prestataire</h4>
        <p class="prestataire">${COMPANY_CONFIG.owner}<br/>${COMPANY_CONFIG.name}</p>
      </div>
    </div>

    <div class="conditions-section">
      <h3>CONDITIONS GÉNÉRALES DE VENTE (Extrait)</h3>
      
      <h4>Article 1 – Statut du prestataire</h4>
      <p>${COMPANY_CONFIG.owner} exerce son activité en qualité de guide équestre indépendant, en tant que prestataire de services. Les prestations proposées consistent en l'encadrement équestre, la mise à disposition des chevaux et l'organisation technique de randonnées équestres.</p>
      
      <h4>Article 3 – Réservation</h4>
      <p>La réservation devient ferme et définitive après validation écrite et versement de l'acompte de ${data.deposit_percentage}% du montant total.</p>
      
      <h4>Article 6 – Annulation par le client</h4>
      <p>• Plus de 60 jours avant le départ : 30% du montant total<br/>
      • De 30 à 60 jours avant le départ : 50% du montant total<br/>
      • Moins de 30 jours avant le départ : 100% du montant total</p>
      
      <h4>Article 8 – Assurances</h4>
      <p>Le participant reconnaît avoir été informé qu'il lui appartient de souscrire une assurance individuelle accident, responsabilité civile personnelle et assistance.</p>
      
      <p style="margin-top: 12px;"><strong>Conditions complètes : ferme-equestre-an-arwen.com/cgv</strong></p>
    </div>

    <div class="footer">
      <div class="footer-brand">${COMPANY_CONFIG.name}</div>
      <p>${COMPANY_CONFIG.owner} – ${COMPANY_CONFIG.ownerTitle}</p>
      <p>SIRET : ${COMPANY_CONFIG.registration.siret} – ${COMPANY_CONFIG.registration.tvaStatus}</p>
      <p>${COMPANY_CONFIG.email} – ${COMPANY_CONFIG.urls.website}</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
};

export const downloadQuotePDF = (data: QuoteData) => {
  const html = generateQuotePDF(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
