-- Datos operativos reales de HERMES: flota, reservas, contratos e inspecciones.

create or replace function public.customer_belongs_to_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customer_accounts
    where user_id = auth.uid()
      and organization_id = target_organization_id
      and active = true
  );
$$;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  pickup_branch_id uuid not null references public.branches(id) on delete restrict,
  return_branch_id uuid not null references public.branches(id) on delete restrict,
  reference text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  total numeric(12, 2) not null check (total >= 0),
  currency text not null default 'DOP' check (currency in ('DOP', 'USD')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (organization_id, reference)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  number text not null,
  terms text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_signature', 'signed', 'cancelled')),
  signer_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (reservation_id)
);

create table if not exists public.rental_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  operation_type text not null check (operation_type in ('delivery', 'return')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  signature_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id, operation_type)
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid references public.rental_operations(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  agent_id uuid references auth.users(id) on delete set null,
  inspection_type text not null check (inspection_type in ('delivery', 'return', 'general')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  mileage integer not null check (mileage >= 0),
  fuel_level text not null
    check (fuel_level in ('empty', 'quarter', 'half', 'three_quarters', 'full')),
  checklist jsonb not null default '[]'::jsonb,
  evidence_urls text[] not null default '{}',
  notes text,
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_organization_idx on public.reservations(organization_id, starts_at desc);
create index if not exists reservations_customer_idx on public.reservations(customer_id, starts_at desc);
create index if not exists operations_organization_idx on public.rental_operations(organization_id, scheduled_at desc);
create index if not exists inspections_vehicle_idx on public.inspections(vehicle_id, inspected_at desc);
create index if not exists contracts_customer_idx on public.contracts(customer_id, created_at desc);
create index if not exists incidents_organization_idx on public.incidents(organization_id, created_at desc);

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at before update on public.reservations
for each row execute function public.set_updated_at();
drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at before update on public.contracts
for each row execute function public.set_updated_at();
drop trigger if exists rental_operations_set_updated_at on public.rental_operations;
create trigger rental_operations_set_updated_at before update on public.rental_operations
for each row execute function public.set_updated_at();
drop trigger if exists inspections_set_updated_at on public.inspections;
create trigger inspections_set_updated_at before update on public.inspections
for each row execute function public.set_updated_at();
drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at before update on public.incidents
for each row execute function public.set_updated_at();

alter table public.reservations enable row level security;
alter table public.contracts enable row level security;
alter table public.rental_operations enable row level security;
alter table public.inspections enable row level security;
alter table public.incidents enable row level security;

create policy "staff_manage_reservations" on public.reservations for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));
create policy "customers_read_own_reservations" on public.reservations for select to authenticated
using (exists (select 1 from public.customer_accounts ca where ca.customer_id = reservations.customer_id and ca.user_id = auth.uid() and ca.active));
create policy "customers_create_own_reservations" on public.reservations for insert to authenticated
with check (exists (select 1 from public.customer_accounts ca where ca.customer_id = reservations.customer_id and ca.user_id = auth.uid() and ca.organization_id = reservations.organization_id and ca.active));

create policy "staff_manage_contracts" on public.contracts for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));
create policy "customers_read_own_contracts" on public.contracts for select to authenticated
using (exists (select 1 from public.customer_accounts ca where ca.customer_id = contracts.customer_id and ca.user_id = auth.uid() and ca.active));

create policy "staff_manage_operations" on public.rental_operations for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));
create policy "customers_read_own_operations" on public.rental_operations for select to authenticated
using (exists (select 1 from public.customer_accounts ca where ca.customer_id = rental_operations.customer_id and ca.user_id = auth.uid() and ca.active));

create policy "staff_manage_inspections" on public.inspections for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));
create policy "customers_read_own_inspections" on public.inspections for select to authenticated
using (exists (
  select 1 from public.reservations r
  join public.customer_accounts ca on ca.customer_id = r.customer_id
  where r.id = inspections.reservation_id and ca.user_id = auth.uid() and ca.active
));

create policy "staff_manage_incidents" on public.incidents for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));
create policy "customers_read_own_incidents" on public.incidents for select to authenticated
using (exists (select 1 from public.customer_accounts ca where ca.customer_id = incidents.customer_id and ca.user_id = auth.uid() and ca.active));
create policy "customers_create_own_incidents" on public.incidents for insert to authenticated
with check (exists (select 1 from public.customer_accounts ca where ca.customer_id = incidents.customer_id and ca.user_id = auth.uid() and ca.organization_id = incidents.organization_id and ca.active));

-- Los clientes necesitan consultar las sucursales y unidades de su empresa para reservar.
create policy "customers_read_branches" on public.branches for select to authenticated
using (public.customer_belongs_to_organization(organization_id));
create policy "customers_read_vehicles" on public.vehicles for select to authenticated
using (public.customer_belongs_to_organization(organization_id));

-- Un administrador puede listar los perfiles de los usuarios de su empresa.
create policy "organization_admins_read_member_profiles" on public.profiles for select to authenticated
using (exists (
  select 1 from public.memberships target
  where target.user_id = profiles.id
    and public.is_organization_admin(target.organization_id)
));

