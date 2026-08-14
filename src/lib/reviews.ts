import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
};

export const reviewsQuery = (productId: string | undefined) => ({
  queryKey: ["product-reviews", productId],
  enabled: Boolean(productId),
  queryFn: async (): Promise<Review[]> => {
    if (!productId) return [];
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id,product_id,author_name,rating,comment,is_approved,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Review[];
  },
});

export async function submitReview(input: {
  product_id: string;
  author_name: string;
  rating: number;
  comment: string;
}) {
  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.product_id,
    author_name: input.author_name.trim(),
    rating: input.rating,
    comment: input.comment.trim() || null,
  });
  if (error) throw error;
}

export function averageRating(reviews: Review[] | undefined) {
  if (!reviews?.length) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}
