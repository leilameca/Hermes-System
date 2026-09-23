-- Completa el nucleo CRM: disponibilidad, archivos, permisos y GPS de clientes.

create extension if not exists btree_gist;

-- Toda empresa debe conservar por lo menos un administrador activo.
create or replace function public.protect_last_organization_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  removes_admin boolean := false;
begin
  if tg_op = 'DELETE' then
    removes_admin := old.role = 'admin' and old.active;
  else
    removes_admin := old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active);
  end if;

  if removes_admin and not exists (
      select 1 from public.memberships m
      where m.organization_id = old.organization_id
        and m.id <> old.id and m.role = 'admin' and m.active
  ) then
    raise exception 'La empresa debe conservar al menos un administrador activo.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists memberships_protect_last_admin on public.memberships;
create trigger memberships_protect_last_admin
before update or delete on public.memberships
for each row execute function public.protect_last_organization_admin();

-- Evita dos reservas activas del mismo vehiculo en fechas cruzadas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservations_vehicle_dates_excl'
  ) then
    alter table public.reservations
      add constraint reservations_vehicle_dates_excl
      exclude using gist (
        vehicle_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status in ('pending', 'confirmed'));
  end if;
end;
$$;

create or replace function public.vehicle_is_available(
  target_vehicle_id uuid,
  requested_start timestamptz,
  requested_end timestamptz,
  ignored_reservation_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select requested_end > requested_start
    and exists (
      select 1 from public.vehicles v
      where v.id = target_vehicle_id
        and v.status not in ('maintenance', 'inactive')
        and (
          public.belongs_to_organization(v.organization_id)
          or public.customer_belongs_to_organization(v.organization_id)
        )
    )
    and not exists (
      select 1 from public.reservations r
      where r.vehicle_id = target_vehicle_id
        and r.status in ('pending', 'confirmed')
        and (ignored_reservation_id is null or r.id <> ignored_reservation_id)
        and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(requested_start, requested_end, '[)')
    );
$$;

-- El cliente puede cancelar su reserva pendiente sin poder confirmarla por su cuenta.
create or replace function public.cancel_own_reservation(target_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reservations r
  set status = 'cancelled'
  where r.id = target_reservation_id
    and r.status = 'pending'
    and exists (
      select 1 from public.customer_accounts ca
      where ca.customer_id = r.customer_id
        and ca.user_id = auth.uid()
        and ca.active
    );
  if not found then
    raise exception 'La reserva no puede ser cancelada por esta cuenta.';
  end if;
end;
$$;

-- Recorrido GPS de cada cliente. Se registra solo con la pantalla GPS abierta.
create table if not exists public.customer_location_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters is null or accuracy_meters >= 0),
  recorded_at timestamptz not null default now()
);

create index if not exists customer_location_customer_time_idx
on public.customer_location_events(customer_id, recorded_at desc);

alter table public.customer_location_events enable row level security;

create policy "customers_create_own_location_events"
on public.customer_location_events for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.customer_accounts ca
    where ca.user_id = auth.uid()
      and ca.customer_id = customer_location_events.customer_id
      and ca.organization_id = customer_location_events.organization_id
      and ca.active
  )
);

create policy "customers_read_own_location_events"
on public.customer_location_events for select to authenticated
using (user_id = auth.uid());

create policy "staff_read_company_location_events"
on public.customer_location_events for select to authenticated
using (public.belongs_to_organization(organization_id));

create policy "admins_delete_company_location_events"
on public.customer_location_events for delete to authenticated
using (public.is_organization_admin(organization_id));

create policy "super_admin_read_customer_location_events"
on public.customer_location_events for select to authenticated
using (public.is_super_admin());

grant select, insert, delete on public.customer_location_events to authenticated;
grant execute on function public.vehicle_is_available(uuid, timestamptz, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_own_reservation(uuid) to authenticated;

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  document_type text not null check (document_type in ('license', 'identity', 'contract', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists customer_documents_customer_idx
on public.customer_documents(customer_id, created_at desc);

alter table public.customer_documents enable row level security;

create policy "staff_manage_customer_documents"
on public.customer_documents for all to authenticated
using (public.belongs_to_organization(organization_id))
with check (public.belongs_to_organization(organization_id));

create policy "customers_read_own_documents"
on public.customer_documents for select to authenticated
using (exists (
  select 1 from public.customer_accounts ca
  where ca.customer_id = customer_documents.customer_id
    and ca.user_id = auth.uid() and ca.active
));

grant select, insert, update, delete on public.customer_documents to authenticated;

-- Buckets privados. Los archivos se entregan mediante enlaces firmados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('operation-evidence', 'operation-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('crm-documents', 'crm-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- La primera carpeta del objeto siempre es el UUID de la empresa.
create policy "company_members_read_crm_files"
on storage.objects for select to authenticated
using (
  (
    bucket_id in ('vehicle-images', 'operation-evidence', 'crm-documents')
    and public.belongs_to_organization(((storage.foldername(name))[1])::uuid)
  )
  or (
    bucket_id = 'vehicle-images'
    and public.customer_belongs_to_organization(((storage.foldername(name))[1])::uuid)
  )
  or (
    bucket_id = 'crm-documents'
    and exists (
      select 1 from public.customer_accounts ca
      where ca.user_id = auth.uid()
        and ca.organization_id = ((storage.foldername(name))[1])::uuid
        and ca.customer_id = ((storage.foldername(name))[3])::uuid
        and ca.active
    )
  )
);

create policy "company_members_upload_crm_files"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('vehicle-images', 'operation-evidence', 'crm-documents')
  and public.belongs_to_organization(((storage.foldername(name))[1])::uuid)
);

create policy "company_members_update_crm_files"
on storage.objects for update to authenticated
using (
  bucket_id in ('vehicle-images', 'operation-evidence', 'crm-documents')
  and public.belongs_to_organization(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id in ('vehicle-images', 'operation-evidence', 'crm-documents')
  and public.belongs_to_organization(((storage.foldername(name))[1])::uuid)
);

create policy "company_admins_delete_crm_files"
on storage.objects for delete to authenticated
using (
  bucket_id in ('vehicle-images', 'operation-evidence', 'crm-documents')
  and public.is_organization_admin(((storage.foldername(name))[1])::uuid)
);
