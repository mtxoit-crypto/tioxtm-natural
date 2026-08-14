ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model_url text;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON public.product_reviews(product_id);

GRANT SELECT, INSERT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read approved reviews" ON public.product_reviews
  FOR SELECT TO anon, authenticated USING (is_approved);

CREATE POLICY "anyone can submit reviews" ON public.product_reviews
  FOR INSERT TO anon, authenticated WITH CHECK (rating >= 1 AND rating <= 5 AND length(author_name) BETWEEN 2 AND 60 AND (comment IS NULL OR length(comment) <= 1000));

CREATE POLICY "admins read all reviews" ON public.product_reviews
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update reviews" ON public.product_reviews
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete reviews" ON public.product_reviews
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));