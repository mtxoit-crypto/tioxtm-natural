import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  benefits: string[];
  dosage: string | null;
  capsule_count: number;
  price: number | null;
  capsule_color: string;
  jar_color: string;
  lid_color: string;
  image_url: string | null;
  in_stock: boolean;
  is_active: boolean;
  sort_order: number;
};

const COLUMNS =
  "id,slug,name,subtitle,description,benefits,dosage,capsule_count,price,capsule_color,jar_color,lid_color,image_url,in_stock,is_active,sort_order";


export const productsQuery = {
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(COLUMNS)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
};

export const productQuery = (slug: string) => ({
  queryKey: ["product", slug],
  queryFn: async (): Promise<Product | null> => {
    const { data, error } = await supabase
      .from("products")
      .select(COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as Product) ?? null;
  },
});

export function formatPrice(price: number | null) {
  if (price == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

/** Regrava a ordem do catálogo (1, 2, 3…). Usado para mover produtos no ADM. */
export async function saveProductOrder(products: Product[]) {
  const updates = products.map((p, index) =>
    supabase.from("products").update({ sort_order: index + 1 }).eq("id", p.id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function moveProduct(products: Product[], id: string, direction: -1 | 1) {
  const ordered = [...products].sort((a, b) => a.sort_order - b.sort_order);
  const from = ordered.findIndex((p) => p.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ordered.length) return;
  const next = [...ordered];
  const current = next[from];
  const swap = next[to];
  if (!current || !swap) return;
  next[from] = swap;
  next[to] = current;
  await saveProductOrder(next);
}
