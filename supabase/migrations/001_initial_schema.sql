-- HERMES SYSTEM
-- Migración inicial para Supabase/PostgreSQL.
-- Todas las tablas operativas incluyen organization_id para separar cada rent a car.

create extension if not exists pgcrypto;
create schema if not exists private;

do $$
begin
  create type public.hermes_role as enum ('cliente', 'agente', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vehicle_status as enum ('available', 'reserved', 'rented', 'maintenance', 'inactive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  role public.hermes_role not null default 'agente',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  document_number text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plate text not null,
  vin text,
  brand text not null,
  model text not null,
  model_year integer,
  color text,
  status public.vehicle_status not null default 'available',
  odometer_km numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, plate)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid references public.reservations(id),
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid not null references public.vehicles(id),
  status text not null default 'draft',
  checked_out_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  token text not null unique,
  tag_uid text,
  label text not null,
  active boolean not null default true,
  linked_at timestamptz not null default now(),
  last_scanned_at timestamptz
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  rental_id uuid references public.rentals(id),
  performed_by uuid references public.profiles(id),
  inspection_type text not null,
  status text not null default 'draft',
  fuel_level integer,
  odometer_km numeric(12, 2),
  notes text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  check (fuel_level is null or fuel_level between 0 and 100)
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  rental_id uuid references public.rentals(id),
  reported_by uuid references public.profiles(id),
  title text not null,
  description text not null,
  status text not null default 'open',
  latitude double precision,
  longitude double precision,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  recorded_by uuid references public.profiles(id),
  related_operation text,
  related_operation_id uuid,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  speed_mps double precision,
  heading_degrees double precision,
  source text not null default 'mobile_app',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (latitude between -90 and 90),
  check (longitude between -180 and 180)
);

create index if not exists idx_profiles_organization on public.profiles(organization_id);
create index if not exists idx_vehicles_organization on public.vehicles(organization_id);
create index if not exists idx_reservations_organization on public.reservations(organization_id);
create index if not exists idx_rentals_organization on public.rentals(organization_id);
create index if not exists idx_nfc_tags_token on public.nfc_tags(token);
create index if not exists idx_vehicle_locations_vehicle_date on public.vehicle_locations(vehicle_id, recorded_at desc);

-- Estas funciones evitan repetir consultas de perfil en cada política.
create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid() and active = true
  limit 1;
$$;

create or replace function private.current_role()
returns public.hermes_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and active = true
  limit 1;
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.current_role() to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.reservations enable row level security;
alter table public.rentals enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.inspections enable row level security;
alter table public.incidents enable row level security;
alter table public.vehicle_locations enable row level security;

-- Una empresa solo puede leer sus propios registros.
create policy "organizations_select_own"
on public.organizations for select
to authenticated
using (id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "profiles_select_own_organization"
on public.profiles for select
to authenticated
using (organization_id = private.current_organization_id() or id = auth.uid() or private.current_role() = 'super_admin');

-- Política reutilizada conceptualmente en las tablas operativas:
-- agentes y administradores trabajan dentro de su empresa; super_admin puede administrar la plataforma.
create policy "customers_organization_access"
on public.customers for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "vehicles_organization_access"
on public.vehicles for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "reservations_organization_access"
on public.reservations for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "rentals_organization_access"
on public.rentals for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "nfc_tags_organization_access"
on public.nfc_tags for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "inspections_organization_access"
on public.inspections for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "incidents_organization_access"
on public.incidents for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');

create policy "vehicle_locations_organization_access"
on public.vehicle_locations for all
to authenticated
using (organization_id = private.current_organization_id() or private.current_role() = 'super_admin')
with check (organization_id = private.current_organization_id() or private.current_role() = 'super_admin');
