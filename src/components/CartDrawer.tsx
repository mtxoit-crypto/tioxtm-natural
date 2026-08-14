import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import { ShippingCalculator } from "@/components/ShippingCalculator";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } =
    useCartStore();

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + Number(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "BRL";

  useEffect(() => {
    if (isOpen) syncCart();
  }, [isOpen, syncCart]);

  function handleCheckout() {
    const checkoutUrl = getCheckoutUrl();
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
      setIsOpen(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Carrinho">
          <ShoppingBag className="size-5" />
          {totalItems > 0 ? (
            <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent p-0 text-[10px] text-accent-foreground">
              {totalItems}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col p-5 sm:max-w-lg">
        <SheetHeader className="shrink-0 p-0">
          <SheetTitle>Seu carrinho</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? "Seu carrinho está vazio"
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} no carrinho`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pt-6">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum produto por aqui ainda.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3 border-b border-border/60 pb-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                          className="size-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(item.price.amount, item.price.currencyCode)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto size-7"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <ShippingCalculator compact />
              </div>

              <div className="shrink-0 space-y-4 border-t border-border/60 bg-background pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg">Total</span>
                  <span className="text-xl text-accent">{formatMoney(totalPrice, currency)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  size="lg"
                  disabled={items.length === 0 || isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="size-4" />
                      Finalizar compra
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Cartão de crédito, Pix e boleto no checkout seguro.
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
