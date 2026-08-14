/**
 * Checkout online oficial = Shopify Storefront (carrinho + pagamento).
 *
 * Supabase guarda catálogo, admin e dados operacionais (futuro PDV/CRM/estoque).
 *
 * `public.create_order(...)` existe no banco para pedidos INTERNOS (POS/manual).
 * O frontend da loja NÃO deve usá-lo para checkout online: a fonte financeira
 * oficial da compra web é o pedido Shopify (checkoutUrl / webhook).
 */
export const CHECKOUT_SOURCE = {
  online: "shopify",
  internalRpc: "create_order", // não conectar ao checkout público atual
} as const;
