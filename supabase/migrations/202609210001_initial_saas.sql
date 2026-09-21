-- Base inicial de HERMES SYSTEM para empresas de alquiler de vehiculos.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'agent')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  brand text not null,
  model text not null,
  model_year integer not null check (model_year between 1950 and 2100),
  plate text not null,
  category text not null check (category in ('sedan', 'suv', 'van', 'pickup', 'other')),
  transmission text not null check (transmission in ('automatic', 'manual')),
  seats integer not null check (seats between 1 and 60),
  daily_rate numeric(12, 2) not null check (daily_rate >= 0),
  currency text not null default 'DOP' check (currency in ('DOP', 'USD')),
  mileage integer not null default 0 check (mileage >= 0),
  status text not null default 'available'
    check (status in ('available', 'reserved', 'rented', 'maintenance', 'inactive')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plate)
);

create table if not exists public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  token text not null unique,
  physical_tag_id text,
  label text not null,
  active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  last_scanned_at timestamptz,
  unique (organization_id, vehicle_id),
  unique (organization_id, physical_tag_id)
);

create table if not exists public.nfc_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nfc_tag_id uuid references public.nfc_tags(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('assigned', 'scanned', 'unassigned', 'rejected')),
  notes text,
  occurred_at timestamptz not null default now()
);

-- Guarda ubicaciones operativas. El origen phone no sustituye un GPS instalado en el vehiculo.
create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('phone', 'vehicle_tracker', 'manual')),
  operation text not null check (operation in ('delivery', 'return', 'inspection', 'incident', 'tracking')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters is null or accuracy_meters >= 0),
  recorded_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists branches_organization_idx on public.branches(organization_id);
create index if not exists vehicles_organization_idx on public.vehicles(organization_id);
create index if not exists nfc_tags_vehicle_idx on public.nfc_tags(vehicle_id);
create index if not exists nfc_events_organization_idx on public.nfc_events(organization_id, occurred_at desc);
create index if not exists location_events_vehicle_idx on public.location_events(vehicle_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.belongs_to_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and organization_id = target_organization_id
      and active = true
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and organization_id = target_organization_id
      and role = 'admin'
      and active = true
  );
$$;

-- Crea la primera empresa y convierte al usuario actual en su administrador.
create or replace function public.create_organization(
  organization_name text,
  organization_city text default null,
  organization_phone text default null,
  organization_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion autenticada.';
  end if;

  if length(trim(organization_name)) < 2 then
    raise exception 'El nombre de la empresa es obligatorio.';
  end if;

  insert into public.organizations (name, city, phone, email)
  values (
    trim(organization_name),
    nullif(trim(organization_city), ''),
    nullif(trim(organization_phone), ''),
    nullif(trim(organization_email), '')
  )
  returning id into new_organization_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'admin');

  return new_organization_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.branches enable row level security;
alter table public.vehicles enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.nfc_events enable row level security;
alter table public.location_events enable row level security;

create policy "members_read_organizations"
on public.organizations for select to authenticated
using (public.belongs_to_organization(id));

create policy "admins_update_organizations"
on public.organizations for update to authenticated
using (public.is_organization_admin(id))
with check (public.is_organization_admin(id));

create policy "users_read_own_profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "users_update_own_profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members_read_memberships"
on public.memberships for select to authenticated
using (public.belongs_to_organization(organization_id));

create policy "admins_manage_memberships"
on public.memberships for all to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create policy "members_read_branches"
on public.branches for select to authenticated
using (public.belongs_to_organization(organization_id));

create policy "admins_manage_branches"
on public.branches for all to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create policy "members_read_vehicles"
on public.vehicles for select to authenticated
using (public.belongs_to_organization(organization_id));

create policy "staff_manage_vehicles"
on public.vehicles for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "members_manage_nfc_tags"
on public.nfc_tags for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "members_manage_nfc_events"
on public.nfc_events for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "members_manage_location_events"
on public.location_events for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

revoke all on function public.create_organization(text, text, text, text) from public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.nfc_tags to authenticated;
grant select, insert, update, delete on public.nfc_events to authenticated;
grant select, insert, update, delete on public.location_events to authenticated;
grant execute on function public.belongs_to_organization(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, text) to authenticated;
