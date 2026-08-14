import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShoppingBag, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { productsQuery, type Product } from "@/lib/products";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { ProductAdminControls } from "@/components/ProductAdminControls";

export const Route = createFileRoute("/produtos/")({
  head: () => ({
    meta: [
      { title: "Produtos · Tioxtm Natural suplementos naturais" },
      {
        name: "description",
        content:
          "Catálogo de suplementos naturais Tioxtm Natural em cápsulas. Compre com cartão, Pix ou boleto e receba em todo o Brasil.",
      },
      { property: "og:title", content: "Produtos · Tioxtm Natural suplementos naturais" },
      {
        property: "og:description",
        content: "Suplementos naturais em cápsulas, com pote 3D interativo e checkout seguro.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tioxtmnatural.lovable.app/produtos" },
    ],
    links: [{ rel: "canonical", href: "https://tioxtmnatural.lovable.app/produtos" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vitaminas e Suplementos Naturais",
          description:
            "Catálogo de vitaminas e suplementos naturais em cápsulas da Tioxtm Natural.",
          url: "https://tioxtmnatural.lovable.app/produtos",
          isPartOf: {
            "@type": "WebSite",
            name: "Tioxtm Natural",
            url: "https://tioxtmnatural.lovable.app",
          },
        }),
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useQuery(productsQuery);
  const { addToCart, getVariant, isLoading: cartLoading } = useAddToCart();
  const checkoutUrl = useCartStore((s) => s.checkoutUrl);

  async function buy(p: Product, now: boolean) {
    const ok = await addToCart(p.slug, p.name);
    if (!ok) return;
    if (now) {
      const url = useCartStore.getState().getCheckoutUrl() ?? checkoutUrl;
      if (url) window.open(url, "_blank");
    } else {
      toast.success(`${p.name} adicionado ao carrinho`);
    }
  }

  const active = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (products ?? []).filter((p) => {
      if (!p.is_active) return false;
      if (!term) return true;
      return [p.name, p.subtitle, p.description]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [products, search]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-4xl">Vitaminas e Suplementos Naturais</h1>
      <p className="mt-2 max-w-lg text-muted-foreground">
        Escolha seu suplemento, adicione ao carrinho e finalize no checkout seguro — cartão, Pix ou
        boleto.
      </p>

      <label className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar produtos</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Busque por nome ou característica"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-lg">Nenhum produto encontrado.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tente outro termo ou limpe a busca.</p>
          {search ? (
            <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>
              Limpar busca
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => {
            const { variant } = getVariant(p.slug, p.name);
            const price = variant ? Number(variant.price.amount) : (p.price ?? 0);
            const available = Boolean(variant?.availableForSale ?? p.in_stock);
            return (
              <article key={p.id} className="surface-card relative flex flex-col p-6">
                <ProductAdminControls product={p} products={active} />
                <Link to="/produtos/$slug" params={{ slug: p.slug }} className="group">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={`Pote de ${p.name} — suplemento natural em cápsulas`}
                      loading="lazy"
                      className="h-44 w-full rounded-xl bg-sand object-contain transition-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="h-44 rounded-xl"
                      style={{
                        background: `linear-gradient(160deg, ${p.jar_color}, ${p.lid_color})`,
                      }}
                    />
                  )}
                  <h2 className="mt-5 text-2xl">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                </Link>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-medium text-accent">{formatMoney(price)}</span>
                  <span className="text-xs text-muted-foreground">{p.capsule_count} cápsulas</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={!available || cartLoading}
                    onClick={() => buy(p, false)}
                  >
                    {cartLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="size-4" />
                    )}
                    Adicionar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!available || cartLoading}
                    onClick={() => buy(p, true)}
                  >
                    Comprar
                  </Button>
                </div>
                {!available ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">Esgotado</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
