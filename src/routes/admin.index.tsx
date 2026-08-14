import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { productsQuery, moveProduct, type Product } from "@/lib/products";
import { storeSettingsQuery, type StoreSettings } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProductMediaManager } from "@/components/ProductMediaManager";
import { AdminMembers } from "@/components/AdminMembers";
import { AdminKits } from "@/components/AdminKits";


export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel do catálogo · Tioxtm Natural" },
      { name: "description", content: "Gerencie os produtos naturais do catálogo Tioxtm Natural." },
      { property: "og:title", content: "Painel do catálogo · Tioxtm Natural" },
      { property: "og:description", content: "Gerencie os produtos do catálogo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const empty: Partial<Product> = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  benefits: [],
  dosage: "1 cápsula ao dia",
  capsule_count: 60,
  price: null,
  capsule_color: "#E8B54A",
  jar_color: "#2A3A2C",
  lid_color: "#C98A3C",
  image_url: null,
  in_stock: true,
  is_active: true,
  sort_order: 99,
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: products } = useQuery(productsQuery);
  const { data: settings } = useQuery(storeSettingsQuery);
  const [form, setForm] = useState<Partial<Product>>(empty);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [pixKey, setPixKey] = useState("");
  const { data: adminPix } = useQuery({
    queryKey: ["admin-pix-key", isAdmin],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_pix_key");
      if (error) throw error;
      return (data as string | null) ?? "";
    },
  });

  useEffect(() => {
    if (typeof adminPix === "string") setPixKey(adminPix);
  }, [adminPix]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (settings && !store) setStore(settings);
  }, [settings, store]);

  const saveSettings = useMutation({
    mutationFn: async (values: StoreSettings & { pix_key: string }) => {
      const { error } = await supabase
        .from("store_settings")
        .update({ ...values, pix_key: values.pix_key || null })
        .not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const save = useMutation({
    mutationFn: async (values: Partial<Product>) => {
      const slug =
        values.slug ||
        (values.name ?? "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      const payload = {
        slug,
        name: values.name ?? "",
        subtitle: values.subtitle ?? null,
        description: values.description ?? null,
        benefits: values.benefits ?? [],
        dosage: values.dosage ?? null,
        capsule_count: values.capsule_count ?? 60,
        price: values.price ?? null,
        capsule_color: values.capsule_color ?? "#E8B54A",
        jar_color: values.jar_color ?? "#2A3A2C",
        lid_color: values.lid_color ?? "#C98A3C",
        image_url: values.image_url || null,
        in_stock: values.in_stock ?? true,
        is_active: values.is_active ?? true,
        sort_order: values.sort_order ?? 99,

      };
      const { error } = values.id
        ? await supabase.from("products").update(payload).eq("id", values.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Produto salvo");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shift = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 1 }) =>
      moveProduct(products ?? [], id, direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="mx-auto max-w-6xl px-5 py-20">Carregando…</div>;

  if (user && !isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <h1 className="text-3xl">Acesso restrito</h1>
        <p className="mt-3 text-muted-foreground">
          Sua conta ({user.email}) ainda não tem permissão de administrador. Peça a um administrador
          para liberar o acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Painel do catálogo</h1>
        <Button asChild variant="outline">
          <Link to="/admin/pedidos">Ver pedidos</Link>
        </Button>
      </div>
      <p className="mt-2 text-muted-foreground">
        Edite o site por aqui: fotos de perfil, textos, preços, estoque e a ordem dos produtos no
        catálogo. Use as setas para mover um item para qualquer lado.
      </p>

      {store ? (
        <form
          className="surface-card mt-8 grid gap-3 p-6 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings.mutate({ ...store, pix_key: pixKey });
          }}
        >
          <Field label="WhatsApp (556199...)">
            <Input
              value={store.whatsapp_number}
              onChange={(e) => setStore({ ...store, whatsapp_number: e.target.value })}
            />
          </Field>
          <Field label="Chave Pix">
            <Input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </Field>
          <Field label="Frete (R$)">
            <Input
              type="number"
              step="0.01"
              value={store.shipping_fee}
              onChange={(e) => setStore({ ...store, shipping_fee: Number(e.target.value) })}
            />
          </Field>
          <Field label="Frete grátis acima de (R$)">
            <Input
              type="number"
              step="0.01"
              value={store.free_shipping_min}
              onChange={(e) => setStore({ ...store, free_shipping_min: Number(e.target.value) })}
            />
          </Field>
          <Button type="submit" className="sm:col-span-4" variant="secondary">
            Salvar configurações da loja
          </Button>
        </form>
      ) : null}

      <AdminMembers />

      <AdminKits />


      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">

        <div className="space-y-3">
          {(products ?? []).map((p) => (
            <div key={p.id} className="surface-card flex items-center gap-4 p-4">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="size-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="size-12 shrink-0 rounded-lg"
                  style={{ background: `linear-gradient(160deg, ${p.jar_color}, ${p.lid_color})` }}
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg">{p.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.slug} · {p.capsule_count} cápsulas {p.is_active ? "" : "· inativo"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={shift.isPending}
                  aria-label="Mover para cima"
                  onClick={() => shift.mutate({ id: p.id, direction: -1 })}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={shift.isPending}
                  aria-label="Mover para baixo"
                  onClick={() => shift.mutate({ id: p.id, direction: 1 })}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setForm(p)}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <form
          className="surface-card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl">{form.id ? "Editar produto" : "Novo produto"}</h2>
            {form.id ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm(empty)}>
                <Plus className="size-4" />
              </Button>
            ) : null}
          </div>

          <Field label="Nome">
            <Input
              value={form.name ?? ""}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={form.subtitle ?? ""}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={form.description ?? ""}
              rows={4}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Benefícios (um por linha)">
            <Textarea
              value={(form.benefits ?? []).join("\n")}
              rows={3}
              onChange={(e) =>
                setForm({ ...form, benefits: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cápsulas">
              <Input
                type="number"
                value={form.capsule_count ?? 60}
                onChange={(e) => setForm({ ...form, capsule_count: Number(e.target.value) })}
              />
            </Field>
            <Field label="Preço (R$)">
              <Input
                type="number"
                step="0.01"
                value={form.price ?? ""}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
          </div>
          <Field label="Dosagem">
            <Input
              value={form.dosage ?? ""}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pote">
              <Input
                type="color"
                value={form.jar_color ?? "#2A3A2C"}
                onChange={(e) => setForm({ ...form, jar_color: e.target.value })}
              />
            </Field>
            <Field label="Tampa">
              <Input
                type="color"
                value={form.lid_color ?? "#C98A3C"}
                onChange={(e) => setForm({ ...form, lid_color: e.target.value })}
              />
            </Field>
            <Field label="Cápsula">
              <Input
                type="color"
                value={form.capsule_color ?? "#E8B54A"}
                onChange={(e) => setForm({ ...form, capsule_color: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Ordem no catálogo">
            <Input
              type="number"
              value={form.sort_order ?? 99}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </Field>
          <Field label="URL da imagem do produto">
            <Input
              value={form.image_url ?? ""}
              placeholder="/__l5e/assets-v1/..."
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </Field>
          {form.id ? (
            <div className="space-y-2">
              <Label>Fotos e vídeos do produto</Label>
              <ProductMediaManager productId={form.id} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Salve o produto para liberar o envio de fotos e vídeos.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="stock">Em estoque</Label>
            <Switch
              id="stock"
              checked={form.in_stock ?? true}
              onCheckedChange={(v) => setForm({ ...form, in_stock: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Visível no site</Label>
            <Switch
              id="active"
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar produto
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
