import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Quote {
  id: string;
  status: string;
  activity_title: string;
  client_email: string;
}

interface UseQuoteRealtimeOptions {
  userEmail: string;
  onQuoteUpdate?: (quote: Quote) => void;
}

export const useQuoteRealtime = ({ userEmail, onQuoteUpdate }: UseQuoteRealtimeOptions) => {
  const previousStatusRef = useRef<Map<string, string>>(new Map());

  const triggerCelebration = useCallback((activityTitle: string) => {
    // Fire confetti 🎉
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Fire from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#6B8E7F', '#C9B896', '#8B7D6B', '#10b981', '#f59e0b'],
      });
      
      // Fire from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#6B8E7F', '#C9B896', '#8B7D6B', '#10b981', '#f59e0b'],
      });
    }, 250);

    // Show success toast
    toast.success(
      `🎉 Bonne nouvelle ! Votre devis pour "${activityTitle}" a été validé par l'équipe.`,
      {
        duration: 5000,
        position: "top-center",
      }
    );
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    // Subscribe to quotes changes
    const channel = supabase
      .channel('quotes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `client_email=eq.${userEmail}`,
        },
        (payload) => {
          const newQuote = payload.new as Quote;
          const oldQuote = payload.old as Quote;

          // Check if status changed to validated/accepted
          const validatedStatuses = ['validated', 'accepted', 'signed'];
          const pendingStatuses = ['pending', 'sent', 'draft'];
          
          const wasNotValidated = pendingStatuses.includes(oldQuote.status);
          const isNowValidated = validatedStatuses.includes(newQuote.status);

          if (wasNotValidated && isNowValidated) {
            triggerCelebration(newQuote.activity_title);
          }

          // Update local state
          if (onQuoteUpdate) {
            onQuoteUpdate(newQuote);
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail, onQuoteUpdate, triggerCelebration]);

  return null;
};

export default useQuoteRealtime;
