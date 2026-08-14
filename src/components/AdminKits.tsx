import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminKitsQuery, slugify, type Kit, type KitItem } from "@/lib/kits";
import { productsQuery, formatPrice, type Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type KitForm = {
  id?: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

const emptyKit: KitForm = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  price: "",
  image_url: "",
  is_active: true,
  sort_order: 99,
};

export function AdminKits() {
  const qc = useQueryClient();
  const { data: kits } = useQuery(adminKitsQuery);
  const { data: products } = useQuery(productsQuery);
  const [form, setForm] = useState<KitForm>(emptyKit);
  const [addProductId, setAddProductId] = useState("");

  const selected = form.id ? (kits ?? []).find((k) => k.id === form.id) : undefined;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-kits"] });
    qc.invalidateQueries({ queryKey: ["kits"] });
  };

  const saveKit = useMutation({
    mutationFn: async (values: KitForm) => {
      const payload = {
        slug: values.slug || slugify(values.name),
        name: values.name,
        subtitle: values.subtitle || null,
        description: values.description || null,
        price: values.price ? Number(values.price) : null,
        image_url: values.image_url || null,
        is_active: values.is_active,
        sort_order: values.sort_order,
      };
      if (values.id) {
        const { error } = await supabase.from("kits").update(payload).eq("id", values.id);
        if (error) throw error;
        return values.id;
      }
      const { data, error } = await supabase.from("kits").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Kit salvo");
      setForm((f) => ({ ...f, id }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeKit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kit removido");
      setForm(emptyKit);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ kitId, productId }: { kitId: string; productId: string }) => {
      const next = (selected?.items.length ?? 0) + 1;
      const { error } = await supabase
        .from("kit_items")
        .insert({ kit_id: kitId, product_id: productId, sort_order: next });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddProductId("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("kit_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (items: KitItem[]) => {
      for (const [index, item] of items.entries()) {
        const { error } = await supabase
          .from("kit_items")
          .update({ sort_order: index + 1 })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  function move(kit: Kit, index: number, delta: number) {
    const items = kit.items.slice();
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const [it] = items.splice(index, 1);
    if (it) items.splice(target, 0, it);
    reorder.mutate(items);
  }

  function edit(kit: Kit) {
    setForm({
      id: kit.id,
      slug: kit.slug,
      name: kit.name,
      subtitle: kit.subtitle ?? "",
      description: kit.description ?? "",
      price: kit.price == null ? "" : String(kit.price),
      image_url: kit.image_url ?? "",
      is_active: kit.is_active,
      sort_order: kit.sort_order,
    });
  }

  const available = (products ?? []).filter(
    (p: Product) => !selected?.items.some((i) => i.product_id === p.id),
  );
  const itemsTotal = (selected?.products ?? []).reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Kits</h2>
          <p className="text-sm text-muted-foreground">
            Monte combos, escolha os produtos, o preço e a ordem em que aparecem.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setForm(emptyKit)}>
          <Plus className="size-4" /> Novo kit
        </Button>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {(kits ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum kit criado ainda.</p>
          ) : null}
          {(kits ?? []).map((kit) => (
            <div key={kit.id} className="surface-card p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg">{kit.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {kit.slug} · {kit.items.length} produtos · {formatPrice(kit.price)}
                    {kit.is_active ? "" : " · oculto"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => edit(kit)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeKit.mutate(kit.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {form.id === kit.id ? (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {kit.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-sand p-2">
                      {item.product?.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="size-10 shrink-0 object-contain"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {item.product?.name ?? "Produto removido"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(item.product?.price ?? null)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(kit, index, -1)}
                        aria-label="Subir"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === kit.items.length - 1 || reorder.isPending}
                        onClick={() => move(kit, index, 1)}
                        aria-label="Descer"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => removeItem.mutate(item.id)}
                        aria-label="Remover do kit"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground">
                    Soma dos produtos avulsos: {formatPrice(itemsTotal)}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <select
                      className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      value={addProductId}
                      onChange={(e) => setAddProductId(e.target.value)}
                    >
                      <option value="">Adicionar produto ao kit…</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      disabled={!addProductId || addItem.isPending}
                      onClick={() =>
                        addItem.mutate({ kitId: kit.id, productId: addProductId })
                      }
                    >
                      <Plus className="size-4" /> Incluir
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <form
          className="surface-card h-fit space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveKit.mutate(form);
          }}
        >
          <h3 className="text-xl">{form.id ? "Editar kit" : "Novo kit"}</h3>

          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço do kit (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Imagem de capa (URL)</Label>
            <Input
              value={form.image_url}
              placeholder="/produtos/hibisco.png"
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="kit-active">Visível no site</Label>
            <Switch
              id="kit-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={saveKit.isPending}>
            Salvar kit
          </Button>
          {!form.id ? (
            <p className="text-xs text-muted-foreground">
              Salve o kit para poder incluir os produtos dele.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
