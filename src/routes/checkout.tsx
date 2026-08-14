import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Carrinho · Tioxtm Natural" },
      {
        name: "description",
        content:
          "Revise seu carrinho, calcule o frete pelo CEP e finalize a compra no checkout seguro com cartão, Pix ou boleto.",
      },
      { property: "og:title", content: "Carrinho · Tioxtm Natural" },
      {
        property: "og:description",
        content: "Carrinho e frete — finalize com cartão, Pix ou boleto.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://natural-pot-showcase.lovable.app/checkout" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://natural-pot-showcase.lovable.app/checkout" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl } =
    useCartStore();

  const subtotal = items.reduce((sum, i) => sum + Number(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "BRL";

  function checkout() {
    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-4xl">Seu carrinho está vazio</h1>
        <p className="mt-3 text-muted-foreground">
          Escolha seus suplementos e volte aqui para finalizar a compra.
        </p>
        <Button asChild className="mt-6">
          <Link to="/produtos">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-4xl">Seu carrinho</h1>
      <p className="mt-2 text-muted-foreground">
        Pagamento com <strong>cartão de crédito, Pix ou boleto</strong> no checkout seguro.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="surface-card space-y-4 p-6">
          {items.map((i) => (
            <div key={i.variantId} className="flex gap-3 border-b border-border/60 pb-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                {i.image ? (
                  <img src={i.image} alt={i.title} loading="lazy" className="size-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{i.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(i.price.amount, i.price.currencyCode)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => updateQuantity(i.variantId, i.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{i.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => updateQuantity(i.variantId, i.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto size-7"
                    onClick={() => removeItem(i.variantId)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="surface-card space-y-3 p-6">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="text-accent">{formatMoney(subtotal, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Frete calculado no checkout conforme o endereço.
            </p>
            <Button className="w-full" size="lg" onClick={checkout} disabled={isLoading || isSyncing}>
              {isLoading || isSyncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="size-4" />
                  Finalizar compra
                </>
              )}
            </Button>
          </div>
          <ShippingCalculator />
        </aside>
      </div>
    </div>
  );
}
