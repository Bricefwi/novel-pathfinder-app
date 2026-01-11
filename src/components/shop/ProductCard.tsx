import { ShopifyProduct, CartItem } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const { node } = product;
  
  const firstVariant = node.variants.edges[0]?.node;
  const firstImage = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;

  const handleAddToCart = () => {
    if (!firstVariant) return;

    const cartItem: CartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Ajouté au panier", {
      description: node.title,
      icon: <Check className="h-4 w-4" />,
      position: "top-center",
    });
  };

  return (
    <Card className="group overflow-hidden border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      <Link to={`/product/${node.handle}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={firstImage.altText || node.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {firstVariant?.availableForSale === false && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Épuisé
            </Badge>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link to={`/product/${node.handle}`}>
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors">
            {node.title}
          </h3>
        </Link>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {node.description}
        </p>
        
        <div className="flex items-center justify-between">
          <p className="text-primary text-xl font-bold">
            {parseFloat(price.amount).toFixed(2)} {price.currencyCode}
          </p>
          
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!firstVariant?.availableForSale}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
