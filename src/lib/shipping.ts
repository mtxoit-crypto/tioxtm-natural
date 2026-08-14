import { supabase } from "@/integrations/supabase/client";

export type ShippingZone = {
  id: string;
  name: string;
  cep_start: number;
  cep_end: number;
  fee: number;
  days_min: number;
  days_max: number;
  sort_order: number;
};

export const shippingZonesQuery = {
  queryKey: ["shipping-zones"],
  queryFn: async (): Promise<ShippingZone[]> => {
    const { data, error } = await supabase
      .from("shipping_zones")
      .select("id,name,cep_start,cep_end,fee,days_min,days_max,sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ShippingZone[];
  },
};

export function cleanCep(cep: string) {
  return cep.replace(/\D/g, "");
}

export type ShippingEstimate = {
  zone: string;
  fee: number;
  days_min: number;
  days_max: number;
  free: boolean;
};

export function estimateShipping(
  cep: string,
  zones: ShippingZone[] | undefined,
  subtotal: number,
  freeShippingMin: number,
): ShippingEstimate | null {
  const clean = cleanCep(cep);
  if (clean.length !== 8 || !zones?.length) return null;
  const value = Number(clean);
  const zone = zones.find((z) => value >= z.cep_start && value <= z.cep_end);
  if (!zone) return null;
  const free = freeShippingMin > 0 && subtotal >= freeShippingMin;
  return {
    zone: zone.name,
    fee: free ? 0 : Number(zone.fee),
    days_min: zone.days_min,
    days_max: zone.days_max,
    free,
  };
}
