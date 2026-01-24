import confetti from "canvas-confetti";

/**
 * Trigger a celebratory confetti animation
 * Used when user completes their profile to 100%
 */
export const triggerProfileCompleteConfetti = () => {
  // First burst - center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#22c55e'],
  });

  // Second burst - left
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ea580c', '#f97316', '#22c55e'],
    });
  }, 150);

  // Third burst - right
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ea580c', '#f97316', '#22c55e'],
    });
  }, 300);
};

/**
 * Trigger a subtle celebration confetti
 */
export const triggerSubtleConfetti = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#ea580c', '#f97316', '#22c55e'],
  });
};
