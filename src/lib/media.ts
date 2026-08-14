import { supabase } from "@/integrations/supabase/client";

export type ProductMedia = {
  id: string;
  product_id: string;
  storage_path: string;
  media_type: string;
  alt: string | null;
  sort_order: number;
  url: string;
};

export const MEDIA_BUCKET = "produtos-midia";

async function withUrls(
  rows: Omit<ProductMedia, "url">[] | null,
): Promise<ProductMedia[]> {
  if (!rows?.length) return [];
  const { data } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60 * 24);
  return rows.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl ?? "" })).filter((r) => r.url);
}

export const productMediaQuery = (productId: string | undefined) => ({
  queryKey: ["product-media", productId],
  enabled: Boolean(productId),
  queryFn: async (): Promise<ProductMedia[]> => {
    if (!productId) return [];
    const { data, error } = await supabase
      .from("product_media")
      .select("id,product_id,storage_path,media_type,alt,sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return withUrls(data as Omit<ProductMedia, "url">[]);
  },
});

export function mediaTypeFor(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "glb" || ext === "gltf") return "model";
  if (file.type.startsWith("video")) return "video";
  return "image";
}

export async function publicOrSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!error && data?.signedUrl) return data.signedUrl;
  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function uploadProductMedia(productId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const type = mediaTypeFor(file);
  const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: type === "model" ? "model/gltf-binary" : file.type,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { error } = await supabase.from("product_media").insert({
    product_id: productId,
    storage_path: path,
    media_type: type,
    alt: file.name,
  });
  if (error) throw error;
  return { path, type };
}

export async function setProductProfileImage(productId: string, file: File) {
  const { path } = await uploadProductMedia(productId, file);
  const url = await publicOrSignedUrl(path);
  const { error } = await supabase.from("products").update({ image_url: url }).eq("id", productId);
  if (error) throw error;
  return url;
}

export async function setCoverFromMedia(productId: string, media: ProductMedia) {
  const url = media.url || (await publicOrSignedUrl(media.storage_path));
  const { error } = await supabase.from("products").update({ image_url: url }).eq("id", productId);
  if (error) throw error;
}

export async function deleteProductMedia(media: ProductMedia) {
  await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
  const { error } = await supabase.from("product_media").delete().eq("id", media.id);
  if (error) throw error;
}
