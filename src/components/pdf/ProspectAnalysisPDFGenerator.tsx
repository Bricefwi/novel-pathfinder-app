import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface ProspectAnalysisData {
  clientName: string;
  clientEmail?: string;
  analysisDate: Date;
  eventsAnalyzed: number;
  budgetProbable: string;
  intentionPrincipale: string;
  confiance: string;
  produitsSuggeres: Array<{ nom: string; raison: string }>;
  analyseResume: string;
}

const formatDate = (date: Date): string => {
  return format(date, "dd MMMM yyyy 'à' HH:mm", { locale: fr });
};

const getBudgetStyle = (budget: string): { bg: string; text: string } => {
  switch (budget) {
    case "Élevé":
      return { bg: "#dcfce7", text: "#166534" };
    case "Moyen":
      return { bg: "#fef3c7", text: "#92400e" };
    case "Éco":
      return { bg: "#dbeafe", text: "#1e40af" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
};

const getConfianceStyle = (confiance: string): { bg: string; text: string } => {
  switch (confiance) {
    case "haute":
      return { bg: "#dcfce7", text: "#166534" };
    case "moyenne":
      return { bg: "#fef3c7", text: "#92400e" };
    case "faible":
      return { bg: "#fee2e2", text: "#991b1b" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
};

export const generateProspectAnalysisPDF = (data: ProspectAnalysisData): string => {
  const budgetStyle = getBudgetStyle(data.budgetProbable);
  const confianceStyle = getConfianceStyle(data.confiance);

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Analyse Prospect IA - ${data.clientName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          padding: 40px;
          background: #fff;
        }
        .header {
          border-bottom: 3px solid #8b5e3c;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #8b5e3c;
          font-family: Georgia, serif;
        }
        .report-badge {
          background: linear-gradient(135deg, #8b5e3c, #a67c52);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-top: 15px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-top: 5px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #8b5e3c;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e5e7eb;
        }
        .client-info {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .info-item {
          font-size: 14px;
        }
        .info-label {
          color: #6b7280;
          font-size: 12px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .metric-card {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .metric-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 15px;
          display: inline-block;
        }
        .products-list {
          background: #f9fafb;
          border-radius: 8px;
          overflow: hidden;
        }
        .product-item {
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        .product-item:last-child {
          border-bottom: none;
        }
        .product-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        .product-reason {
          font-size: 13px;
          color: #6b7280;
        }
        .summary-box {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }
        .summary-text {
          font-style: italic;
          color: #78350f;
          font-size: 15px;
          line-height: 1.7;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
        }
        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ede9fe;
          color: #7c3aed;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 15px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .metric-card {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <div class="company-name">Ferme Équestre An Arwen</div>
          <div class="report-badge">RAPPORT IA</div>
        </div>
        <div class="title">Analyse Comportementale Prospect</div>
        <div class="subtitle">Généré le ${formatDate(data.analysisDate)}</div>
      </div>

      <div class="section">
        <div class="section-title">Informations Client</div>
        <div class="client-info">
          <div class="info-item">
            <div class="info-label">Nom du client</div>
            <strong>${data.clientName}</strong>
          </div>
          ${data.clientEmail ? `
          <div class="info-item">
            <div class="info-label">Email</div>
            ${data.clientEmail}
          </div>
          ` : ''}
          <div class="info-item">
            <div class="info-label">Événements analysés</div>
            <strong>${data.eventsAnalyzed}</strong> interactions
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Résultats de l'Analyse IA</div>
        <div class="ai-badge">
          ✨ Analyse par Intelligence Artificielle
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Budget Probable</div>
            <div class="metric-value" style="background: ${budgetStyle.bg}; color: ${budgetStyle.text};">
              ${data.budgetProbable}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Intention Principale</div>
            <div class="metric-value" style="background: #f3e8ff; color: #7c3aed;">
              ${data.intentionPrincipale}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Niveau de Confiance</div>
            <div class="metric-value" style="background: ${confianceStyle.bg}; color: ${confianceStyle.text};">
              ${data.confiance.charAt(0).toUpperCase() + data.confiance.slice(1)}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Produits Recommandés</div>
        <div class="products-list">
          ${data.produitsSuggeres.map((produit, index) => `
            <div class="product-item">
              <div class="product-name">${index + 1}. ${produit.nom}</div>
              <div class="product-reason">${produit.raison}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Synthèse de l'Analyse</div>
        <div class="summary-box">
          <div class="summary-text">"${data.analyseResume}"</div>
        </div>
      </div>

      <div class="footer">
        <p>Ce rapport a été généré automatiquement par l'IA de la Ferme Équestre An Arwen</p>
        <p>Document confidentiel - Usage interne uniquement</p>
      </div>
    </body>
    </html>
  `;
};

export const downloadProspectAnalysisPDF = (data: ProspectAnalysisData): void => {
  const htmlContent = generateProspectAnalysisPDF(data);
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
