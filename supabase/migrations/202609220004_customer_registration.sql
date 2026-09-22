-- Registro de clientes por empresa y cambio obligatorio de contrasena temporal.

alter table public.organizations
add column if not exists slug text;

update public.organizations
set slug = case
  when id = '11111111-1111-4111-8111-111111111111' then 'quisqueya-rent-a-car'
  else lower(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(id::text, 8)
end
where slug is null or trim(slug) = '';

alter table public.organizations
alter column slug set not null;

create unique index if not exists organizations_slug_unique_idx
on public.organizations (lower(slug));

alter table public.profiles
add column if not exists must_change_password boolean not null default false;

-- Solo devuelve los datos publicos necesarios para validar un enlace de registro.
create or replace function public.get_registration_organization(organization_slug text)
returns table (id uuid, name text, city text)
language sql
stable
security definer
set search_path = ''
as $$
  select organizations.id, organizations.name, coalesce(organizations.city, '')
  from public.organizations
  where lower(organizations.slug) = lower(trim(organization_slug))
    and organizations.active = true
  limit 1;
$$;

-- Crea el perfil y, cuando el registro es de cliente, lo enlaza con su empresa.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  new_customer_id uuid;
  requested_organization_id text;
begin
  if new.raw_user_meta_data ->> 'registration_type' = 'customer' then
    requested_organization_id := new.raw_user_meta_data ->> 'organization_id';

    if requested_organization_id is not null then
      select id into target_organization_id
      from public.organizations
      where id::text = requested_organization_id and active = true;
    else
      select id into target_organization_id
      from public.organizations
      where lower(slug) = lower(trim(new.raw_user_meta_data ->> 'organization_slug'))
        and active = true;
    end if;

    if target_organization_id is null then
      raise exception 'La empresa indicada no esta disponible.';
    end if;
  end if;

  insert into public.profiles (id, full_name, phone, platform_role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'client',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    must_change_password = excluded.must_change_password;

  if target_organization_id is not null then
    insert into public.customers (
      organization_id, full_name, email, phone, document_type,
      document_number, driver_license, city
    )
    values (
      target_organization_id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
      lower(new.email),
      nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
      nullif(new.raw_user_meta_data ->> 'document_type', ''),
      nullif(trim(new.raw_user_meta_data ->> 'document_number'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'driver_license'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'city'), '')
    )
    on conflict (organization_id, email) do update set
      full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.customers.phone),
      document_type = coalesce(excluded.document_type, public.customers.document_type),
      document_number = coalesce(excluded.document_number, public.customers.document_number),
      driver_license = coalesce(excluded.driver_license, public.customers.driver_license),
      city = coalesce(excluded.city, public.customers.city),
      active = true
    returning id into new_customer_id;

    insert into public.customer_accounts (organization_id, customer_id, user_id, active)
    values (target_organization_id, new_customer_id, new.id, true)
    on conflict (organization_id, user_id) do update set
      customer_id = excluded.customer_id,
      active = true;
  end if;

  return new;
end;
$$;

revoke all on function public.get_registration_organization(text) from public;
grant execute on function public.get_registration_organization(text) to anon, authenticated;
