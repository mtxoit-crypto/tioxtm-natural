CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invites" ON public.admin_invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_list_members()
RETURNS TABLE(user_id uuid, email text, display_name text, is_owner boolean, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.email::text, p.display_name, lower(u.email) = 'mtxoit@gmail.com', 'ativo'::text
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE r.role = 'admin'::app_role AND public.has_role(auth.uid(),'admin'::app_role)
  UNION ALL
  SELECT NULL::uuid, i.email, NULL::text, false, 'convidado'::text
  FROM public.admin_invites i
  WHERE public.has_role(auth.uid(),'admin'::app_role)
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u2 JOIN public.user_roles r2 ON r2.user_id = u2.id AND r2.role='admin'::app_role
      WHERE lower(u2.email) = lower(i.email)
    );
$$;

CREATE OR REPLACE FUNCTION public.admin_add_member(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_email text := lower(btrim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar socios';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail invalido';
  END IF;
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'ativo';
  END IF;
  INSERT INTO public.admin_invites (email, invited_by) VALUES (v_email, auth.uid())
  ON CONFLICT (email) DO NOTHING;
  RETURN 'convidado';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_member(_user_id uuid, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem remover socios';
  END IF;
  IF _user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role;
    DELETE FROM public.admin_invites i WHERE lower(i.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id);
  ELSIF _email IS NOT NULL THEN
    DELETE FROM public.admin_invites WHERE lower(email) = lower(_email);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_invited_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_invites WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_invited_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_invited_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_invited_admin();

REVOKE EXECUTE ON FUNCTION public.grant_invited_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_members(), public.admin_add_member(text), public.admin_remove_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_members(), public.admin_add_member(text), public.admin_remove_member(uuid, text) TO authenticated;