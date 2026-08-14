CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subtitle text,
  description text,
  benefits text[] NOT NULL DEFAULT '{}',
  dosage text,
  capsule_count integer NOT NULL DEFAULT 60,
  price numeric(10,2),
  capsule_color text NOT NULL DEFAULT '#E8B54A',
  jar_color text NOT NULL DEFAULT '#2A3A2C',
  lid_color text NOT NULL DEFAULT '#C98A3C',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "admins read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (slug,name,subtitle,description,benefits,dosage,capsule_count,price,capsule_color,jar_color,lid_color,sort_order) VALUES
('vitamina-d3','Vitamina D3','2.000 UI · óleo de coco','Vitamina D3 em cápsulas oleosas de alta absorção, essencial para ossos, músculos e imunidade.',ARRAY['Fortalece ossos e dentes','Apoia a imunidade','Alta biodisponibilidade'],'1 cápsula ao dia',60,89.90,'#E8B54A','#2A3A2C','#C98A3C',1),
('vitamina-c','Vitamina C','1.000 mg · acerola','Vitamina C natural extraída da acerola, antioxidante e aliada da imunidade diária.',ARRAY['Antioxidante natural','Reduz cansaço e fadiga','Auxilia na absorção de ferro'],'1 cápsula ao dia',60,74.90,'#F2A24B','#3A2F22','#C98A3C',2),
('complexo-b','Complexo B','8 vitaminas do complexo B','Combinação completa de vitaminas do complexo B para energia e saúde do sistema nervoso.',ARRAY['Mais energia no dia a dia','Apoia o sistema nervoso','Auxilia o metabolismo'],'1 cápsula ao dia',90,96.90,'#D9C27A','#243027','#8FA86B',3),
('multivitaminico','Multivitamínico','Fórmula 12 vitaminas + 6 minerais','Suporte nutricional completo em uma única cápsula diária, com minerais quelados.',ARRAY['Cobertura nutricional diária','Minerais quelados','Fórmula vegana'],'1 cápsula ao dia',120,119.90,'#C7D6A0','#1F2A20','#C98A3C',4);