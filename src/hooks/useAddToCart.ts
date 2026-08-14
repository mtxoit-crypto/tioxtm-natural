import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { firstVariant, matchShopifyProduct, shopifyProductsQuery } from "@/lib/shopify";

/**
 * Liga o catálogo (Cloud) aos produtos reais da Shopify: encontra a variante
 * pelo slug/nome e adiciona ao carrinho da Storefront API.
 */
export function useAddToCart() {
  const { data: shopifyProducts, isLoading: loadingShopify } = useQuery(shopifyProductsQuery);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  function getVariant(slug: string, name?: string) {
    const product = matchShopifyProduct(shopifyProducts, slug, name);
    return { product, variant: firstVariant(product) };
  }

  async function addToCart(slug: string, name: string, quantity = 1) {
    const { product, variant } = getVariant(slug, name);
    if (!product || !variant) {
      toast.error("Produto indisponível para compra no momento.");
      return false;
    }
    await addItem({
      variantId: variant.id,
      title: product.node.title,
      handle: product.node.handle,
      image: product.node.images.edges[0]?.node.url ?? null,
      price: variant.price,
      quantity,
    });
    return true;
  }

  return { addToCart, getVariant, shopifyProducts, isLoading: isLoading || loadingShopify };
}
