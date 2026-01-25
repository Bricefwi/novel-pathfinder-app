import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoAnArwen from "@/assets/logo-an-arwen.png";

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

export const generateQuotePDF = (data: QuoteData): string => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "À définir";
    return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
  };

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${data.quote_number}</title>
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
    .deposit-row { 
      background: #C9B896 !important; 
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
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      padding: 20px;
      border: 1px dashed #ccc;
      min-height: 100px;
    }
    .signature-box h4 { 
      font-size: 10px; 
      color: #666;
      margin-bottom: 40px;
    }
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
    .validity {
      display: inline-block;
      padding: 10px 20px;
      background: #C9B896;
      color: #333;
      border-radius: 4px;
      font-weight: 600;
      margin-top: 20px;
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
      <p>POTTIER Arwen</p>
      <p>Guide Équestre Indépendant</p>
      <p>Bretagne, France</p>
      <p>contact@ferme-equestre-arwen.com</p>
    </div>
  </div>

  <h1 class="document-title">DEVIS N° ${data.quote_number}</h1>
  <p style="text-align: center; color: #666;">Établi le ${formatDate(data.created_at)}</p>

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
      <p><strong>Devis n° :</strong> ${data.quote_number}</p>
      <p><strong>Date d'émission :</strong> ${formatDate(data.created_at)}</p>
      <p><strong>Validité :</strong> ${data.valid_until ? formatDate(data.valid_until) : "30 jours"}</p>
    </div>
  </div>

  <div class="prestations">
    <h3>Prestations</h3>
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
          <td class="text-right">${data.total_price.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td>Total HT</td>
        <td class="text-right">${data.total_price.toFixed(2)} €</td>
      </tr>
      <tr>
        <td>TVA (Non applicable)</td>
        <td class="text-right">0,00 €</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL TTC</td>
        <td class="text-right">${data.total_price.toFixed(2)} €</td>
      </tr>
      <tr class="deposit-row">
        <td>Acompte à verser (${data.deposit_percentage}%)</td>
        <td class="text-right">${data.deposit_amount.toFixed(2)} €</td>
      </tr>
    </table>
  </div>

  <div class="payment-info">
    <h3>Modalités de paiement</h3>
    <p><strong>Option choisie :</strong> ${paymentOptionLabels[data.payment_option] || data.payment_option}</p>
    <p>Un acompte de ${data.deposit_percentage}% (${data.deposit_amount.toFixed(2)} €) est requis pour confirmer la réservation.</p>
    <p>Le solde de ${(data.total_price - data.deposit_amount).toFixed(2)} € sera dû au plus tard 30 jours avant le départ.</p>
  </div>

  ${data.notes ? `
  <div class="payment-info">
    <h3>Notes</h3>
    <p>${data.notes}</p>
  </div>
  ` : ""}

  <p class="validity">Ce devis est valable jusqu'au ${data.valid_until ? formatDate(data.valid_until) : "30 jours après émission"}</p>

  <div class="conditions">
    <h3>CONDITIONS GÉNÉRALES DE VENTE (Extrait)</h3>
    
    <h4>Article 1 – Statut du prestataire</h4>
    <p>POTTIER Arwen exerce son activité en qualité de guide équestre indépendant, en tant que prestataire de services. Les prestations proposées consistent en l'encadrement équestre, la mise à disposition des chevaux et l'organisation technique de randonnées équestres.</p>
    
    <h4>Article 3 – Réservation</h4>
    <p>La réservation devient ferme et définitive après validation écrite et versement de l'acompte de ${data.deposit_percentage}% du montant total.</p>
    
    <h4>Article 6 – Annulation par le client</h4>
    <p>• Plus de 60 jours avant le départ : 30% du montant total<br/>
    • De 30 à 60 jours avant le départ : 50% du montant total<br/>
    • Moins de 30 jours avant le départ : 100% du montant total</p>
    
    <h4>Article 8 – Assurances</h4>
    <p>Le participant reconnaît avoir été informé qu'il lui appartient de souscrire une assurance individuelle accident, responsabilité civile personnelle et assistance.</p>
    
    <p style="margin-top: 15px;"><strong>Les conditions générales complètes sont disponibles sur notre site : ferme-equestre-an-arwen.com/cgv</strong></p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <h4>Le Client (Bon pour accord)</h4>
      <p style="font-size: 9px; color: #999;">Date et signature précédées de la mention "Lu et approuvé"</p>
    </div>
    <div class="signature-box">
      <h4>Le Prestataire</h4>
      <p style="margin-top: 20px;">POTTIER Arwen</p>
      <p style="font-size: 9px;">Ferme Équestre An Arwen</p>
    </div>
  </div>

  <div class="footer">
    <p>Ferme Équestre An Arwen – POTTIER Arwen – Guide Équestre Indépendant</p>
    <p>SIRET : 80266354200016 – TVA non applicable, art. 293 B du CGI</p>
    <p>contact@ferme-equestre-arwen.com – www.ferme-equestre-arwen.com</p>
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
