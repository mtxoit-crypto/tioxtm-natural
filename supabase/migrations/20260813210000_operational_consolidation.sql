-- Consolidação operacional: orders Shopify, reviews, staff roles (sem quebrar admin)

-- ---------------------------------------------------------------------------
-- 1) Orders: campos para sync Shopify (idempotente por external_order_id)
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists source text not null default 'manual';
alter table public.orders add column if not exists external_order_id text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists fulfillment_status text;
alter table public.orders add column if not exists financial_status text;
alter table public.orders add column if not exists currency text not null default 'BRL';
alter table public.orders add column if not exists discount_total numeric not null default 0;

-- customer_email / subtotal / shipping_fee / total / created_at / updated_at já existem no schema Lovable

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_source_check'
  ) then
    alter table public.orders
      add constraint orders_source_check
      check (source in ('shopify', 'pos', 'manual'));
  end if;
end $$;

create unique index if not exists orders_external_order_id_uidx
  on public.orders (external_order_id)
  where external_order_id is not null;

-- Constraint UNIQUE (permite vários NULL) para upsert PostgREST
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_external_order_id_key'
  ) then
    alter table public.orders
      add constraint orders_external_order_id_key unique (external_order_id);
  end if;
exception when unique_violation then
  -- dados legados duplicados: mantém só o índice parcial
  null;
end $$;

comment on column public.orders.source is 'Origem do pedido: shopify | pos | manual';
comment on column public.orders.external_order_id is 'ID único Shopify (ou outro ERP). Base da idempotência do webhook.';
comment on function public.create_order(text,text,text,text,text,text,text,text,text,text,text,jsonb) is
  'Pedido interno (POS/manual futuro). Checkout online oficial = Shopify Storefront. NÃO usar como fonte financeira da loja online.';

-- Webhook usa service_role (bypass RLS). Sem insert público.
-- Garante que policies de insert aberto continuam ausentes.
drop policy if exists "anyone can create orders" on public.orders;
drop policy if exists "anyone can create order items" on public.order_items;

-- ---------------------------------------------------------------------------
-- 2) Reviews: novas começam não aprovadas; visitante não escolhe is_approved
-- ---------------------------------------------------------------------------
alter table public.product_reviews
  alter column is_approved set default false;

create or replace function public.force_review_unapproved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Visitante nunca define aprovação; só admin altera depois
  if tg_op = 'INSERT' then
    if not public.has_role(auth.uid(), 'admin'::app_role) then
      new.is_approved := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_review_unapproved on public.product_reviews;
create trigger trg_force_review_unapproved
  before insert on public.product_reviews
  for each row execute function public.force_review_unapproved();

drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews" on public.product_reviews
  for select to anon, authenticated
  using (
    is_approved = true
    or public.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "anyone can submit reviews" on public.product_reviews;
create policy "anyone can submit reviews" on public.product_reviews
  for insert to anon, authenticated
  with check (
    rating >= 1 and rating <= 5
    and length(author_name) between 2 and 60
    and (comment is null or length(comment) <= 1000)
    and is_approved = false
  );

drop policy if exists "admins update reviews" on public.product_reviews;
create policy "admins update reviews" on public.product_reviews
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "admins delete reviews" on public.product_reviews;
create policy "admins delete reviews" on public.product_reviews
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 3) Staff roles futuros (OWNER/ADMIN/…) sem quebrar has_role(..., admin)
-- ---------------------------------------------------------------------------
alter table public.user_roles
  add column if not exists staff_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_roles_staff_code_check'
  ) then
    alter table public.user_roles
      add constraint user_roles_staff_code_check
      check (
        staff_code is null
        or staff_code in ('OWNER', 'ADMIN', 'VENDEDOR', 'ESTOQUE', 'FINANCEIRO')
      );
  end if;
end $$;

-- Preserva owner atual (mtxoit) como OWNER explícito; demais admins = ADMIN
update public.user_roles ur
set staff_code = 'OWNER'
from auth.users u
where ur.user_id = u.id
  and ur.role = 'admin'::app_role
  and lower(u.email) = 'mtxoit@gmail.com'
  and ur.staff_code is null;

update public.user_roles
set staff_code = 'ADMIN'
where role = 'admin'::app_role
  and staff_code is null;

create or replace function public.is_owner(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role = 'admin'::app_role
      and staff_code = 'OWNER'
  );
$$;

revoke all on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_owner(uuid) to authenticated, service_role;

-- Troca proteção de owner: deixa de depender só de e-mail hardcoded
create or replace function public.protect_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.staff_code = 'OWNER' and old.role = 'admin'::app_role then
      raise exception 'Não é permitido remover o OWNER';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.staff_code = 'OWNER'
       and old.role = 'admin'::app_role
       and (new.role is distinct from old.role or new.staff_code is distinct from old.staff_code) then
      raise exception 'Não é permitido alterar o papel do OWNER';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_owner_role on public.user_roles;
create trigger protect_owner_role
  before update or delete on public.user_roles
  for each row execute function public.protect_owner_role();

-- list_admin_members: is_owner via staff_code
create or replace function public.list_admin_members()
returns table(user_id uuid, email text, display_name text, is_owner boolean, status text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email::text, p.display_name, (r.staff_code = 'OWNER'), 'ativo'::text
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = u.id
  where r.role = 'admin'::app_role
    and public.has_role(auth.uid(), 'admin'::app_role)
  union all
  select null::uuid, i.email, null::text, false, 'convidado'::text
  from public.admin_invites i
  where public.has_role(auth.uid(), 'admin'::app_role)
    and not exists (
      select 1 from auth.users u2
      join public.user_roles r2 on r2.user_id = u2.id and r2.role = 'admin'::app_role
      where lower(u2.email) = lower(i.email)
    );
$$;
