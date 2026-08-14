CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read product media" ON public.product_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert product media" ON public.product_media FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update product media" ON public.product_media FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete product media" ON public.product_media FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cep_start integer NOT NULL,
  cep_end integer NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  days_min integer NOT NULL DEFAULT 3,
  days_max integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read shipping zones" ON public.shipping_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert shipping zones" ON public.shipping_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update shipping zones" ON public.shipping_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete shipping zones" ON public.shipping_zones FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER shipping_zones_set_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.shipping_zones (name, cep_start, cep_end, fee, days_min, days_max, sort_order) VALUES
  ('Sudeste',      1000000, 39999999, 21.90, 2, 5,  1),
  ('Sul',         80000000, 99999999, 26.90, 3, 7,  2),
  ('Centro-Oeste',70000000, 79999999, 29.90, 4, 9,  3),
  ('Nordeste',    40000000, 65999999, 34.90, 5, 12, 4),
  ('Norte',       66000000, 69999999, 39.90, 6, 15, 5);

CREATE POLICY "public read produtos-midia" ON storage.objects FOR SELECT USING (bucket_id = 'produtos-midia');
CREATE POLICY "admins upload produtos-midia" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos-midia' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update produtos-midia" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'produtos-midia' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete produtos-midia" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produtos-midia' AND public.has_role(auth.uid(),'admin'::app_role));