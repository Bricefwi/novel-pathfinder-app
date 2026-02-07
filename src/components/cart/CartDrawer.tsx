import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Plus, Minus, Calendar, MapPin, ArrowRight, Clock, X } from "lucide-react";
import { useCartStore, CartItem } from "@/stores/cartStore";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const CartItemCard = ({ item }: { item: CartItem }) => {
  const { removeItem, updateQuantity } = useCartStore();

  return (
    <div className="flex gap-4 py-4">
      {/* Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <Badge
          variant="secondary"
          className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5"
        >
          {item.type === "sejour" ? "Séjour" : item.type === "hebergement" ? "Hébergement" : "Activité"}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{item.title}</h4>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{item.location}</span>
        </div>
        
        {item.startDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(parseISO(item.startDate), "d MMM", { locale: fr })}
              {item.endDate && ` - ${format(parseISO(item.endDate), "d MMM yyyy", { locale: fr })}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{item.duration}</span>
        </div>

        {/* Price and quantity */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="text-right">
            <span className="font-bold text-primary">
              {(item.price * item.quantity).toLocaleString("fr-FR")}€
            </span>
            {item.quantity > 1 && (
              <span className="text-xs text-muted-foreground block">
                ({item.price}€ × {item.quantity})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => removeItem(item.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const CartDrawer = () => {
  const { items, isOpen, closeCart, getTotalPrice, clearCart } = useCartStore();
  const navigate = useNavigate();
  const totalPrice = getTotalPrice();

  const handleCheckout = () => {
    closeCart();
    const firstItem = items[0];
    if (firstItem) {
      const params = new URLSearchParams();
      params.set("activityId", firstItem.id);
      params.set("sejour", firstItem.title);
      if (firstItem.slotId) params.set("slot", firstItem.slotId);
      if (firstItem.startDate) params.set("date", firstItem.startDate);
      params.set("participants", items.reduce((acc, i) => acc + i.quantity, 0).toString());
      navigate(`/demande-devis?${params.toString()}`);
    } else {
      navigate("/demande-devis");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Mon Panier
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {items.reduce((acc, i) => acc + i.quantity, 0)} article{items.length > 1 ? "s" : ""}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Vos séjours et prestations sélectionnés
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Votre panier est vide
            </p>
            <Button variant="outline" onClick={() => { closeCart(); navigate("/destinations"); }}>
              Découvrir nos séjours
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="divide-y">
                {items.map((item) => (
                  <CartItemCard key={`${item.id}-${item.slotId}`} item={item} />
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{totalPrice.toLocaleString("fr-FR")}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Acompte (20%)</span>
                  <span>{Math.ceil(totalPrice * 0.2).toLocaleString("fr-FR")}€</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{totalPrice.toLocaleString("fr-FR")}€</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Demander un devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vider le panier
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
