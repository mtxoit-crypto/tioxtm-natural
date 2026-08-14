import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { kitsQuery } from "@/lib/kits";
import { formatPrice, type Product } from "@/lib/products";
import { useAddToCart } from "@/hooks/useAddToCart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/kits/")({
  head: () => ({
    meta: [
      { title: "Kits · Tioxtm Natural suplementos naturais" },
      {
        name: "description",
        content:
          "Kits de suplementos naturais Tioxtm Natural: combinações prontas, como o Kit Emagrecimento com 7 produtos em cápsulas.",
      },
      { property: "og:title", content: "Kits · Tioxtm Natural" },
      {
        property: "og:description",
        content: "Combinações prontas de suplementos naturais em cápsulas, com entrega para todo o Brasil.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: KitsPage,
});

function KitsPage() {
  const { data: kits, isLoading } = useQuery(kitsQuery);
  const { addToCart, isLoading: cartLoading } = useAddToCart();

  async function addKit(products: Product[], kitName: string) {
    let added = 0;
    for (const p of products) {
      const ok = await addToCart(p.slug, p.name);
      if (ok) added += 1;
    }
    if (added > 0) toast.success(`${kitName}: ${added} itens adicionados ao carrinho`);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl">Kits</h1>
      <p className="mt-2 max-w-lg text-muted-foreground">
        Combinações prontas de suplementos naturais para seguir sua rotina sem complicação.
      </p>

      {isLoading ? (
        <div className="mt-10 h-64 animate-pulse rounded-2xl bg-muted" />
      ) : !kits || kits.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nenhum kit disponível no momento.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {kits.map((kit) => {
            const total = kit.products.reduce((s, p) => s + (p.price ?? 0), 0);
            return (
              <section key={kit.id} className="surface-card p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl">{kit.name}</h2>
                    <p className="text-sm text-muted-foreground">{kit.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-accent">{formatPrice(kit.price ?? total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {kit.products.length} produtos · {formatPrice(total)} avulso
                    </p>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-muted-foreground">{kit.description}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {kit.products.map((p) => (
                    <Link
                      key={p.id}
                      to="/produtos/$slug"
                      params={{ slug: p.slug }}
                      className="group rounded-xl bg-sand p-3 transition-transform hover:scale-[1.02]"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={`Pote de ${p.name} — suplemento natural em cápsulas`}
                          loading="lazy"
                          className="h-32 w-full object-contain"
                        />
                      ) : null}
                      <p className="mt-2 text-center text-sm">{p.name}</p>
                      <p className="text-center text-xs text-muted-foreground">
                        {formatPrice(p.price)}
                      </p>
                    </Link>
                  ))}
                </div>

                <Button
                  className="mt-6"
                  size="lg"
                  disabled={cartLoading}
                  onClick={() => addKit(kit.products, kit.name)}
                >
                  {cartLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="size-4" />
                  )}
                  Adicionar kit ao carrinho
                </Button>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
