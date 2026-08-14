-- Transfere o OWNER para tioxtmADM@gmail.com (mesmo poder de admin do perfil anterior).

insert into public.admin_invites (email)
values ('tioxtmadm@gmail.com')
on conflict (email) do nothing;

create or replace function public.grant_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) in ('tioxtmadm@gmail.com', 'mtxoit@gmail.com') then
    insert into public.user_roles (user_id, role, staff_code)
    values (
      new.id,
      'admin'::app_role,
      case when lower(new.email) = 'tioxtmadm@gmail.com' then 'OWNER' else 'ADMIN' end
    )
    on conflict (user_id, role) do update
      set staff_code = excluded.staff_code;

    if lower(new.email) = 'tioxtmadm@gmail.com' then
      update public.user_roles
      set staff_code = 'ADMIN'
      where role = 'admin'::app_role
        and staff_code = 'OWNER'
        and user_id <> new.id;
    end if;
  end if;
  return new;
end;
$$;

-- Se a conta já existir, promove agora.
do $$
begin
  alter table public.user_roles disable trigger protect_owner_role;
exception when undefined_object then
  null;
end $$;

insert into public.user_roles (user_id, role, staff_code)
select u.id, 'admin'::app_role, 'OWNER'
from auth.users u
where lower(u.email) = 'tioxtmadm@gmail.com'
on conflict (user_id, role) do update
  set staff_code = 'OWNER';

update public.user_roles ur
set staff_code = 'ADMIN'
from auth.users u
where ur.user_id = u.id
  and ur.role = 'admin'::app_role
  and ur.staff_code = 'OWNER'
  and lower(u.email) <> 'tioxtmadm@gmail.com'
  and exists (
    select 1 from auth.users n
    where lower(n.email) = 'tioxtmadm@gmail.com'
  );

do $$
begin
  alter table public.user_roles enable trigger protect_owner_role;
exception when undefined_object then
  null;
end $$;
