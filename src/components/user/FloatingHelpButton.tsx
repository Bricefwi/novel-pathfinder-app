import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  HelpCircle,
  X
} from "lucide-react";

interface FloatingHelpButtonProps {
  onChatOpen: () => void;
}

export const FloatingHelpButton = ({ onChatOpen }: FloatingHelpButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            {open ? (
              <X className="h-6 w-6" />
            ) : (
              <HelpCircle className="h-6 w-6" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3" 
          align="end"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Besoin d'aide ?</p>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => {
                setOpen(false);
                onChatOpen();
              }}
            >
              <MessageCircle className="h-4 w-4 mr-3" />
              Chat Communauté
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              asChild
            >
              <a href="https://wa.me/33659226270" target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4 mr-3" />
                WhatsApp
              </a>
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              asChild
            >
              <a href="mailto:contact@ferme-equestre-an-arwen.com">
                <Mail className="h-4 w-4 mr-3" />
                Email
              </a>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FloatingHelpButton;
