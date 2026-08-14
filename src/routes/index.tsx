import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, HeartHandshake, Leaf, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { productsQuery, formatPrice } from "@/lib/products";
import { JarViewer } from "@/components/JarViewer";
import { Button } from "@/components/ui/button";
import { ProductAdminControls } from "@/components/ProductAdminControls";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tioxtm Natural · Vitaminas naturais com pote 3D interativo" },
      {
        name: "description",
        content:
          "Conheça nossas vitaminas naturais em cápsulas. Gire o pote em 3D, abra a tampa e veja as cápsulas por dentro.",
      },
      {
        property: "og:title",
        content: "Tioxtm Natural · Vitaminas naturais com pote 3D interativo",
      },
      {
        property: "og:description",
        content: "Gire o pote em 3D, abra a tampa e conheça as cápsulas das nossas vitaminas.",
      },
      { property: "og:url", content: "https://tioxtmnatural.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tioxtmnatural.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Tioxtm Natural",
            url: "https://tioxtmnatural.lovable.app",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Tioxtm Natural",
            url: "https://tioxtmnatural.lovable.app",
            description:
              "Vitaminas e suplementos naturais em cápsulas, com pote 3D interativo e entrega para todo o Brasil.",
          },
        ]),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery(productsQuery);
  const featured = products?.[0];

  return (
    <div>
      <section className="grain-bg">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <Leaf className="size-3.5" /> Suplementos naturais
            </span>
            <h1 className="mt-5 text-5xl leading-[1.02] md:text-7xl">
              Sua rotina natural começa
              <span className="text-accent"> com escolhas simples.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Suplementos em cápsulas, informações claras e uma experiência de compra sem
              complicação. Conheça cada produto antes de escolher o que combina com sua rotina.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/produtos">
                  Conhecer produtos <ArrowRight className="size-4" />
                </Link>
              </Button>
              {featured ? (
                <Button asChild size="lg" variant="outline">
                  <Link to="/kits">Ver kits</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <JarViewer
            jarColor={featured?.jar_color ?? "#F2F1EE"}
            lidColor={featured?.lid_color ?? "#6FC49A"}
            capsuleColor={featured?.capsule_color ?? "#C9A227"}
            capsuleCount={featured?.capsule_count ?? 24}
            name={featured?.name}
            dosage={featured?.dosage ?? undefined}
            subtitle={featured?.subtitle ?? undefined}
            imageUrl={featured?.image_url ?? undefined}
          />
        </div>
      </section>

      <section className="border-y border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-5 text-sm sm:grid-cols-3">
          {[
            { icon: PackageCheck, text: "Produtos selecionados com cuidado" },
            { icon: ShieldCheck, text: "Compra finalizada em ambiente seguro" },
            { icon: Truck, text: "Entrega acompanhada até você" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-2 sm:justify-start">
              <Icon className="size-4 text-accent" /> <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="surface-card grid gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quem somos</p>
            <h2 className="text-display mt-2 text-3xl">Nossa história</h2>
            <p className="mt-4 text-muted-foreground">
              Tudo começou quando meu pai mudou de vida com disciplina, alimentação e novos hábitos
              — eliminando 90 kg e transformando sua relação com a saúde.
            </p>
            <p className="mt-3 text-muted-foreground">
              Vendo meu pai renascer, entendi de verdade: saúde transforma vidas. Foi assim que
              decidi oferecer os produtos que usamos no dia a dia, selecionados com cuidado,
              qualidade e segurança.
            </p>
            <p className="mt-3 text-muted-foreground">
              Essa experiência inspirou uma loja mais humana: informação simples, atendimento
              próximo e respeito pelo momento de cada pessoa.
            </p>
          </div>
          <div className="grid gap-3 self-center">
            {[
              { t: "Uma história real", d: "Mudança construída com disciplina e novos hábitos." },
              {
                t: "Escolha consciente",
                d: "Informação clara para você decidir com tranquilidade.",
              },
              { t: "Atendimento próximo", d: "Uma conversa humana antes e depois da compra." },
            ].map((i) => (
              <div key={i.t} className="rounded-2xl border border-border bg-sand p-5">
                <p className="text-display text-lg">{i.t}</p>
                <p className="text-sm text-muted-foreground">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Por que escolher a gente
        </p>
        <h2 className="mt-2 text-3xl">Cuidado em cada etapa</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Leaf,
              t: "Seleção cuidadosa",
              d: "Um catálogo organizado para facilitar a sua escolha.",
            },
            {
              icon: ShieldCheck,
              t: "Informação transparente",
              d: "Conteúdo, quantidade e modo de uso apresentados com clareza.",
            },
            {
              icon: HeartHandshake,
              t: "Atendimento humano",
              d: "Suporte próximo para tirar dúvidas sobre pedidos e entregas.",
            },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="surface-card p-6">
              <Icon className="size-5 text-accent" />
              <h3 className="mt-3 text-lg">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="overflow-hidden rounded-[2rem] bg-primary px-7 py-10 text-primary-foreground md:flex md:items-center md:justify-between md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/65">
              Escolha com calma
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl">
              Comece pelo produto que faz sentido para sua rotina.
            </h2>
            <p className="mt-3 text-primary-foreground/75">
              Confira características, quantidade e orientações na página de cada item. Em caso de
              dúvida, converse com um profissional de saúde.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="mt-6 shrink-0 md:mt-0">
            <Link to="/produtos">
              Explorar catálogo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Nossas vitaminas</h2>
          <Link to="/produtos" className="text-sm text-accent underline-offset-4 hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(products ?? [])
            .filter((p) => p.is_active)
            .slice(0, 4)
            .map((p) => (
              <div key={p.id} className="relative">
                <ProductAdminControls product={p} products={products ?? []} />
                <Link
                  to="/produtos/$slug"
                  params={{ slug: p.slug }}
                  className="surface-card group block p-5 transition-transform hover:-translate-y-1"
                >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={`Pote de ${p.name} — suplemento natural em cápsulas`}
                    loading="lazy"
                    className="h-32 w-full rounded-xl bg-sand object-contain"
                  />
                ) : (
                  <div
                    className="h-32 rounded-xl"
                    style={{
                      background: `linear-gradient(160deg, ${p.jar_color}, ${p.lid_color})`,
                    }}
                  />
                )}
                <h3 className="mt-4 text-xl">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                <p className="mt-3 text-sm font-medium text-accent">{formatPrice(p.price)}</p>
                </Link>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
