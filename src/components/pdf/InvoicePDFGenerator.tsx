import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoAnArwen from "@/assets/logo-an-arwen.png";

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

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente de paiement", color: "#f59e0b" },
  partial: { label: "Partiellement payé", color: "#3b82f6" },
  paid: { label: "Payé", color: "#10b981" },
};

export const generateInvoicePDF = (data: InvoiceData): string => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Non défini";
    return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
  };

  const status = paymentStatusLabels[data.payment_status] || paymentStatusLabels.pending;
  const remainingAmount = data.total_amount - data.amount_paid;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.5;
      color: #333;
      padding: 40px;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 40px;
      border-bottom: 2px solid #6B8E7F;
      padding-bottom: 20px;
    }
    .logo { height: 80px; }
    .company-info { text-align: right; }
    .company-name { font-size: 18px; font-weight: bold; color: #6B8E7F; }
    .document-title { 
      font-size: 24px; 
      font-weight: bold; 
      color: #6B8E7F; 
      text-align: center;
      margin: 30px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background: ${status.color};
      color: white;
      border-radius: 20px;
      font-weight: 600;
      margin: 10px auto;
    }
    .info-section { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 30px; 
    }
    .info-box { 
      width: 48%; 
      padding: 15px; 
      background: #f8f7f5;
      border-radius: 8px;
    }
    .info-box h3 { 
      font-size: 12px; 
      color: #6B8E7F; 
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-box p { margin: 5px 0; }
    .prestations { margin: 30px 0; }
    .prestations h3 { 
      font-size: 14px; 
      color: #6B8E7F; 
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
    }
    th { 
      background: #6B8E7F; 
      color: white; 
      padding: 12px 8px; 
      text-align: left;
      font-weight: 600;
    }
    td { 
      padding: 12px 8px; 
      border-bottom: 1px solid #e0e0e0; 
    }
    tr:nth-child(even) { background: #fafafa; }
    .text-right { text-align: right; }
    .totals { 
      margin-top: 30px; 
      text-align: right;
    }
    .totals-table { 
      margin-left: auto;
      width: 300px;
    }
    .totals-table td { padding: 8px; }
    .total-row { 
      font-weight: bold; 
      font-size: 14px;
      background: #6B8E7F !important;
      color: white;
    }
    .paid-row { 
      background: #10b981 !important; 
      color: white;
      font-weight: 600;
    }
    .remaining-row { 
      background: ${remainingAmount > 0 ? '#f59e0b' : '#10b981'} !important; 
      color: white;
      font-weight: 600;
    }
    .payment-info {
      margin: 30px 0;
      padding: 20px;
      background: #f0f7f4;
      border-radius: 8px;
      border-left: 4px solid #6B8E7F;
    }
    .payment-info h3 { color: #6B8E7F; margin-bottom: 10px; }
    .validation-section {
      margin: 30px 0;
      padding: 20px;
      background: ${data.client_validated ? '#f0fdf4' : '#fef3c7'};
      border-radius: 8px;
      border-left: 4px solid ${data.client_validated ? '#10b981' : '#f59e0b'};
    }
    .validation-section h3 { 
      color: ${data.client_validated ? '#10b981' : '#f59e0b'}; 
      margin-bottom: 10px; 
    }
    .conditions { 
      margin-top: 40px;
      padding: 20px;
      background: #f8f7f5;
      border-radius: 8px;
      font-size: 9px;
      line-height: 1.6;
    }
    .conditions h3 { 
      font-size: 11px;
      color: #6B8E7F; 
      margin-bottom: 10px;
    }
    .conditions h4 {
      font-size: 10px;
      color: #333;
      margin: 15px 0 5px;
    }
    .legal-acceptance {
      margin: 20px 0;
      padding: 15px;
      background: #f0f7f4;
      border-radius: 8px;
    }
    .legal-acceptance p {
      display: flex;
      align-items: center;
      margin: 8px 0;
    }
    .checkmark {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin-right: 10px;
      text-align: center;
      line-height: 20px;
      font-weight: bold;
    }
    .checkmark.valid { background: #10b981; color: white; }
    .checkmark.invalid { background: #ef4444; color: white; }
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${logoAnArwen}" alt="Ferme Équestre An Arwen" class="logo" />
    </div>
    <div class="company-info">
      <p class="company-name">Ferme Équestre An Arwen</p>
      <p>RAUBER Arwen</p>
      <p>Guide Équestre Indépendant</p>
      <p>Bretagne, France</p>
      <p>contact@ferme-equestre-an-arwen.com</p>
    </div>
  </div>

  <h1 class="document-title">FACTURE N° ${data.invoice_number}</h1>
  <p style="text-align: center; color: #666;">Établie le ${formatDate(data.created_at)}</p>
  <p style="text-align: center; margin-top: 10px;">
    <span class="status-badge">${status.label}</span>
  </p>

  <div class="info-section">
    <div class="info-box">
      <h3>Client</h3>
      <p><strong>${data.client_name}</strong></p>
      <p>${data.client_email}</p>
      ${data.client_phone ? `<p>Tél : ${data.client_phone}</p>` : ""}
      ${data.client_address ? `<p>${data.client_address}</p>` : ""}
    </div>
    <div class="info-box">
      <h3>Informations</h3>
      <p><strong>Facture n° :</strong> ${data.invoice_number}</p>
      ${data.quote_number ? `<p><strong>Devis n° :</strong> ${data.quote_number}</p>` : ""}
      <p><strong>Date d'émission :</strong> ${formatDate(data.created_at)}</p>
      ${data.due_date ? `<p><strong>Échéance :</strong> ${formatDate(data.due_date)}</p>` : ""}
    </div>
  </div>

  <div class="validation-section">
    <h3>${data.client_validated ? '✓ Validé par le client' : '⏳ En attente de validation client'}</h3>
    ${data.client_validated && data.client_validated_at ? `
      <p>Validation effectuée le ${formatDate(data.client_validated_at)}</p>
    ` : `
      <p>Le client doit valider cette facture pour confirmer les conditions de la prestation.</p>
    `}
  </div>

  <div class="prestations">
    <h3>Détail de la prestation</h3>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Durée</th>
          <th>Dates</th>
          <th class="text-right">Prix unitaire</th>
          <th class="text-right">Qté</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${data.activity_title}</strong></td>
          <td>${data.activity_duration || "-"}</td>
          <td>${data.start_date ? `${formatDate(data.start_date)} - ${formatDate(data.end_date)}` : "À définir"}</td>
          <td class="text-right">${data.unit_price.toFixed(2)} €</td>
          <td class="text-right">${data.participants}</td>
          <td class="text-right">${data.subtotal.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td>Sous-total HT</td>
        <td class="text-right">${data.subtotal.toFixed(2)} €</td>
      </tr>
      <tr>
        <td>TVA (${data.tax_rate}%)</td>
        <td class="text-right">${data.tax_amount.toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL TTC</td>
        <td class="text-right">${data.total_amount.toFixed(2)} €</td>
      </tr>
      ${data.amount_paid > 0 ? `
      <tr class="paid-row">
        <td>Montant réglé</td>
        <td class="text-right">- ${data.amount_paid.toFixed(2)} €</td>
      </tr>
      ` : ""}
      <tr class="remaining-row">
        <td>Reste à payer</td>
        <td class="text-right">${remainingAmount.toFixed(2)} €</td>
      </tr>
    </table>
  </div>

  ${data.payment_date ? `
  <div class="payment-info">
    <h3>Informations de paiement</h3>
    <p><strong>Date de paiement :</strong> ${formatDate(data.payment_date)}</p>
    ${data.payment_method ? `<p><strong>Mode de paiement :</strong> ${data.payment_method}</p>` : ""}
    <p><strong>Montant réglé :</strong> ${data.amount_paid.toFixed(2)} €</p>
  </div>
  ` : ""}

  <div class="legal-acceptance">
    <h3 style="color: #6B8E7F; margin-bottom: 15px;">Acceptation des conditions</h3>
    <p>
      <span class="checkmark ${data.cgu_accepted ? 'valid' : 'invalid'}">${data.cgu_accepted ? '✓' : '✗'}</span>
      Conditions Générales d'Utilisation (CGU) ${data.cgu_accepted ? 'acceptées' : 'non acceptées'}
    </p>
    <p>
      <span class="checkmark ${data.cgv_accepted ? 'valid' : 'invalid'}">${data.cgv_accepted ? '✓' : '✗'}</span>
      Conditions Générales de Vente (CGV) ${data.cgv_accepted ? 'acceptées' : 'non acceptées'}
    </p>
  </div>

  ${data.notes ? `
  <div class="payment-info">
    <h3>Notes</h3>
    <p>${data.notes}</p>
  </div>
  ` : ""}

  <div class="conditions">
    <h3>CONDITIONS GÉNÉRALES DE VENTE (Extrait)</h3>
    
    <h4>Article 1 – Statut du prestataire</h4>
    <p>RAUBER Arwen exerce son activité en qualité de guide équestre indépendant. Les prestations consistent en l'encadrement équestre, la mise à disposition des chevaux et l'organisation technique de randonnées équestres.</p>
    
    <h4>Article 5 – Modalités de paiement</h4>
    <p>Le règlement peut être effectué par virement bancaire, chèque, paiement électronique sécurisé ou espèces. Tout retard de paiement entraîne l'exigibilité immédiate des sommes dues.</p>
    
    <h4>Article 6 – Annulation par le client</h4>
    <p>• Plus de 60 jours avant le départ : 30% du montant total<br/>
    • De 30 à 60 jours avant le départ : 50% du montant total<br/>
    • Moins de 30 jours avant le départ : 100% du montant total</p>
    
    <h4>Article 8 – Assurances</h4>
    <p>Le participant reconnaît qu'il lui appartient de souscrire une assurance individuelle accident et responsabilité civile personnelle.</p>
    
    <h4>Article 9 – Responsabilité</h4>
    <p>Le participant reconnaît que l'équitation comporte des risques inhérents, même en présence d'un encadrement professionnel.</p>
    
    <p style="margin-top: 15px;"><strong>Les conditions générales complètes sont disponibles sur : ferme-equestre-an-arwen.com/cgv et ferme-equestre-an-arwen.com/cgu</strong></p>
  </div>

  <div class="footer">
    <p>Ferme Équestre An Arwen – RAUBER Arwen – Guide Équestre Indépendant</p>
    <p>SIRET : [À compléter] – TVA non applicable, art. 293 B du CGI</p>
    <p>contact@ferme-equestre-an-arwen.com – www.ferme-equestre-an-arwen.com</p>
    <p style="margin-top: 10px;">En cas de litige, les tribunaux du ressort du domicile professionnel de RAUBER Arwen sont compétents.</p>
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
