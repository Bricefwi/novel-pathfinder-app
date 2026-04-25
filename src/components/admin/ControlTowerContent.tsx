import { motion, AnimatePresence } from "framer-motion";
import type { AdminModule } from "./ControlTower";

// Legacy components
import { AdminDashboard } from "./AdminDashboard";
import { AdminActivities } from "./AdminActivities";
import { AdminArticles } from "./AdminArticles";
import { AdminGallery } from "./AdminGallery";
import { AdminChat } from "./AdminChat";
import { AdminAccommodation } from "./AdminAccommodation";
import { AdminReviews } from "./AdminReviews";
import { AdminClientInsights } from "./AdminClientInsights";
import { AdminQuotesInvoices } from "./AdminQuotesInvoices";
import { AdminEcoSysteme } from "./AdminEcoSysteme";
import { AdminLegalAcceptances } from "./AdminLegalAcceptances";

// New Control Tower modules
import { StockManagement } from "./modules/StockManagement";
import { CRM360 } from "./modules/CRM360";
import { UnifiedInbox } from "./modules/UnifiedInbox";
import { MarketingAutomation } from "./modules/MarketingAutomation";
import { AutomationsDashboard } from "./modules/AutomationsDashboard";
import { AnalyticsDashboard } from "./modules/AnalyticsDashboard";
import { TrafficAnalytics } from "./modules/TrafficAnalytics";
import { SiteAudit } from "./modules/SiteAudit";
import { PaymentReminders } from "./modules/PaymentReminders";
import { AccountingDashboard } from "./modules/AccountingDashboard";
import { AccountHealthDashboard } from "./modules/AccountHealthDashboard";
import { Reservations } from "./modules/Reservations";

interface ControlTowerContentProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
}

const AdminDashboardWithNav = ({ onModuleChange }: { onModuleChange: (module: AdminModule) => void }) => {
  return <AdminDashboard onNavigate={onModuleChange} />;
};

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function ControlTowerContent({ activeModule, onModuleChange }: ControlTowerContentProps) {
  const renderModule = () => {
    switch (activeModule) {
      // New Control Tower modules
      case "stocks":
        return <StockManagement />;
      case "crm":
        return <CRM360 />;
      case "inbox":
        return <UnifiedInbox onNavigateToQuotes={(prefill) => {
          // Store prefill data for quotes module
          sessionStorage.setItem("inbox-quote-prefill", JSON.stringify(prefill));
          onModuleChange("quotes");
        }} />;
      case "marketing":
        return <MarketingAutomation />;
      case "automations":
        return <AutomationsDashboard />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "audit":
        return <SiteAudit />;
      case "payment-reminders":
        return <PaymentReminders />;
      case "traffic":
        return <TrafficAnalytics />;
      case "accounting":
        return <AccountingDashboard />;
      case "account-health":
        return <AccountHealthDashboard />;
      
      // Legacy modules
      case "dashboard":
        return <AdminDashboardWithNav onModuleChange={onModuleChange} />;
      case "activities":
        return <AdminActivities />;
      case "articles":
        return <AdminArticles />;
      case "gallery":
        return <AdminGallery />;
      case "reviews":
        return <AdminReviews />;
      case "chat":
        return <AdminChat />;
      case "accommodation":
        return <AdminAccommodation />;
      case "insights":
        return <AdminClientInsights />;
      case "quotes":
        return <AdminQuotesInvoices />;
      case "ecosystem":
        return <AdminEcoSysteme />;
      case "legal":
        return <AdminLegalAcceptances />;
      
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeModule}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2 }}
      >
        {renderModule()}
      </motion.div>
    </AnimatePresence>
  );
}
