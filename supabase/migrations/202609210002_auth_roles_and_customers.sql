-- Perfiles, clientes y cuentas iniciales para la autenticacion real de HERMES.

alter table public.profiles
add column if not exists platform_role text not null default 'client';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_platform_role_check'
  ) then
    alter table public.profiles
    add constraint profiles_platform_role_check
    check (platform_role in ('client', 'staff', 'super_admin'));
  end if;
end;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  document_type text check (document_type is null or document_type in ('cedula', 'passport')),
  document_number text,
  driver_license text,
  license_expires_at date,
  city text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email),
  unique (organization_id, document_number)
);

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, customer_id),
  unique (organization_id, user_id)
);

create index if not exists customers_organization_idx
on public.customers(organization_id);

create index if not exists customer_accounts_user_idx
on public.customer_accounts(user_id);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and platform_role = 'super_admin'
      and active = true
  );
$$;

alter table public.customers enable row level security;
alter table public.customer_accounts enable row level security;

create policy "staff_manage_customers"
on public.customers for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "customers_read_own_record"
on public.customers for select to authenticated
using (
  exists (
    select 1 from public.customer_accounts
    where customer_accounts.customer_id = customers.id
      and customer_accounts.user_id = auth.uid()
      and customer_accounts.active = true
  )
);

create policy "staff_manage_customer_accounts"
on public.customer_accounts for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "customers_read_own_account"
on public.customer_accounts for select to authenticated
using (user_id = auth.uid());

create policy "super_admin_read_organizations"
on public.organizations for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_profiles"
on public.profiles for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_memberships"
on public.memberships for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_branches"
on public.branches for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_vehicles"
on public.vehicles for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_nfc_tags"
on public.nfc_tags for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_nfc_events"
on public.nfc_events for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_location_events"
on public.location_events for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_customers"
on public.customers for select to authenticated
using (public.is_super_admin());

create policy "super_admin_read_customer_accounts"
on public.customer_accounts for select to authenticated
using (public.is_super_admin());

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_accounts to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- Empresa y sucursal usadas por las cuentas iniciales del entorno de desarrollo.
insert into public.organizations (id, name, city, phone, email)
values (
  '11111111-1111-4111-8111-111111111111',
  'Quisqueya Rent-a-Car',
  'Santo Domingo',
  '809-555-0100',
  'operaciones@quisqueyarentacar.test'
)
on conflict (id) do update set
  name = excluded.name,
  city = excluded.city,
  phone = excluded.phone,
  email = excluded.email;

insert into public.branches (id, organization_id, name, city, address)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Sucursal Santo Domingo',
  'Santo Domingo',
  'Avenida 27 de Febrero'
)
on conflict (id) do update set
  name = excluded.name,
  city = excluded.city,
  address = excluded.address;

-- Esta funcion se ejecuta desde SQL Editor despues de crear los cuatro usuarios.
create or replace function public.configure_demo_accounts()
returns table (account_email text, configured_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_user_id uuid;
  agent_user_id uuid;
  admin_user_id uuid;
  super_user_id uuid;
  demo_customer_id uuid;
begin
  select id into client_user_id from auth.users where email = 'cliente@hermes.app';
  select id into agent_user_id from auth.users where email = 'agente@hermes.app';
  select id into admin_user_id from auth.users where email = 'admin@hermes.app';
  select id into super_user_id from auth.users where email = 'superadmin@hermes.app';

  if client_user_id is not null then
    update public.profiles set full_name = 'Laura Méndez', platform_role = 'client' where id = client_user_id;
    insert into public.customers (organization_id, full_name, email, phone, city)
    values ('11111111-1111-4111-8111-111111111111', 'Laura Méndez', 'cliente@hermes.app', '809-555-0103', 'Santo Domingo')
    on conflict (organization_id, email) do update set full_name = excluded.full_name
    returning id into demo_customer_id;
    insert into public.customer_accounts (organization_id, customer_id, user_id)
    values ('11111111-1111-4111-8111-111111111111', demo_customer_id, client_user_id)
    on conflict (organization_id, user_id) do update set customer_id = excluded.customer_id, active = true;
  end if;

  if agent_user_id is not null then
    update public.profiles set full_name = 'Carlos Reyes', platform_role = 'staff' where id = agent_user_id;
    insert into public.memberships (organization_id, user_id, role)
    values ('11111111-1111-4111-8111-111111111111', agent_user_id, 'agent')
    on conflict (organization_id, user_id) do update set role = 'agent', active = true;
  end if;

  if admin_user_id is not null then
    update public.profiles set full_name = 'Mariana Soto', platform_role = 'staff' where id = admin_user_id;
    insert into public.memberships (organization_id, user_id, role)
    values ('11111111-1111-4111-8111-111111111111', admin_user_id, 'admin')
    on conflict (organization_id, user_id) do update set role = 'admin', active = true;
  end if;

  if super_user_id is not null then
    update public.profiles set full_name = 'Valeria Núñez', platform_role = 'super_admin' where id = super_user_id;
  end if;

  return query
  select users.email::text,
    case
      when users.email = 'cliente@hermes.app' then 'cliente'
      when users.email = 'agente@hermes.app' then 'agente'
      when users.email = 'admin@hermes.app' then 'admin'
      when users.email = 'superadmin@hermes.app' then 'super-admin'
    end::text
  from auth.users as users
  where users.email in (
    'cliente@hermes.app',
    'agente@hermes.app',
    'admin@hermes.app',
    'superadmin@hermes.app'
  );
end;
$$;

revoke all on function public.configure_demo_accounts() from public, anon, authenticated;
