CREATE TABLE public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_code text NOT NULL,
  customer_name text,
  total numeric NOT NULL DEFAULT 0,
  status text,
  action text NOT NULL DEFAULT 'delete',
  actor_id uuid,
  actor_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_audit_log TO authenticated;
GRANT ALL ON public.order_audit_log TO service_role;

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read order audit log"
ON public.order_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_order_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.order_audit_log (order_id, order_code, customer_name, total, status, action, actor_id, actor_email)
  VALUES (OLD.id, OLD.code, OLD.customer_name, OLD.total, OLD.status, 'delete', auth.uid(), v_email);
  RETURN OLD;
END;
$$;

CREATE TRIGGER orders_log_deletion
BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_deletion();

CREATE INDEX idx_order_audit_log_created_at ON public.order_audit_log (created_at DESC);