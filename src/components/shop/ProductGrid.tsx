import { useEffect, useState } from "react";
import { ShopifyProduct, fetchShopifyProducts } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";
import { Loader2, ShoppingBag } from "lucide-react";

interface ProductGridProps {
  query?: string;
  limit?: number;
}

export const ProductGrid = ({ query, limit = 50 }: ProductGridProps) => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchShopifyProducts(limit, query);
        setProducts(data);
      } catch (err) {
        console.error("Error loading products:", err);
        setError("Impossible de charger les produits");
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [query, limit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/30 rounded-xl">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Aucun produit trouvé</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          La boutique est en cours de préparation. Revenez bientôt pour découvrir nos offres de séjours équestres.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.node.id} product={product} />
      ))}
    </div>
  );
};