create policy "super_admin_read_reservations" on public.reservations for select to authenticated using (public.is_super_admin());
create policy "super_admin_read_contracts" on public.contracts for select to authenticated using (public.is_super_admin());
create policy "super_admin_read_operations" on public.rental_operations for select to authenticated using (public.is_super_admin());
create policy "super_admin_read_inspections" on public.inspections for select to authenticated using (public.is_super_admin());
create policy "super_admin_read_incidents" on public.incidents for select to authenticated using (public.is_super_admin());

grant select, insert, update, delete on public.reservations, public.contracts, public.rental_operations, public.inspections, public.incidents to authenticated;
grant execute on function public.customer_belongs_to_organization(uuid) to authenticated;

-- Inventario inicial que reemplaza los mocks de la empresa de demostración.
insert into public.vehicles (id, organization_id, branch_id, brand, model, model_year, plate, category, transmission, seats, daily_rate, currency, mileage, status, image_url)
values
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Toyota', 'Corolla', 2024, 'A987601', 'sedan', 'automatic', 5, 2800, 'DOP', 24500, 'reserved', 'assets/images/vehicles/corolla.jpg'),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Hyundai', 'Tucson', 2025, 'G987602', 'suv', 'automatic', 5, 4500, 'DOP', 12600, 'available', 'assets/images/vehicles/tucson.jpg'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Kia', 'Sportage', 2024, 'G987603', 'suv', 'automatic', 5, 4200, 'DOP', 18200, 'available', 'assets/images/vehicles/sportage.jpg')
on conflict (id) do update set
  branch_id = excluded.branch_id, brand = excluded.brand, model = excluded.model,
  model_year = excluded.model_year, plate = excluded.plate, daily_rate = excluded.daily_rate,
  mileage = excluded.mileage, status = excluded.status, image_url = excluded.image_url;

insert into public.customers (id, organization_id, full_name, email, phone, document_type, document_number, driver_license, city)
values
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'Luis Martínez', 'luis.martinez@hermes.test', '809-555-0104', 'cedula', '001-0000002-9', 'LIC-RD-10002', 'Santo Domingo')
on conflict (organization_id, email) do update set
  full_name = excluded.full_name, phone = excluded.phone, city = excluded.city;

insert into public.customers (organization_id, full_name, email, phone, document_type, document_number, driver_license, city)
values ('11111111-1111-4111-8111-111111111111', 'Laura Méndez', 'cliente@hermes.app', '809-555-0103', 'cedula', '001-0000001-1', 'LIC-RD-10001', 'Santo Domingo')
on conflict (organization_id, email) do update set
  full_name = excluded.full_name, phone = excluded.phone, document_type = excluded.document_type,
  document_number = excluded.document_number, driver_license = excluded.driver_license, city = excluded.city;

-- Vuelve a enlazar la cuenta cliente por si configure_demo_accounts creó otro UUID de cliente.
update public.customer_accounts ca
set customer_id = (
  select c.id from public.customers c
  where c.organization_id = '11111111-1111-4111-8111-111111111111' and c.email = 'cliente@hermes.app'
)
where ca.organization_id = '11111111-1111-4111-8111-111111111111'
  and exists (select 1 from auth.users u where u.id = ca.user_id and u.email = 'cliente@hermes.app');

insert into public.reservations (id, organization_id, customer_id, vehicle_id, pickup_branch_id, return_branch_id, reference, starts_at, ends_at, status, total, currency)
values (
  '55555555-5555-4555-8555-555555555551', '11111111-1111-4111-8111-111111111111',
  (select id from public.customers where organization_id = '11111111-1111-4111-8111-111111111111' and email = 'cliente@hermes.app'), '33333333-3333-4333-8333-333333333331',
  '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
  'RSV-2026-001', '2026-10-12 09:00:00-04', '2026-10-15 09:00:00-04', 'confirmed', 8400, 'DOP'
)
on conflict (id) do update set status = excluded.status, total = excluded.total;

insert into public.contracts (id, organization_id, reservation_id, customer_id, number, terms, status)
values (
  '66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111',
  '55555555-5555-4555-8555-555555555551', (select id from public.customers where organization_id = '11111111-1111-4111-8111-111111111111' and email = 'cliente@hermes.app'),
  'CTR-2026-001', 'Alquiler sujeto a licencia vigente, depósito, inspección de salida y devolución del vehículo.', 'pending_signature'
)
on conflict (id) do update set terms = excluded.terms, status = excluded.status;

insert into public.rental_operations (id, organization_id, reservation_id, vehicle_id, customer_id, operation_type, status, scheduled_at)
values
  ('77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333331', (select id from public.customers where organization_id = '11111111-1111-4111-8111-111111111111' and email = 'cliente@hermes.app'), 'delivery', 'scheduled', '2026-10-12 09:00:00-04'),
  ('77777777-7777-4777-8777-777777777772', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333331', (select id from public.customers where organization_id = '11111111-1111-4111-8111-111111111111' and email = 'cliente@hermes.app'), 'return', 'scheduled', '2026-10-15 09:00:00-04')
on conflict (id) do update set status = excluded.status, scheduled_at = excluded.scheduled_at;
