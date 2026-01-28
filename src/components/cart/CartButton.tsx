import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

export const CartButton = () => {
  const { toggleCart, getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={toggleCart}
      aria-label="Ouvrir le panier"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </Button>
  );
};
