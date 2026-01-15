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

// New Control Tower modules
import { StockManagement } from "./modules/StockManagement";
import { CRM360 } from "./modules/CRM360";
import { UnifiedInbox } from "./modules/UnifiedInbox";
import { MarketingAutomation } from "./modules/MarketingAutomation";
import { AnalyticsDashboard } from "./modules/AnalyticsDashboard";

interface ControlTowerContentProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
}

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
        return <UnifiedInbox />;
      case "marketing":
        return <MarketingAutomation />;
      case "analytics":
        return <AnalyticsDashboard />;
      
      // Legacy modules
      case "dashboard":
        return <AdminDashboard />;
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
