import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { COMPANY_CONFIG } from "@/config/constants";

export interface InvoiceData {
  invoice_number: string;
  quote_number?: string;
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
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  payment_date?: string;
  payment_method?: string;
  due_date?: string;
  client_validated: boolean;
  client_validated_at?: string;
  cgu_accepted: boolean;
  cgv_accepted: boolean;
  notes?: string;
  created_at: string;
}

const paymentStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente de paiement", color: "#92400e", bg: "#fef3c7" },
  partial: { label: "Partiellement payé", color: "#1e40af", bg: "#dbeafe" },
  paid: { label: "Payé", color: "#166534", bg: "#dcfce7" },
};

export const generateInvoicePDF = (data: InvoiceData): string => {
  // Validation des données requises
  if (!data || !data.invoice_number) {
    console.error("[InvoicePDF] Données de facture manquantes");
    return "";
  }

  const logoUrl =
    typeof window !== "undefined"
      ? new URL("/images/logo-cheval-pdf.png", window.location.origin).toString()
      : "/images/logo-cheval-pdf.png";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Non défini";
    try {
      return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
    } catch {
      return "Date invalide";
    }
  };

  const formatCurrency = (amount?: number) => {
    const safeAmount = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(safeAmount);
  };

  // Valeurs sécurisées avec fallbacks
  const safeData = {
    invoice_number: data.invoice_number || 'N/A',
    quote_number: data.quote_number || null,
    client_name: data.client_name || 'Client non renseigné',
    client_email: data.client_email || 'Email non renseigné',
    client_phone: data.client_phone || null,
    client_address: data.client_address || null,
    activity_title: data.activity_title || 'Prestation',
    activity_duration: data.activity_duration || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    unit_price: data.unit_price ?? 0,
    participants: data.participants ?? 1,
    subtotal: data.subtotal ?? 0,
    tax_rate: data.tax_rate ?? 0,
    tax_amount: data.tax_amount ?? 0,
    total_amount: data.total_amount ?? 0,
    amount_paid: data.amount_paid ?? 0,
    payment_status: data.payment_status || 'pending',
    payment_date: data.payment_date || null,
    payment_method: data.payment_method || null,
    due_date: data.due_date || null,
    client_validated: data.client_validated ?? false,
    client_validated_at: data.client_validated_at || null,
    cgu_accepted: data.cgu_accepted ?? false,
    cgv_accepted: data.cgv_accepted ?? false,
    notes: data.notes || null,
    created_at: data.created_at || new Date().toISOString(),
  };

  const status = paymentStatusLabels[safeData.payment_status] || paymentStatusLabels.pending;
  const remainingAmount = safeData.total_amount - safeData.amount_paid;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.invoice_number}</title>
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
    
    .status-badge {
      display: inline-block;
      padding: 8px 24px;
      background: ${status.bg};
      color: ${status.color};
      border-radius: 25px;
      font-weight: 600;
      font-size: 11px;
      margin-top: 15px;
      border: 1px solid ${status.color}20;
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
    
    .paid-row {
      background: #dcfce7;
      color: #166534;
      font-weight: 600;
    }
    
    .remaining-row {
      background: ${remainingAmount > 0 ? '#fef3c7' : '#dcfce7'};
      color: ${remainingAmount > 0 ? '#92400e' : '#166534'};
      font-weight: 600;
      font-size: 12px;
    }
    
    /* Sections d'information */
    .info-section {
      margin: 25px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      border-left: 4px solid #6B8E7F;
    }
    
    .info-section.validation {
      background: ${data.client_validated ? '#f0fdf4' : '#fef3c7'};
      border-left-color: ${data.client_validated ? '#22c55e' : '#f59e0b'};
    }
    
    .info-section h3 {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }
    
    .info-section p {
      font-size: 10px;
      color: #4b5563;
      margin: 4px 0;
    }
    
    /* Acceptation légale */
    .legal-section {
      margin: 25px 0;
      padding: 18px;
      background: linear-gradient(135deg, #f0f7f4 0%, #e8f5e9 100%);
      border-radius: 10px;
    }
    
    .legal-section h3 {
      font-size: 11px;
      font-weight: 600;
      color: #6B8E7F;
      margin-bottom: 12px;
    }
    
    .legal-item {
      display: flex;
      align-items: center;
      margin: 8px 0;
      font-size: 10px;
    }
    
    .check-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .check-icon.valid {
      background: #22c55e;
      color: white;
    }
    
    .check-icon.invalid {
      background: #ef4444;
      color: white;
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
      <div class="document-type">FACTURE</div>
      <div class="document-number">N° ${safeData.invoice_number}</div>
      <div class="document-date">Établie le ${formatDate(safeData.created_at)}</div>
      <span class="status-badge">${status.label}</span>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">📋 Client</div>
        <div class="info-card-content">
          <div class="client-name">${safeData.client_name}</div>
          <p>✉️ ${safeData.client_email}</p>
          ${safeData.client_phone ? `<p>📞 ${safeData.client_phone}</p>` : ""}
          ${safeData.client_address ? `<p>📍 ${safeData.client_address}</p>` : ""}
        </div>
      </div>
      <div class="info-card highlight">
        <div class="info-card-title">📄 Références</div>
        <div class="info-card-content">
          <p><strong>Facture :</strong> ${safeData.invoice_number}</p>
          ${safeData.quote_number ? `<p><strong>Devis associé :</strong> ${safeData.quote_number}</p>` : ""}
          <p><strong>Date d'émission :</strong> ${formatDate(safeData.created_at)}</p>
          ${safeData.due_date ? `<p><strong>Échéance :</strong> ${formatDate(safeData.due_date)}</p>` : ""}
        </div>
      </div>
    </div>

    <div class="info-section validation">
      <h3>${safeData.client_validated ? '✅ Validé par le client' : '⏳ En attente de validation'}</h3>
      ${safeData.client_validated && safeData.client_validated_at ? `
        <p>Validation effectuée le ${formatDate(safeData.client_validated_at)}</p>
      ` : `
        <p>Le client doit valider cette facture pour confirmer les conditions de la prestation.</p>
      `}
    </div>

    <div class="prestations-section">
      <div class="section-title">🐎 Détail de la prestation</div>
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
              <div class="activity-name">${safeData.activity_title}</div>
              ${safeData.start_date ? `<div class="activity-dates">${formatDate(safeData.start_date)} → ${formatDate(safeData.end_date)}</div>` : ""}
            </td>
            <td>${safeData.activity_duration || "—"}</td>
            <td>${safeData.start_date ? `${formatDate(safeData.start_date)}` : "À définir"}</td>
            <td class="text-right">${formatCurrency(safeData.unit_price)}</td>
            <td class="text-right">${safeData.participants}</td>
            <td class="text-right"><strong>${formatCurrency(safeData.subtotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Sous-total HT</td>
          <td class="text-right">${formatCurrency(safeData.subtotal)}</td>
        </tr>
        <tr>
          <td>TVA (${safeData.tax_rate}%)</td>
          <td class="text-right">${formatCurrency(safeData.tax_amount)}</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL TTC</td>
          <td class="text-right">${formatCurrency(safeData.total_amount)}</td>
        </tr>
        ${safeData.amount_paid > 0 ? `
        <tr class="paid-row">
          <td>Montant réglé</td>
          <td class="text-right">- ${formatCurrency(safeData.amount_paid)}</td>
        </tr>
        ` : ""}
        <tr class="remaining-row">
          <td><strong>RESTE À PAYER</strong></td>
          <td class="text-right"><strong>${formatCurrency(remainingAmount)}</strong></td>
        </tr>
      </table>
    </div>

    ${safeData.payment_date ? `
    <div class="info-section">
      <h3>💳 Informations de paiement</h3>
      <p><strong>Date de paiement :</strong> ${formatDate(safeData.payment_date)}</p>
      ${safeData.payment_method ? `<p><strong>Mode de paiement :</strong> ${safeData.payment_method}</p>` : ""}
      <p><strong>Montant réglé :</strong> ${formatCurrency(safeData.amount_paid)}</p>
    </div>
    ` : ""}

    <div class="legal-section">
      <h3>📜 Acceptation des conditions</h3>
      <div class="legal-item">
        <span class="check-icon ${safeData.cgu_accepted ? 'valid' : 'invalid'}">${safeData.cgu_accepted ? '✓' : '✗'}</span>
        <span>Conditions Générales d'Utilisation (CGU) ${safeData.cgu_accepted ? 'acceptées' : 'non acceptées'}</span>
      </div>
      <div class="legal-item">
        <span class="check-icon ${safeData.cgv_accepted ? 'valid' : 'invalid'}">${safeData.cgv_accepted ? '✓' : '✗'}</span>
        <span>Conditions Générales de Vente (CGV) ${safeData.cgv_accepted ? 'acceptées' : 'non acceptées'}</span>
      </div>
    </div>

    ${safeData.notes ? `
    <div class="info-section">
      <h3>📝 Notes</h3>
      <p>${safeData.notes}</p>
    </div>
    ` : ""}

    <div class="conditions-section">
      <h3>CONDITIONS GÉNÉRALES DE VENTE (Extrait)</h3>
      
      <h4>Article 1 – Statut du prestataire</h4>
      <p>${COMPANY_CONFIG.owner} exerce son activité en qualité de guide équestre indépendant. Les prestations consistent en l'encadrement équestre, la mise à disposition des chevaux et l'organisation technique de randonnées équestres.</p>
      
      <h4>Article 5 – Modalités de paiement</h4>
      <p>Le règlement peut être effectué par virement bancaire, chèque, paiement électronique sécurisé ou espèces. Tout retard de paiement entraîne l'exigibilité immédiate des sommes dues.</p>
      
      <h4>Article 6 – Annulation par le client</h4>
      <p>• Plus de 60 jours avant le départ : 30% du montant total<br/>
      • De 30 à 60 jours avant le départ : 50% du montant total<br/>
      • Moins de 30 jours avant le départ : 100% du montant total</p>
      
      <p style="margin-top: 12px;"><strong>Conditions complètes : ferme-equestre-an-arwen.com/cgv et /cgu</strong></p>
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

export const downloadInvoicePDF = (data: InvoiceData) => {
  const html = generateInvoicePDF(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
