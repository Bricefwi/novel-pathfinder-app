import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";

export const FloatingHelpButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the FAQ page itself
  if (location.pathname === "/agent-faq") {
    return null;
  }

  return (
    <Button
      onClick={() => navigate("/agent-faq")}
      className="fixed bottom-6 right-6 z-50 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 gap-2 px-5"
      size="lg"
    >
      <MessageCircleQuestion className="h-5 w-5" />
      <span className="hidden sm:inline">Besoin d'aide ?</span>
    </Button>
  );
};
