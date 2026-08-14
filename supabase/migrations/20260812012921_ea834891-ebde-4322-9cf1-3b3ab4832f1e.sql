GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.orders TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT INSERT ON public.order_items TO anon;
GRANT INSERT ON public.order_items TO authenticated;
GRANT SELECT, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;