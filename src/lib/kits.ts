import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";

export type KitItem = {
  id: string;
  product_id: string;
  sort_order: number;
  product: Product | null;
};

export type Kit = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  items: KitItem[];
  products: Product[];
};

const PRODUCT_COLUMNS =
  "id,slug,name,subtitle,description,benefits,dosage,capsule_count,price,capsule_color,jar_color,lid_color,image_url,in_stock,is_active,sort_order";

const KIT_SELECT = `id,slug,name,subtitle,description,price,image_url,is_active,sort_order,kit_items(id,product_id,sort_order,products(${PRODUCT_COLUMNS}))`;

function mapKit(k: Record<string, unknown>): Kit {
  const raw = (k["kit_items"] ?? []) as {
    id: string;
    product_id: string;
    sort_order: number;
    products: Product | null;
  }[];
  const items: KitItem[] = raw
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({
      id: i.id,
      product_id: i.product_id,
      sort_order: i.sort_order,
      product: i.products,
    }));
  return {
    ...(k as unknown as Omit<Kit, "items" | "products">),
    items,
    products: items.map((i) => i.product).filter((p): p is Product => Boolean(p)),
  };
}

export const kitsQuery = {
  queryKey: ["kits"],
  queryFn: async (): Promise<Kit[]> => {
    const { data, error } = await supabase
      .from("kits")
      .select(KIT_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((k) => mapKit(k as Record<string, unknown>));
  },
};

/** Todos os kits, inclusive os ocultos — usado no painel admin. */
export const adminKitsQuery = {
  queryKey: ["admin-kits"],
  queryFn: async (): Promise<Kit[]> => {
    const { data, error } = await supabase
      .from("kits")
      .select(KIT_SELECT)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((k) => mapKit(k as Record<string, unknown>));
  },
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
