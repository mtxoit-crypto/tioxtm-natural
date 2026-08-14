import { Link } from "@tanstack/react-router";
import { Leaf, LogOut, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  useCartSync();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      {isAdmin ? (
        <div className="bg-primary px-4 py-2 text-center text-xs text-primary-foreground sm:text-sm">
          Modo ADM ativo — no catálogo use as setas para mover produtos e o ícone de foto para
          trocar a imagem de perfil.{" "}
          <Link to="/admin" className="underline underline-offset-2">
            Abrir painel completo
          </Link>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          <span className="leading-none">
            <span className="text-display block text-base sm:text-lg">Tioxtm Natural</span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Suplementos naturais
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-0 text-sm sm:gap-1" aria-label="Navegação principal">
          <Link
            to="/"
            className="hidden rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Início
          </Link>
          <Link
            to="/produtos"
            className="rounded-full px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            <span className="hidden sm:inline">Produtos</span>
            <ShoppingBag className="size-4 sm:hidden" />
          </Link>
          <Link
            to="/kits"
            className="rounded-full px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Kits
          </Link>
          {isAdmin ? (
            <Link
              to="/admin"
              className="rounded-full px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-4" />
                <span className="hidden sm:inline">Admin</span>
              </span>
            </Link>
          ) : null}
          <CartDrawer />

          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
            >
              <LogOut className="size-4" />
            </Button>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:block"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-sand">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 text-sm sm:grid-cols-3">
        {[
          { icon: Leaf, t: "Produtos naturais", d: "de qualidade" },
          { icon: ShieldCheck, t: "Informações claras", d: "para escolher melhor" },
          { icon: Truck, t: "Envio para", d: "todo o Brasil" },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-foreground">{t}</span>
              <span className="block text-muted-foreground">{d}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-display text-base text-foreground">
            Tioxtm Natural · Suplementos naturais
          </p>
          <p>
            Suplementos não substituem uma alimentação equilibrada. Consulte um profissional de
            saúde.
          </p>
        </div>
      </div>
    </footer>
  );
}
